from datetime import date, timedelta
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from mongomock_motor import AsyncMongoMockClient
from fastapi.testclient import TestClient

from app import db
from app.main import app
from app.schemas import ActivitySummary, NutritionSummary, Workout
from app.services.connectors import CONNECTORS
from app.services.connectors.base import Connector, ProviderToken
from app.services.summary_store import HealthFragment
from app.services.vault import load_vault_record
from app.settings import settings


TODAY = date.today().isoformat()


class FakeConnector(Connector):
	def __init__(self, provider: str, fragments: list[HealthFragment] | None = None, fail: bool = False):
		self.provider = provider
		self.fragments = fragments or []
		self.fail = fail
		self.revoked: str | None = None

	def build_authorize_url(self, state: str) -> str:
		return f"https://provider.example/authorize?provider={self.provider}&state={state}"

	async def exchange_code(self, code: str) -> ProviderToken:
		if code == "bad-code":
			raise RuntimeError("exchange failed")
		return ProviderToken(access_token="access-1", refresh_token="refresh-1", expires_at=None)

	async def refresh(self, refresh_token: str) -> ProviderToken:
		return ProviderToken(access_token="access-refreshed", refresh_token=refresh_token, expires_at=None)

	async def fetch_fragments(self, access_token: str, date_from: date, date_to: date) -> list[HealthFragment]:
		if self.fail:
			raise RuntimeError("provider down")
		return [
			f
			for f in self.fragments
			if date_from <= date.fromisoformat(f.date) <= date_to
		]

	async def revoke(self, access_token: str) -> None:
		self.revoked = access_token


def strava_fragment() -> HealthFragment:
	return HealthFragment(
		source="strava",
		date=TODAY,
		external_ids=["a1"],
		activity=ActivitySummary(
			active_minutes=35.0,
			calories_burned=320.0,
			workouts=[Workout(type="run", duration_min=35, calories=320.0)],
		),
	)


def fatsecret_fragment() -> HealthFragment:
	return HealthFragment(
		source="fatsecret",
		date=TODAY,
		external_ids=["f1"],
		nutrition=NutritionSummary(calories=2100.0, protein_g=120.0),
	)


@pytest.fixture()
def client(monkeypatch):
	db.set_db_client(AsyncMongoMockClient())
	settings.server_token_key = "test-key-32-chars-minimum-length!!"
	settings.client_base_url = "http://localhost:3000"
	fake_strava = FakeConnector("strava", fragments=[strava_fragment()])
	fake_fatsecret = FakeConnector("fatsecret", fragments=[fatsecret_fragment()])
	monkeypatch.setitem(CONNECTORS, "strava", fake_strava)
	monkeypatch.setitem(CONNECTORS, "fatsecret", fake_fatsecret)
	with TestClient(app) as test_client:
		test_client.fake_strava = fake_strava
		test_client.fake_fatsecret = fake_fatsecret
		yield test_client
	db.set_db_client(None)
	settings.server_token_key = ""


def connect_and_get_state(client, provider="strava") -> str:
	resp = client.get(f"/api/integrations/{provider}/connect", follow_redirects=False)
	assert resp.status_code == 302
	location = resp.headers["location"]
	return parse_qs(urlparse(location).query)["state"][0]


def complete_connection(client, provider="strava") -> None:
	state = connect_and_get_state(client, provider)
	resp = client.get(
		f"/api/integrations/{provider}/callback",
		params={"code": "auth-code", "state": state},
		follow_redirects=False,
	)
	assert resp.status_code == 302


def test_connect_redirects_and_sets_cookie(client):
	resp = client.get("/api/integrations/strava/connect", follow_redirects=False)
	assert resp.status_code == 302
	location = resp.headers["location"]
	assert location.startswith("https://provider.example/authorize")
	assert parse_qs(urlparse(location).query)["state"]
	set_cookie = resp.headers["set-cookie"]
	assert "na_vault=" in set_cookie
	assert "HttpOnly" in set_cookie
	assert "SameSite=lax" in set_cookie.replace("Lax", "lax")


def test_callback_stores_token_and_redirects(client):
	state = connect_and_get_state(client)
	resp = client.get(
		"/api/integrations/strava/callback",
		params={"code": "auth-code", "state": state},
		follow_redirects=False,
	)
	assert resp.status_code == 302
	assert resp.headers["location"] == "http://localhost:3000"
	vault_id = client.cookies.get("na_vault")
	assert vault_id


async def test_callback_rejects_bad_state(client):
	connect_and_get_state(client)  # obtain vault cookie
	resp = client.get(
		"/api/integrations/strava/callback",
		params={"code": "auth-code", "state": "forged-state"},
		follow_redirects=False,
	)
	assert resp.status_code == 400
	vault_id = client.cookies.get("na_vault")
	assert await load_vault_record(vault_id, "strava") is None


def test_callback_state_single_use(client):
	state = connect_and_get_state(client)
	first = client.get(
		"/api/integrations/strava/callback",
		params={"code": "auth-code", "state": state},
		follow_redirects=False,
	)
	assert first.status_code == 302
	second = client.get(
		"/api/integrations/strava/callback",
		params={"code": "auth-code", "state": state},
		follow_redirects=False,
	)
	assert second.status_code == 400


async def test_disconnect_removes_vault_row(client):
	complete_connection(client)
	vault_id = client.cookies.get("na_vault")
	assert await load_vault_record(vault_id, "strava") is not None
	resp = client.post("/api/integrations/strava/disconnect")
	assert resp.status_code == 200
	assert client.fake_strava.revoked == "access-refreshed"
	assert await load_vault_record(vault_id, "strava") is None


def test_sync_merges_fragments_from_connected_providers(client):
	complete_connection(client)
	resp = client.post("/api/integrations/sync")
	assert resp.status_code == 200
	body = resp.json()
	assert body["synced"] == ["strava"]
	assert body["failed"] == []


def test_sync_without_cookie_returns_empty(client):
	resp = client.post("/api/integrations/sync")
	assert resp.status_code == 200
	assert resp.json() == {"synced": [], "failed": []}


def test_sync_reports_provider_failure(client):
	complete_connection(client, "strava")
	client.fake_fatsecret.fail = True
	# connect fatsecret with a failing provider
	state = connect_and_get_state(client, "fatsecret")
	client.get(
		"/api/integrations/fatsecret/callback",
		params={"code": "auth-code", "state": state},
		follow_redirects=False,
	)
	resp = client.post("/api/integrations/sync")
	assert resp.status_code == 200
	body = resp.json()
	assert "strava" in body["synced"]
	failed_providers = [f["provider"] for f in body["failed"]]
	assert failed_providers == ["fatsecret"]


def test_me_health_returns_summaries_and_trend(client):
	complete_connection(client)
	client.post("/api/integrations/sync")
	yesterday = (date.today() - timedelta(days=1)).isoformat()
	tomorrow = (date.today() + timedelta(days=1)).isoformat()
	resp = client.get("/api/me/health", params={"from": yesterday, "to": tomorrow})
	assert resp.status_code == 200
	body = resp.json()
	assert len(body["summaries"]) == 1
	summary = body["summaries"][0]
	assert summary["date"] == TODAY
	assert summary["sources"] == ["strava"]
	assert summary["activity"]["workouts"][0]["type"] == "run"
	assert body["trend"]["days"] == 1
	assert body["trend"]["active_minutes_avg"] == 35.0


def test_me_health_without_cookie_returns_empty(client):
	resp = client.get("/api/me/health")
	assert resp.status_code == 200
	assert resp.json() == {"summaries": [], "trend": {"days": 0, "active_minutes_avg": None, "calories_burned_avg": None, "workouts_count": 0, "calories_intake_avg": None, "protein_g_avg": None}}


def test_unknown_provider_404(client):
	assert client.get("/api/integrations/nope/connect").status_code == 404
	assert client.post("/api/integrations/nope/disconnect").status_code == 404


def test_list_integrations_reflects_connection(client):
	resp = client.get("/api/integrations")
	assert resp.status_code == 200
	statuses = {p["provider"]: p for p in resp.json()["providers"]}
	assert statuses["strava"]["connected"] is False
	assert statuses["fatsecret"]["connected"] is False

	complete_connection(client)
	statuses = {p["provider"]: p for p in client.get("/api/integrations").json()["providers"]}
	assert statuses["strava"]["connected"] is True
	assert statuses["strava"]["connected_at"] is not None


def test_sync_retries_with_rotated_refresh_token(client, monkeypatch):
	complete_connection(client)  # vault stores "refresh-1"
	refresh_calls: list[str] = []
	original_refresh = client.fake_strava.refresh

	async def flaky_refresh(refresh_token: str) -> ProviderToken:
		refresh_calls.append(refresh_token)
		if refresh_token == "stale-token":
			raise RuntimeError("refresh token rotated")
		return await original_refresh(refresh_token)

	client.fake_strava.refresh = flaky_refresh

	loads = {"count": 0}

	async def fake_load(vault_id: str, provider: str):
		loads["count"] += 1
		# first read returns a stale token (another tab rotated it since);
		# the re-read after failure returns the current one
		return "stale-token" if loads["count"] == 1 else "refresh-1"

	monkeypatch.setattr(
		"app.routers.integrations.load_provider_token", fake_load
	)

	resp = client.post("/api/integrations/sync")
	assert resp.status_code == 200
	assert resp.json()["synced"] == ["strava"]
	assert refresh_calls == ["stale-token", "refresh-1"]


def test_disconnect_strips_provider_data_keeps_other_source(client):
	complete_connection(client, "strava")
	complete_connection(client, "fatsecret")
	client.post("/api/integrations/sync")

	resp = client.post("/api/integrations/strava/disconnect")
	assert resp.status_code == 200

	body = client.get("/api/me/health").json()
	assert len(body["summaries"]) == 1
	summary = body["summaries"][0]
	assert summary["sources"] == ["fatsecret"]
	assert summary["activity"] is None
	assert summary["nutrition"]["calories"] == 2100.0


def test_disconnect_removes_sole_source_docs(client):
	complete_connection(client, "strava")
	client.post("/api/integrations/sync")
	client.post("/api/integrations/strava/disconnect")
	body = client.get("/api/me/health").json()
	assert body["summaries"] == []
