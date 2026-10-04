import json
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from app.services.connectors import CONNECTORS
from app.services.connectors.fatsecret import FatSecretConnector, entries_to_fragment
from app.settings import settings


FIXTURE = json.loads(
	(Path(__file__).parent / "fixtures" / "fatsecret_entries.json").read_text()
)


@pytest.fixture(autouse=True)
def fatsecret_settings():
	settings.fatsecret_client_id = "fs-id"
	settings.fatsecret_client_secret = "fs-secret"
	settings.client_base_url = "http://localhost:3000"
	yield


def test_entries_to_fragment_sums_macros():
	fragment = entries_to_fragment(FIXTURE, "2026-10-03")
	assert fragment is not None
	assert fragment.source == "fatsecret"
	assert fragment.date == "2026-10-03"
	assert fragment.external_ids == ["123", "124"]
	nutrition = fragment.nutrition
	assert nutrition.calories == pytest.approx(1230.5)
	assert nutrition.protein_g == pytest.approx(63.4)
	assert nutrition.carbs_g == pytest.approx(141.2)
	assert nutrition.fat_g == pytest.approx(39.1)


def test_entries_to_fragment_empty_day_returns_none():
	assert entries_to_fragment({"food_entries": {}}, "2026-10-03") is None
	assert entries_to_fragment({}, "2026-10-03") is None


def test_build_authorize_url():
	url = FatSecretConnector().build_authorize_url("st8te")
	parsed = urlparse(url)
	assert parsed.netloc == "oauth.fatsecret.com"
	assert parsed.path == "/connect/authorize"
	params = parse_qs(parsed.query)
	assert params["client_id"] == ["fs-id"]
	assert params["response_type"] == ["code"]
	assert params["scope"] == ["basic"]
	assert params["state"] == ["st8te"]
	assert params["redirect_uri"] == [
		"http://localhost:3000/api/integrations/fatsecret/callback"
	]


async def test_fetch_fragments_one_request_per_day(monkeypatch):
	captured = []

	class FakeResponse:
		def raise_for_status(self):
			pass

		def json(self):
			return FIXTURE

	async def fake_get(self, url, **kwargs):
		captured.append((url, kwargs))
		return FakeResponse()

	monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

	fragments = await FatSecretConnector().fetch_fragments(
		"tok", date(2026, 10, 3), date(2026, 10, 4)
	)
	assert len(captured) == 2
	assert len(fragments) == 2
	for url, kwargs in captured:
		assert url == "https://platform.fatsecret.com/rest/server.api"
		assert kwargs["params"]["method"] == "food-entries.get.v2"
		assert kwargs["params"]["format"] == "json"
		assert kwargs["headers"]["Authorization"] == "Bearer tok"
	dates = [kwargs["params"]["date"] for _, kwargs in captured]
	assert dates == ["20261003", "20261004"]
	assert [f.date for f in fragments] == ["2026-10-03", "2026-10-04"]


def test_registry_contains_both_providers():
	assert set(CONNECTORS) == {"strava", "fatsecret"}
