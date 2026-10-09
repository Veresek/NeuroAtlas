from __future__ import annotations

import json
import re
from typing import Optional

import httpx
from fastapi import HTTPException

from ..schemas import (
	AffectedBrainSection,
	ActivitySummary,
	DailyHealthSummary,
	DailyLogAnalysis,
	MyBrainLog,
	NutritionSummary,
)
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
- When objective app-data lines (activity=, nutrition=, trend_7d=) are present, cite the specific numbers in the message.
"""


RETRYABLE_HTTP_STATUSES = {429, 500, 502, 503, 504}
RETRYABLE_MESSAGE = re.compile(
	r"internal error|temporarily unavailable|overloaded|try again|resource exhausted|deadline exceeded|high demand",
	re.IGNORECASE,
)


def _num(value: float) -> str:
	return f"{value:g}"


def _render_activity(activity: ActivitySummary) -> Optional[str]:
	parts: list[str] = []
	if activity.steps is not None:
		parts.append(f"steps:{activity.steps}")
	if activity.active_minutes is not None:
		parts.append(f"active_minutes:{_num(activity.active_minutes)}")
	if activity.calories_burned is not None:
		parts.append(f"calories_burned:{_num(activity.calories_burned)}")
	workouts = []
	for workout in activity.workouts:
		description = f"{workout.type} {_num(workout.duration_min)}min"
		if workout.avg_hr is not None:
			description += f" avgHr={workout.avg_hr}"
		workouts.append(description)
	if workouts:
		parts.append("workouts:[" + ", ".join(workouts) + "]")
	return "activity={" + ", ".join(parts) + "}" if parts else None


def _render_nutrition(nutrition: NutritionSummary) -> Optional[str]:
	fields = [
		("calories", nutrition.calories, ""),
		("protein", nutrition.protein_g, "g"),
		("carbs", nutrition.carbs_g, "g"),
		("fat", nutrition.fat_g, "g"),
		("caffeine", nutrition.caffeine_mg, "mg"),
		("water", nutrition.water_ml, "ml"),
		("alcohol", nutrition.alcohol_g, "g"),
	]
	parts = [
		f"{label}:{_num(value)}{unit}"
		for label, value, unit in fields
		if value is not None
	]
	return "nutrition={" + ", ".join(parts) + "}" if parts else None


def _render_trend(trend: dict) -> Optional[str]:
	fields = [
		("days", trend.get("days"), ""),
		("active_minutes_avg", trend.get("active_minutes_avg"), ""),
		("calories_burned_avg", trend.get("calories_burned_avg"), ""),
		("workouts_count", trend.get("workouts_count"), ""),
		("calories_intake_avg", trend.get("calories_intake_avg"), ""),
		("protein_g_avg", trend.get("protein_g_avg"), ""),
	]
	parts = [
		f"{label}:{_num(value)}"
		for label, value, _ in fields
		if value is not None
	]
	return "trend_7d={" + ", ".join(parts) + "}" if parts else None


def build_user_message(
	log: MyBrainLog,
	summary: Optional[DailyHealthSummary] = None,
	trend: Optional[dict] = None,
) -> str:
	message = "Analyze today's log.\n\n" + log.note
	extra_lines: list[str] = []
	if summary is not None:
		if summary.activity is not None:
			rendered = _render_activity(summary.activity)
			if rendered:
				extra_lines.append(rendered)
		if summary.nutrition is not None:
			rendered = _render_nutrition(summary.nutrition)
			if rendered:
				extra_lines.append(rendered)
	if trend is not None:
		rendered = _render_trend(trend)
		if rendered:
			extra_lines.append(rendered)
	if extra_lines:
		message += "\n" + "\n".join(extra_lines)
	return message


MAX_AFFECTED_SECTIONS = 6


def merge_sections(
	heuristic: list[AffectedBrainSection],
	gemini: list[AffectedBrainSection],
) -> list[AffectedBrainSection]:
	"""Heuristic sections first (deterministic, atlas-anchored), then Gemini's
	new ones, capped at MAX_AFFECTED_SECTIONS."""
	merged: list[AffectedBrainSection] = []
	for entry in heuristic[:MAX_AFFECTED_SECTIONS]:
		if entry not in merged:
			merged.append(entry)
	for entry in gemini:
		if len(merged) >= MAX_AFFECTED_SECTIONS:
			break
		if entry not in merged:
			merged.append(entry)
	return merged


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


async def generate_daily_log_analysis(
	log: MyBrainLog,
	summary: Optional[DailyHealthSummary] = None,
	trend: Optional[dict] = None,
) -> DailyLogAnalysis:
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
		"contents": [{"parts": [{"text": build_user_message(log, summary, trend)}]}],
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

