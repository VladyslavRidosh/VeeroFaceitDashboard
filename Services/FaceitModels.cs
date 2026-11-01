namespace VeeroFaceitDashboard.Services;

public sealed record FaceitDashboard(
    string Nickname,
    string? Avatar,
    string? Country,
    string? Region,
    string? Membership,
    int? Elo,
    int? Level,
    string? WinRate,
    string? AverageKd,
    string? Headshots,
    string? Matches,
    string UpdatedAt,
    IReadOnlyList<FaceitMatch> RecentMatches);

public sealed record FaceitMatch(
    string Id,
    string Result,
    string Score,
    string Opponent,
    string? Map,
    DateTimeOffset? FinishedAt);
