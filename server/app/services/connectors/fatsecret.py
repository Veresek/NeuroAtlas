"""FatSecret Platform API connector (nutrition).

FatSecret has no public token-revoke endpoint; `revoke()` is a best-effort
no-op and deleting the vault row is the effective disconnect.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx

from ...schemas import NutritionSummary
from ...settings import settings
from ..summary_store import HealthFragment
from .base import Connector, ProviderToken, redirect_uri


logger = logging.getLogger(__name__)

AUTHORIZE_URL = "https://oauth.fatsecret.com/connect/authorize"
TOKEN_URL = "https://oauth.fatsecret.com/connect/token"
API_URL = "https://platform.fatsecret.com/rest/server.api"

MAX_SYNC_DAYS = 14


def entries_to_fragment(payload: dict, day: str) -> Optional[HealthFragment]:
	"""Normalizes a food-entries.get.v2 day payload into one fragment."""
	entries_container = payload.get("food_entries") or {}
	entries = entries_container.get("food_entry") or []
	if isinstance(entries, dict):  # single-entry days come back as an object
		entries = [entries]
	if not entries:
		return None

	totals = {"calories": 0.0, "carbohydrate": 0.0, "protein": 0.0, "fat": 0.0}
	for entry in entries:
		contents = entry.get("nutritional_contents") or {}
		for key in totals:
			totals[key] += float(contents.get(key) or 0.0)

	return HealthFragment(
		source="fatsecret",
		date=day,
		external_ids=[str(e["food_entry_id"]) for e in entries if e.get("food_entry_id")],
		nutrition=NutritionSummary(
			calories=round(totals["calories"], 1),
			protein_g=round(totals["protein"], 1),
			carbs_g=round(totals["carbohydrate"], 1),
			fat_g=round(totals["fat"], 1),
		),
	)


class FatSecretConnector(Connector):
	provider = "fatsecret"

	@property
	def is_configured(self) -> bool:
		return bool(
			settings.fatsecret_client_id and settings.fatsecret_client_secret
		)

	@property
	def config_hint(self) -> str:
		return "FATSECRET_CLIENT_ID / FATSECRET_CLIENT_SECRET"

	def build_authorize_url(self, state: str) -> str:
		query = urlencode(
			{
				"client_id": settings.fatsecret_client_id,
				"response_type": "code",
				"scope": "basic",
				"state": state,
				"redirect_uri": redirect_uri(self.provider),
			}
		)
		return f"{AUTHORIZE_URL}?{query}"

	async def exchange_code(self, code: str) -> ProviderToken:
		return await self._token_request(
			{
				"grant_type": "authorization_code",
				"code": code,
				"redirect_uri": redirect_uri(self.provider),
			}
		)

	async def refresh(self, refresh_token: str) -> ProviderToken:
		return await self._token_request(
			{"grant_type": "refresh_token", "refresh_token": refresh_token}
		)

	async def _token_request(self, data: dict) -> ProviderToken:
		async with httpx.AsyncClient(timeout=20) as client:
			resp = await client.post(
				TOKEN_URL,
				data=data,
				auth=(settings.fatsecret_client_id, settings.fatsecret_client_secret),
			)
			resp.raise_for_status()
			payload = resp.json()
		expires_at = None
		if payload.get("expires_in"):
			expires_at = datetime.now(timezone.utc) + timedelta(
				seconds=int(payload["expires_in"])
			)
		return ProviderToken(
			access_token=payload["access_token"],
			refresh_token=payload.get("refresh_token"),
			expires_at=expires_at,
		)

	async def fetch_fragments(
		self, access_token: str, date_from: date, date_to: date
	) -> list[HealthFragment]:
		fragments: list[HealthFragment] = []
		day = date_from
		days_requested = 0
		async with httpx.AsyncClient(timeout=30) as client:
			while day <= date_to and days_requested < MAX_SYNC_DAYS:
				resp = await client.get(
					API_URL,
					params={
						"method": "food-entries.get.v2",
						"format": "json",
						"date": day.strftime("%Y%m%d"),
					},
					headers={"Authorization": f"Bearer {access_token}"},
				)
				resp.raise_for_status()
				fragment = entries_to_fragment(resp.json(), day.isoformat())
				if fragment is not None:
					fragments.append(fragment)
				day += timedelta(days=1)
				days_requested += 1
		return fragments

	async def revoke(self, access_token: str) -> None:
		logger.info(
			"fatsecret has no public revoke endpoint; vault row deletion is the disconnect"
		)
