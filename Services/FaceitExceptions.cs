namespace VeeroFaceitDashboard.Services;

public sealed class FaceitConfigurationException(string message) : Exception(message);

public sealed class FaceitApiException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}
