from __future__ import annotations

import json
import re

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from ..schemas import AffectedBrainSection, DailyLogAnalysis, MyBrainLog
from ..settings import settings


ALLOWED_SECTION_NAMES = [
	"Frontal Lobe",
	"Parietal Lobe",
	"Occipital Lobe",
	"Temporal Lobe",
	"Insular Cortex",
	"Hippocampus",
	"Nucleus Accumbens",
	"Amygdala",
	"Ventral Tegmental Area",
	"Limbic System",
	"Basal Ganglia",
	"Thalamus",
	"Hypothalamus",
	"Cerebellum",
	"Brainstem",
	"White Matter",
	"Ventricular System",
	"Other",
]

SYSTEM_INSTRUCTION = """You are an expert neurobiologist and neurochemist writing for NeuroAtlas.

Return JSON matching the schema only.

Field rules:
- message: 2–3 short paragraphs. Explain how today's lifestyle factors likely affected mind and brain: relevant regions, neurotransmitters (e.g. adenosine, dopamine, cortisol, serotonin), cognition and mood. Do not greet the user or repeat their raw inputs.
- affectedSections: 1–6 entries. Pick section names only from the allowed enum. Assign effectType per NeuroAtlas conventions:
  - stimulates: increased activity, alertness, or engagement
  - depresses: reduced activity, inhibition, or fatigue-related dampening
  - damages: stress-related harm, overload, or impaired function from poor inputs
  - modulates: mixed, context-dependent, or balancing influence
- Accessible language for a curious non-specialist. No medical diagnoses or treatment advice.
"""


RETRYABLE_HTTP_STATUSES = {429, 500, 502, 503, 504}
RETRYABLE_MESSAGE = re.compile(
	r"internal error|temporarily unavailable|overloaded|try again|resource exhausted|deadline exceeded|high demand",
	re.IGNORECASE,
)


def build_user_message(log: MyBrainLog) -> str:
	return "Analyze today's log.\n\n" + log.note


MAX_AFFECTED_SECTIONS = 6


def _schema() -> dict:
	return {
		"type": "object",
		"properties": {
			"message": {"type": "string"},
			"affectedSections": {
				"type": "array",
				"items": {
					"type": "object",
					"properties": {
						"section": {"type": "string", "enum": ALLOWED_SECTION_NAMES},
						"effectType": {
							"type": "string",
							"enum": ["stimulates", "depresses", "damages", "modulates"],
						},
					},
					"required": ["section", "effectType"],
				},
			},
		},
		"required": ["message", "affectedSections"],
	}


def _candidate_text(data: dict) -> str:
	parts = (
		(data.get("candidates") or [{}])[0].get("content") or {}
	).get("parts") or []
	return "".join(str(part.get("text") or "") for part in parts).strip()


def _first_json_object(text: str) -> dict:
	# gemma on this endpoint returns the object, then stray characters (a closing
	# ``` fence, a newline plus a token), and sometimes prose before it. json.loads
	# over the whole string rejects all of that as "Extra data".
	candidates = [text]
	if text.startswith("```"):
		candidates.append(text.split("\n", 1)[-1])
	brace = text.find("{")
	if brace != -1:
		candidates.append(text[brace:])
	for candidate in candidates:
		try:
			value, _ = json.JSONDecoder().raw_decode(candidate.lstrip())
		except ValueError:
			continue
		if isinstance(value, dict):
			return value
	raise ValueError("no JSON object in the model's text")


def parse_analysis(data: dict) -> DailyLogAnalysis:
	text = _candidate_text(data)
	if not text:
		raise HTTPException(status_code=502, detail="No analysis returned by Gemini.")

	try:
		payload = _first_json_object(text)
	except ValueError as e:
		raise HTTPException(status_code=502, detail="Invalid JSON returned by Gemini.") from e

	try:
		analysis = DailyLogAnalysis.model_validate(payload)
	except ValidationError as e:
		raise HTTPException(
			status_code=502, detail="Unexpected analysis schema from Gemini."
		) from e

	unique: list[AffectedBrainSection] = []
	for entry in analysis.affectedSections:
		if not any(existing.section == entry.section for existing in unique):
			unique.append(entry)

	analysis.affectedSections = unique[:MAX_AFFECTED_SECTIONS]
	return analysis


async def generate_daily_log_analysis(log: MyBrainLog) -> DailyLogAnalysis:
	url = (
		"https://generativelanguage.googleapis.com/v1beta/models/"
		f"{settings.gemini_model}:generateContent"
	)
	params = {"key": settings.gemini_api_key}

	payload = {
		"systemInstruction": {
			"parts": [
				{
					"text": SYSTEM_INSTRUCTION
					+ "\n\nAllowed section names (affectedSections[].section):\n- "
					+ "\n- ".join(ALLOWED_SECTION_NAMES),
				}
			]
		},
		"contents": [{"parts": [{"text": build_user_message(log)}]}],
		"generationConfig": {
			"temperature": 0.7,
			"responseMimeType": "application/json",
			"responseSchema": _schema(),
		},
	}

	try:
		async with httpx.AsyncClient(timeout=60) as client:
			resp = await client.post(url, params=params, json=payload)
	except httpx.TransportError as e:
		# Timeouts and connection failures carry an empty str(), which used to
		# reach the client as a 502 with no detail at all.
		raise HTTPException(
			status_code=503, detail="Gemini did not respond in time."
		) from e

	if resp.status_code in RETRYABLE_HTTP_STATUSES or RETRYABLE_MESSAGE.search(resp.text or ""):
		# frontend already has retry; keep backend errors explicit
		raise HTTPException(status_code=503, detail="Gemini temporarily unavailable.")

	if not resp.is_success:
		raise HTTPException(status_code=502, detail=f"Gemini error ({resp.status_code}).")

	return parse_analysis(resp.json())

