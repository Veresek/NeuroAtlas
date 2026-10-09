import json

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import MyBrainLog
from app.services.gemini import (
	ALLOWED_SECTION_NAMES,
	build_user_message,
	parse_analysis,
)
from app.settings import settings


CANNED_ANALYSIS = {
	"message": "Canned analysis text.",
	"affectedSections": [
		{"section": "Frontal Lobe", "effectType": "stimulates"}
	],
}


def candidate_envelope(*text_parts):
	return {
		"candidates": [
			{"content": {"parts": [{"text": part} for part in text_parts]}}
		]
	}


@pytest.fixture()
def gemini_env(monkeypatch):
	settings.gemini_api_key = "test-gemini-key"
	settings.gemini_model = "test-model"

	class FakeResponse:
		status_code = 200
		is_success = True
		text = json.dumps(candidate_envelope(json.dumps(CANNED_ANALYSIS)))

		def json(self):
			return json.loads(self.text)

	async def fake_post(self, url, **kwargs):
		return FakeResponse()

	monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
	with TestClient(app) as client:
		yield client
	settings.gemini_api_key = ""


def test_build_user_message_is_the_note():
	log = MyBrainLog(note="slept 5h, three espressos, deadline stress")
	assert build_user_message(log) == (
		"Analyze today's log.\n\n"
		"slept 5h, three espressos, deadline stress"
	)


def test_analyze_returns_the_model_output(gemini_env):
	resp = gemini_env.post(
		"/api/my-brain/analyze", json={"note": "rough morning, long afternoon walk"}
	)
	assert resp.status_code == 200
	body = resp.json()
	assert body["message"] == "Canned analysis text."
	assert body["affectedSections"] == CANNED_ANALYSIS["affectedSections"]


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


def test_parse_analysis_accepts_plain_json():
	analysis = parse_analysis(candidate_envelope(json.dumps(CANNED_ANALYSIS)))
	assert analysis.message == "Canned analysis text."
	assert analysis.affectedSections[0].section == "Frontal Lobe"


def test_parse_analysis_accepts_content_after_the_json_object():
	# What gemma actually returns here: the object, then stray trailing characters.
	text = json.dumps(CANNED_ANALYSIS) + "\n```"
	assert parse_analysis(candidate_envelope(text)).message == "Canned analysis text."


def test_parse_analysis_accepts_leading_prose_and_fences():
	text = "Here is the analysis:\n```json\n" + json.dumps(CANNED_ANALYSIS) + "\n```"
	assert (
		parse_analysis(candidate_envelope(text)).message == "Canned analysis text."
	)


def test_parse_analysis_joins_every_text_part():
	full = json.dumps(CANNED_ANALYSIS)
	analysis = parse_analysis(candidate_envelope(full[:20], full[20:]))
	assert analysis.message == "Canned analysis text."


def test_parse_analysis_caps_affected_sections():
	sections = [
		{"section": name, "effectType": "modulates"}
		for name in ALLOWED_SECTION_NAMES[:8]
	]
	analysis = parse_analysis(
		candidate_envelope(json.dumps({"message": "text", "affectedSections": sections}))
	)
	assert len(analysis.affectedSections) == 6


def test_parse_analysis_keeps_one_entry_per_section():
	# Live gemma answer: Hippocampus three times with three effect types, Amygdala
	# twice with the same pair. A region list with repeats is not usable in the UI.
	payload = {
		"message": "text",
		"affectedSections": [
			{"section": "Frontal Lobe", "effectType": "depresses"},
			{"section": "Hippocampus", "effectType": "modulates"},
			{"section": "Amygdala", "effectType": "stimulates"},
			{"section": "Hippocampus", "effectType": "depresses"},
			{"section": "Hippocampus", "effectType": "damages"},
			{"section": "Amygdala", "effectType": "stimulates"},
		],
	}
	analysis = parse_analysis(candidate_envelope(json.dumps(payload)))
	assert [(s.section, s.effectType) for s in analysis.affectedSections] == [
		("Frontal Lobe", "depresses"),
		("Hippocampus", "modulates"),
		("Amygdala", "stimulates"),
	]


def test_parse_analysis_rejects_an_empty_candidate():
	with pytest.raises(HTTPException) as raised:
		parse_analysis(candidate_envelope("   "))
	assert raised.value.status_code == 502


def test_parse_analysis_rejects_text_without_json():
	with pytest.raises(HTTPException) as raised:
		parse_analysis(candidate_envelope("I cannot analyze that."))
	assert raised.value.status_code == 502


def test_parse_analysis_rejects_an_unusable_schema():
	with pytest.raises(HTTPException) as raised:
		parse_analysis(candidate_envelope(json.dumps({"message": "only a message"})))
	assert raised.value.status_code == 502


def test_analyze_maps_a_slow_upstream_to_a_retryable_503(monkeypatch):
	settings.gemini_api_key = "test-gemini-key"
	settings.gemini_model = "test-model"

	async def hanging_post(self, url, **kwargs):
		raise httpx.ReadTimeout("read timed out")

	monkeypatch.setattr(httpx.AsyncClient, "post", hanging_post)
	with TestClient(app) as client:
		resp = client.post("/api/my-brain/analyze", json={"note": "a quiet day"})
	settings.gemini_api_key = ""

	assert resp.status_code == 503
	assert resp.json()["detail"] == "Gemini did not respond in time."


def test_analyze_survives_trailing_output_from_the_model(monkeypatch):
	settings.gemini_api_key = "test-gemini-key"
	settings.gemini_model = "test-model"

	class TrailingResponse:
		status_code = 200
		is_success = True
		text = json.dumps(
			candidate_envelope(json.dumps(CANNED_ANALYSIS) + "\n```")
		)

		def json(self):
			return json.loads(self.text)

	async def fake_post(self, url, **kwargs):
		return TrailingResponse()

	monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
	with TestClient(app) as client:
		resp = client.post("/api/my-brain/analyze", json={"note": "a quiet day"})
	settings.gemini_api_key = ""

	assert resp.status_code == 200
	assert resp.json()["message"] == "Canned analysis text."
