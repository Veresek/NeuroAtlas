from __future__ import annotations

import json
import re

import httpx
from fastapi import HTTPException

from ..schemas import DailyLogAnalysis, MyBrainLog
from ..settings import settings


MOOD_LABELS = ["Awful", "Bad", "Neutral", "Good", "Great"]

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
	mood_label = MOOD_LABELS[log.mood] if 0 <= log.mood < len(MOOD_LABELS) else "Unknown"
	return (
		"Analyze today's log.\n\n"
		f"sleep_hours={log.sleep}\n"
		f"coffee_cups={log.coffee}\n"
		f"mood_label={mood_label}"
	)


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

	async with httpx.AsyncClient(timeout=40) as client:
		resp = await client.post(url, params=params, json=payload)

	if resp.status_code in RETRYABLE_HTTP_STATUSES or RETRYABLE_MESSAGE.search(resp.text or ""):
		# frontend already has retry; keep backend errors explicit
		raise HTTPException(status_code=503, detail="Gemini temporarily unavailable.")

	if not resp.is_success:
		raise HTTPException(status_code=502, detail=f"Gemini error ({resp.status_code}).")

	data = resp.json()
	text = (
		(data.get("candidates") or [{}])[0]
		.get("content", {})
		.get("parts", [{}])[0]
		.get("text")
	)
	if not text or not str(text).strip():
		raise HTTPException(status_code=502, detail="No analysis returned from Gemini.")

	try:
		return DailyLogAnalysis.model_validate(json.loads(text))
	except Exception as e:
		raise HTTPException(status_code=502, detail="Invalid JSON returned by Gemini.") from e

