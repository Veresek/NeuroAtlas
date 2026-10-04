from .base import Connector, ProviderToken, redirect_uri
from .fatsecret import FatSecretConnector
from .strava import StravaConnector

CONNECTORS: dict[str, Connector] = {
	"strava": StravaConnector(),
	"fatsecret": FatSecretConnector(),
}

__all__ = ["CONNECTORS", "Connector", "ProviderToken", "redirect_uri"]
