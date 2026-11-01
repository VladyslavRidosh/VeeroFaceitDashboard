namespace VeeroFaceitDashboard.Services;

public sealed class FaceitOptions
{
    public string ApiKey { get; set; } = "";
    public string Nickname { get; set; } = "-veero";
    public string GameId { get; set; } = "cs2";
    public int RefreshMinutes { get; set; } = 5;
}
