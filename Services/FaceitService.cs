using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace VeeroFaceitDashboard.Services;

public sealed class FaceitService(
    HttpClient http,
    IOptions<FaceitOptions> options,
    IMemoryCache cache)
{
    private readonly FaceitOptions _options = options.Value;
    private const string CacheKey = "veero-faceit-dashboard";

    public async Task<FaceitDashboard> GetDashboardAsync(bool refresh, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) ||
            _options.ApiKey.Contains("PUT_YOUR", StringComparison.OrdinalIgnoreCase))
        {
            throw new FaceitConfigurationException(
                "API-ключ ещё не добавлен. Создай appsettings.Local.json по примеру appsettings.Local.example.json и вставь ключ в Faceit:ApiKey.");
        }

        if (!refresh && cache.TryGetValue(CacheKey, out FaceitDashboard? cached) && cached is not null)
            return cached;

        using var request = new HttpRequestMessage(HttpMethod.Get,
            $"players?nickname={Uri.EscapeDataString(_options.Nickname)}&game={Uri.EscapeDataString(_options.GameId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var message = response.StatusCode switch
            {
                System.Net.HttpStatusCode.Unauthorized => "FACEIT отклонил API-ключ (401). Проверь правильность ключа.",
                System.Net.HttpStatusCode.Forbidden => "У API-ключа нет доступа (403). Проверь настройки приложения в FACEIT Developer Portal.",
                System.Net.HttpStatusCode.NotFound => "Игрок не найден. Проверь никнейм в appsettings.Local.json.",
                (System.Net.HttpStatusCode)429 => "FACEIT временно ограничил количество запросов. Подожди немного и обнови страницу.",
                _ => $"FACEIT вернул ошибку {(int)response.StatusCode} ({response.ReasonPhrase})."
            };
            throw new FaceitApiException(message, (int)response.StatusCode);
        }

        using var playerDoc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var player = playerDoc.RootElement;

        var playerId = GetString(player, "player_id");
        if (string.IsNullOrWhiteSpace(playerId))
            throw new FaceitApiException("FACEIT вернул профиль без player_id.", 502);

        var statsTask = GetJsonAsync($"players/{Uri.EscapeDataString(playerId)}/stats/{Uri.EscapeDataString(_options.GameId)}", cancellationToken);
        var historyTask = GetJsonAsync($"players/{Uri.EscapeDataString(playerId)}/history?game={Uri.EscapeDataString(_options.GameId)}&offset=0&limit=10", cancellationToken);
        await Task.WhenAll(statsTask, historyTask);

        using var statsDoc = await statsTask;
        using var historyDoc = await historyTask;

        var lifetime = TryGet(statsDoc.RootElement, "lifetime", out var life) ? life : default;
        var games = TryGet(player, "games", out var gamesElement) &&
                    TryGet(gamesElement, _options.GameId, out var gameElement) ? gameElement : default;

        var elo = GetInt(games, "faceit_elo");
        var level = GetInt(games, "skill_level");

        var dashboard = new FaceitDashboard(
            GetString(player, "nickname") ?? _options.Nickname,
            GetString(player, "avatar"),
            GetString(player, "country"),
            GetString(player, "region"),
            GetString(player, "membership_type"),
            elo,
            level,
            GetStat(lifetime, "Win Rate %"),
            GetStat(lifetime, "Average K/D Ratio"),
            GetStat(lifetime, "Average Headshots %"),
            GetStat(lifetime, "Matches"),
            DateTimeOffset.UtcNow.ToString("O"),
            ParseMatches(historyDoc.RootElement));

        cache.Set(CacheKey, dashboard, TimeSpan.FromMinutes(Math.Clamp(_options.RefreshMinutes, 1, 30)));
        return dashboard;
    }

    private async Task<JsonDocument> GetJsonAsync(string path, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new FaceitApiException($"Не удалось получить данные FACEIT ({(int)response.StatusCode}).", (int)response.StatusCode);

        return await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);
    }

    private static IReadOnlyList<FaceitMatch> ParseMatches(JsonElement root)
    {
        var result = new List<FaceitMatch>();
        if (!TryGet(root, "items", out var items) || items.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var item in items.EnumerateArray().Take(10))
        {
            var id = GetString(item, "match_id") ?? "";
            var winner = GetString(TryGet(item, "results", out var results) ? results : default, "winner");
            var score = "—";
            if (TryGet(item, "results", out results) && TryGet(results, "score", out var scores))
            {
                var a = GetString(scores, "faction1");
                var b = GetString(scores, "faction2");
                if (a is not null && b is not null) score = $"{a} : {b}";
            }

            var teams = TryGet(item, "teams", out var teamsElement) ? teamsElement : default;
            var faction1 = TryGet(teams, "faction1", out var f1) ? GetString(f1, "nickname") : null;
            var faction2 = TryGet(teams, "faction2", out var f2) ? GetString(f2, "nickname") : null;
            var opponent = faction1 ?? faction2 ?? "Матч FACEIT";

            string? map = null;
            if (TryGet(item, "voting", out var voting) &&
                TryGet(voting, "map", out var mapVote) &&
                TryGet(mapVote, "pick", out var picks) &&
                picks.ValueKind == JsonValueKind.Array && picks.GetArrayLength() > 0)
                map = picks[0].GetString();

            DateTimeOffset? finished = null;
            var finishedRaw = GetString(item, "finished_at");
            if (long.TryParse(finishedRaw, out var unix) && unix > 0)
                finished = DateTimeOffset.FromUnixTimeSeconds(unix);

            result.Add(new FaceitMatch(id, winner ?? "unknown", score, opponent, map, finished));
        }

        return result;
    }

    private static string? GetStat(JsonElement element, string key)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(key, out var value))
            return null;
        return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
    }

    private static string? GetString(JsonElement element, string key) =>
        TryGet(element, key, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;

    private static int? GetInt(JsonElement element, string key) =>
        int.TryParse(GetString(element, key), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) ? value : null;

    private static bool TryGet(JsonElement element, string key, out JsonElement value)
    {
        value = default;
        return element.ValueKind == JsonValueKind.Object && element.TryGetProperty(key, out value);
    }
}
