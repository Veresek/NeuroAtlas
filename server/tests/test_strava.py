import json
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from app.services.connectors.strava import StravaConnector, activities_to_fragments
from app.settings import settings


FIXTURE = json.loads(
	(Path(__file__).parent / "fixtures" / "strava_activities.json").read_text()
)


@pytest.fixture(autouse=True)
def strava_settings():
	settings.strava_client_id = "42"
	settings.strava_client_secret = "secret"
	settings.client_base_url = "http://localhost:3000"
	yield


def test_build_authorize_url_contains_state_scope_redirect():
	url = StravaConnector().build_authorize_url("st8te")
	parsed = urlparse(url)
	assert parsed.scheme == "https"
	assert parsed.netloc == "www.strava.com"
	assert parsed.path == "/oauth/authorize"
	params = parse_qs(parsed.query)
	assert params["client_id"] == ["42"]
	assert params["response_type"] == ["code"]
	assert params["scope"] == ["activity:read_all"]
	assert params["state"] == ["st8te"]
	assert params["redirect_uri"] == [
		"http://localhost:3000/api/integrations/strava/callback"
	]


def test_activities_to_fragments_groups_by_day():
	fragments = activities_to_fragments(FIXTURE)
	assert len(fragments) == 2
	by_date = {f.date: f for f in fragments}

	day1 = by_date["2026-10-03"]
	assert day1.source == "strava"
	assert len(day1.activity.workouts) == 2
	assert day1.activity.active_minutes == 70.0
	assert day1.activity.calories_burned == pytest.approx(641.0)
	assert sorted(day1.external_ids) == ["101", "102"]
	assert day1.activity.workouts[0].avg_hr == 148
	assert day1.activity.workouts[0].type == "run"

	day2 = by_date["2026-10-04"]
	assert len(day2.activity.workouts) == 1
	assert day2.activity.workouts[0].type == "ride"
	assert day2.activity.workouts[0].avg_hr is None


def test_activities_to_fragments_drops_invalid():
	fragments = activities_to_fragments(FIXTURE)
	by_date = {f.date: f for f in fragments}
	assert "104" not in by_date["2026-10-03"].external_ids


async def test_fetch_fragments_calls_api_with_epoch_window(monkeypatch):
	captured = {}

	class FakeResponse:
		def raise_for_status(self):
			pass

		def json(self):
			return FIXTURE

	async def fake_get(self, url, **kwargs):
		captured["url"] = url
		captured["kwargs"] = kwargs
		return FakeResponse()

	monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

	fragments = await StravaConnector().fetch_fragments(
		"tok", date(2026, 10, 3), date(2026, 10, 4)
	)
	assert len(fragments) == 2

	expected_after = int(
		datetime.combine(date(2026, 10, 3), time.min, tzinfo=timezone.utc).timestamp()
	)
	expected_before = int(
		datetime.combine(
			date(2026, 10, 4) + timedelta(days=1), time.min, tzinfo=timezone.utc
		).timestamp()
	)
	assert captured["url"] == "https://www.strava.com/api/v3/athlete/activities"
	params = captured["kwargs"]["params"]
	assert params["after"] == expected_after
	assert params["before"] == expected_before
	assert params["per_page"] == 200
	assert captured["kwargs"]["headers"]["Authorization"] == "Bearer tok"
