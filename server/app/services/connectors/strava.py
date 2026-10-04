from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from urllib.parse import urlencode

import httpx

from ...schemas import ActivitySummary, Workout
from ...settings import settings
from ..summary_store import HealthFragment
from .base import Connector, ProviderToken, redirect_uri


AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
TOKEN_URL = "https://www.strava.com/oauth/token"
DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

MAX_MOVING_TIME = 24 * 3600


def _epoch(day: date, end: bool = False) -> int:
	target = day + timedelta(days=1) if end else day
	return int(datetime.combine(target, time.min, tzinfo=timezone.utc).timestamp())


def activities_to_fragments(activities: list[dict]) -> list[HealthFragment]:
	"""Groups Strava activities into one HealthFragment per local day."""
	by_day: dict[str, list[dict]] = {}
	for activity in activities:
		moving_time = activity.get("moving_time") or 0
		day = (activity.get("start_date_local") or "")[:10]
		if not day or moving_time <= 0 or moving_time > MAX_MOVING_TIME:
			continue
		by_day.setdefault(day, []).append(activity)

	fragments: list[HealthFragment] = []
	for day, acts in sorted(by_day.items()):
		workouts = [
			Workout(
				type=(a.get("sport_type") or "workout").lower(),
				duration_min=a["moving_time"] / 60,
				calories=a.get("calories") or None,
				avg_hr=int(round(a["average_heartrate"]))
				if a.get("average_heartrate")
				else None,
			)
			for a in acts
		]
		fragments.append(
			HealthFragment(
				source="strava",
				date=day,
				external_ids=[str(a["id"]) for a in acts],
				activity=ActivitySummary(
					active_minutes=sum(a["moving_time"] for a in acts) / 60,
					calories_burned=sum(a.get("calories") or 0 for a in acts) or None,
					workouts=workouts,
				),
			)
		)
	return fragments


class StravaConnector(Connector):
	provider = "strava"

	def build_authorize_url(self, state: str) -> str:
		query = urlencode(
			{
				"client_id": settings.strava_client_id,
				"redirect_uri": redirect_uri(self.provider),
				"response_type": "code",
				"scope": "activity:read_all",
				"state": state,
			}
		)
		return f"{AUTHORIZE_URL}?{query}"

	async def exchange_code(self, code: str) -> ProviderToken:
		return await self._token_request(
			{
				"grant_type": "authorization_code",
				"code": code,
				"client_id": settings.strava_client_id,
				"client_secret": settings.strava_client_secret,
				"redirect_uri": redirect_uri(self.provider),
			}
		)

	async def refresh(self, refresh_token: str) -> ProviderToken:
		return await self._token_request(
			{
				"grant_type": "refresh_token",
				"refresh_token": refresh_token,
				"client_id": settings.strava_client_id,
				"client_secret": settings.strava_client_secret,
			}
		)

	async def _token_request(self, data: dict) -> ProviderToken:
		async with httpx.AsyncClient(timeout=20) as client:
			resp = await client.post(TOKEN_URL, data=data)
			resp.raise_for_status()
			payload = resp.json()
		expires_at = None
		if payload.get("expires_at"):
			expires_at = datetime.fromtimestamp(
				int(payload["expires_at"]), tz=timezone.utc
			)
		return ProviderToken(
			access_token=payload["access_token"],
			refresh_token=payload.get("refresh_token"),
			expires_at=expires_at,
		)

	async def fetch_fragments(
		self, access_token: str, date_from: date, date_to: date
	) -> list[HealthFragment]:
		# Widen the UTC window by one day on each side: Strava filters by UTC
		# epoch but days are grouped by start_date_local, and a truncated local
		# day would clobber already-stored workouts on a group-replacing merge.
		# Dedupe in the summary store makes the extra days harmless.
		async with httpx.AsyncClient(timeout=30) as client:
			resp = await client.get(
				ACTIVITIES_URL,
				params={
					"after": _epoch(date_from - timedelta(days=1)),
					"before": _epoch(date_to + timedelta(days=2)),
					"per_page": 200,
				},
				headers={"Authorization": f"Bearer {access_token}"},
			)
			resp.raise_for_status()
			activities = resp.json()
		return activities_to_fragments(activities)

	async def revoke(self, access_token: str) -> None:
		async with httpx.AsyncClient(timeout=20) as client:
			await client.post(
				DEAUTHORIZE_URL,
				headers={"Authorization": f"Bearer {access_token}"},
			)
