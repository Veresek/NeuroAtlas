import json
from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from app import db
from app.main import app
from app.schemas import (
	ActivitySummary,
	AffectedBrainSection,
	DailyHealthSummary,
	MyBrainLog,
	NutritionSummary,
	Workout,
)
from app.services.gemini import build_user_message, merge_sections
from app.settings import settings


def make_summary() -> DailyHealthSummary:
	return DailyHealthSummary(
		date="2026-10-04",
		sources=["strava", "fatsecret"],
		activity=ActivitySummary(
			steps=8200,
			active_minutes=35,
			calories_burned=320,
			workouts=[Workout(type="run", duration_min=35, calories=320, avg_hr=148)],
		),
		nutrition=NutritionSummary(calories=2100, protein_g=120, carbs_g=250, fat_g=70),
	)


def make_trend() -> dict:
	return {
		"days": 7,
		"active_minutes_avg": 35.0,
		"calories_burned_avg": None,
		"workouts_count": 4,
		"calories_intake_avg": 2050.0,
		"protein_g_avg": None,
	}


def test_build_user_message_without_summary():
	log = MyBrainLog(note="slept 5h, three espressos, deadline stress")
	assert build_user_message(log) == (
		"Analyze today's log.\n\n"
		"slept 5h, three espressos, deadline stress"
	)


def test_build_user_message_with_summary():
	log = MyBrainLog(note="slept 5h, three espressos, deadline stress")
	message = build_user_message(log, make_summary(), make_trend())
	assert "slept 5h, three espressos, deadline stress" in message
	assert "steps:8200" in message
	assert "run 35min avgHr=148" in message
	assert "calories:2100" in message
	assert "protein:120g" in message
	assert "trend_7d=" in message
	assert "active_minutes_avg:35" in message
	lowered = message.lower()
	assert "strava" not in lowered
	assert "fatsecret" not in lowered
	assert "external" not in lowered
	assert "_id" not in lowered


def test_build_user_message_omits_none_fields():
	log = MyBrainLog(note="light day, one coffee")
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(calories=1800),
	)
	message = build_user_message(log, summary, None)
	assert "calories:1800" in message
	assert "protein" not in message
	assert "water" not in message
	assert "activity=" not in message
	assert "trend_7d" not in message


def test_merge_sections_dedupe_and_order():
	heuristic = [
		AffectedBrainSection(section="Frontal Lobe", effectType="stimulates"),
		AffectedBrainSection(section="Amygdala", effectType="depresses"),
	]
	gemini = [
		AffectedBrainSection(section="Amygdala", effectType="depresses"),
		AffectedBrainSection(section="Hippocampus", effectType="modulates"),
	]
	merged = merge_sections(heuristic, gemini)
	assert [(s.section, s.effectType) for s in merged] == [
		("Frontal Lobe", "stimulates"),
		("Amygdala", "depresses"),
		("Hippocampus", "modulates"),
	]


def test_merge_sections_cap_six():
	heuristic = [
		AffectedBrainSection(section="Frontal Lobe", effectType="stimulates"),
		AffectedBrainSection(section="Amygdala", effectType="depresses"),
		AffectedBrainSection(section="Hippocampus", effectType="modulates"),
		AffectedBrainSection(section="Thalamus", effectType="stimulates"),
	]
	gemini = [
		AffectedBrainSection(section="Cerebellum", effectType="modulates"),
		AffectedBrainSection(section="Brainstem", effectType="depresses"),
		AffectedBrainSection(section="Insular Cortex", effectType="stimulates"),
		AffectedBrainSection(section="Basal Ganglia", effectType="modulates"),
	]
	merged = merge_sections(heuristic, gemini)
	assert len(merged) == 6
	assert merged[:4] == heuristic
	assert [(s.section) for s in merged[4:]] == ["Cerebellum", "Brainstem"]


CANNED_GEMINI = {
	"message": "Canned analysis text.",
	"affectedSections": [
		{"section": "Frontal Lobe", "effectType": "stimulates"}
	],
}


@pytest.fixture()
def gemini_env(monkeypatch):
	db.set_db_client(AsyncMongoMockClient())
	settings.server_token_key = "test-key-32-chars-minimum-length!!"
	settings.gemini_api_key = "test-gemini-key"
	settings.gemini_model = "test-model"

	class FakeResponse:
		status_code = 200
		is_success = True
		text = json.dumps(
			{
				"candidates": [
					{"content": {"parts": [{"text": json.dumps(CANNED_GEMINI)}]}}
				]
			}
		)

		def json(self):
			return json.loads(self.text)

	async def fake_post(self, url, **kwargs):
		return FakeResponse()

	monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
	with TestClient(app) as client:
		yield client
	db.set_db_client(None)
	settings.gemini_api_key = ""
	settings.server_token_key = ""


def test_analyze_enrichment_failure_degrades(gemini_env, monkeypatch):
	async def boom(*args, **kwargs):
		raise RuntimeError("mongo unreachable")

	monkeypatch.setattr("app.main.load_summaries", boom)
	gemini_env.cookies.set("na_vault", "3f2b8c1e-6d4a-4f3b-9c2e-1a2b3c4d5e6f")
	resp = gemini_env.post(
		"/api/my-brain/analyze", json={"note": "rough morning, long afternoon walk"}
	)
	assert resp.status_code == 200
	body = resp.json()
	assert body["message"] == "Canned analysis text."
	assert body["affectedSections"] == CANNED_GEMINI["affectedSections"]


def test_analyze_merges_heuristic_sections(gemini_env, monkeypatch):
	# heuristics now fire only from app data, not from the typed note
	async def fake_summaries(vault_id, start, end):
		return [
			DailyHealthSummary(
				date=date.today().isoformat(),
				sources=["fatsecret"],
				nutrition=NutritionSummary(caffeine_mg=250),
			)
		]

	monkeypatch.setattr("app.main.load_summaries", fake_summaries)
	gemini_env.cookies.set("na_vault", "3f2b8c1e-6d4a-4f3b-9c2e-1a2b3c4d5e6f")
	resp = gemini_env.post(
		"/api/my-brain/analyze", json={"note": "three flat whites before noon"}
	)
	assert resp.status_code == 200
	sections = {
		(s["section"], s["effectType"]) for s in resp.json()["affectedSections"]
	}
	# caffeine heuristic fires from FatSecret data
	assert ("Frontal Lobe", "stimulates") in sections
	assert ("Nucleus Accumbens", "stimulates") in sections
	# canned Gemini section is preserved
	assert ("Frontal Lobe", "stimulates") in sections


def test_analyze_rejects_blank_note(gemini_env):
	assert (
		gemini_env.post("/api/my-brain/analyze", json={"note": ""}).status_code == 422
	)
	assert (
		gemini_env.post("/api/my-brain/analyze", json={"note": "   "}).status_code
		== 422
	)


def test_analyze_rejects_overlong_note(gemini_env):
	resp = gemini_env.post("/api/my-brain/analyze", json={"note": "x" * 2001})
	assert resp.status_code == 422


async def test_analyze_hides_disabled_provider_from_prompt(gemini_env, monkeypatch):
	# a disabled provider's stored data must not reach the Gemini prompt,
	# while an enabled provider's data still does
	vault_id = "3f2b8c1e-6d4a-4f3b-9c2e-1a2b3c4d5e6f"
	await db.get_vaults().insert_one(
		{"vault_id": vault_id, "provider": "strava", "enabled": False}
	)

	async def fake_summaries(*args, **kwargs):
		summary = make_summary().model_copy(update={"date": date.today().isoformat()})
		return [summary]

	monkeypatch.setattr("app.main.load_summaries", fake_summaries)

	sent: dict = {}

	class CapturingResponse:
		status_code = 200
		is_success = True
		text = json.dumps(
			{
				"candidates": [
					{"content": {"parts": [{"text": json.dumps(CANNED_GEMINI)}]}}
				]
			}
		)

		def json(self):
			return json.loads(self.text)

	async def capture_post(self, url, **kwargs):
		sent["payload"] = kwargs["json"]
		return CapturingResponse()

	monkeypatch.setattr(httpx.AsyncClient, "post", capture_post)

	gemini_env.cookies.set("na_vault", vault_id)
	resp = gemini_env.post(
		"/api/my-brain/analyze", json={"note": "testing provider masking"}
	)
	assert resp.status_code == 200

	user_text = sent["payload"]["contents"][0]["parts"][0]["text"]
	assert "testing provider masking" in user_text
	assert "activity=" not in user_text
	assert "steps:8200" not in user_text
	assert "nutrition=" in user_text
	assert "calories:2100" in user_text
