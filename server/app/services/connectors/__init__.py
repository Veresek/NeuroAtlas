from .base import Connector, ProviderToken, redirect_uri
from .strava import StravaConnector

CONNECTORS: dict[str, Connector] = {
	"strava": StravaConnector(),
}

__all__ = ["CONNECTORS", "Connector", "ProviderToken", "redirect_uri"]
