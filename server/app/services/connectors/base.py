from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from ...settings import settings


def redirect_uri(provider: str) -> str:
	"""OAuth callback goes through the client origin (Vite proxy) so the vault
	cookie lands on the same origin the SPA runs on."""
	return f"{settings.client_base_url}/api/integrations/{provider}/callback"


class ProviderToken(BaseModel):
	access_token: str
	refresh_token: Optional[str] = None
	expires_at: Optional[datetime] = None


class Connector(ABC):
	provider: str

	@abstractmethod
	def build_authorize_url(self, state: str) -> str: ...

	@abstractmethod
	async def exchange_code(self, code: str) -> ProviderToken: ...

	@abstractmethod
	async def refresh(self, refresh_token: str) -> ProviderToken: ...

	@abstractmethod
	async def fetch_fragments(
		self, access_token: str, date_from: date, date_to: date
	) -> list: ...

	@abstractmethod
	async def revoke(self, access_token: str) -> None: ...
