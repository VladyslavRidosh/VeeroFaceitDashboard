using VeeroFaceitDashboard.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Services.Configure<FaceitOptions>(builder.Configuration.GetSection("Faceit"));
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<FaceitService>(client =>
{
    client.BaseAddress = new Uri("https://open.faceit.com/data/v4/");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
    client.Timeout = TimeSpan.FromSeconds(20);
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/dashboard", async (FaceitService faceit, bool? refresh, CancellationToken cancellationToken) =>
{
    try
    {
        var dashboard = await faceit.GetDashboardAsync(refresh == true, cancellationToken);
        return Results.Ok(dashboard);
    }
    catch (FaceitConfigurationException ex)
    {
        return Results.Problem(ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable, title: "FACEIT API is not configured");
    }
    catch (FaceitApiException ex)
    {
        return Results.Problem(ex.Message, statusCode: ex.StatusCode, title: "FACEIT API error");
    }
    catch (HttpRequestException)
    {
        return Results.Problem("Не удалось подключиться к FACEIT. Проверь подключение к интернету и попробуй ещё раз.", statusCode: 502);
    }
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
