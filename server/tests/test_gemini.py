import json
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import AffectedBrainSection, MyBrainLog
from app.services.gemini import build_user_message, merge_sections
from app.settings import settings


def test_build_user_message_is_the_note():
	log = MyBrainLog(note="slept 5h, three espressos, deadline stress")
	assert build_user_message(log) == (
		"Analyze today's log.\n\n"
		"slept 5h, three espressos, deadline stress"
	)


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

VAULT_ID = "3f2b8c1e-6d4a-4f3b-9c2e-1a2b3c4d5e6f"


@pytest.fixture()
def gemini_env(monkeypatch):
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
		client.cookies.clear()
		yield client
	settings.gemini_api_key = ""


def test_analyze_returns_the_model_output(gemini_env):
	resp = gemini_env.post(
		"/api/my-brain/analyze", json={"note": "rough morning, long afternoon walk"}
	)
	assert resp.status_code == 200
	body = resp.json()
	assert body["message"] == "Canned analysis text."
	assert body["affectedSections"] == CANNED_GEMINI["affectedSections"]


def test_analyze_mints_the_vault_cookie_when_absent(gemini_env):
	resp = gemini_env.post("/api/my-brain/analyze", json={"note": "a quiet day"})
	assert resp.status_code == 200
	header = resp.headers.get("set-cookie", "").lower()
	assert "na_vault=" in header
	assert "httponly" in header
	assert "samesite=lax" in header
	uuid.UUID(resp.cookies["na_vault"])


def test_analyze_keeps_an_existing_vault_cookie(gemini_env):
	gemini_env.cookies.set("na_vault", VAULT_ID)
	resp = gemini_env.post("/api/my-brain/analyze", json={"note": "a quiet day"})
	assert resp.status_code == 200
	assert "set-cookie" not in resp.headers
	assert gemini_env.cookies.get("na_vault") == VAULT_ID


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
