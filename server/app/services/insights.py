"""Deterministic signal → brain-section heuristics for My Brain.

Every rule is anchored to an existing atlas entry (client/src/data/atlas.json)
so heuristic output stays consistent with the atlas language Gemini and the
3D brain model already use. Rules fire only from objective app data
(Strava / FatSecret); the free-text daily note is interpreted by Gemini alone.

- cardio ≥ 30 min       → Physical Activity (acute): Frontal stimulates, Amygdala modulates
- active trend (≥3 days)→ Physical Activity (chronic): Hippocampus modulates
- caffeine > 200 mg     → Caffeine (acute): Frontal stimulates, Nucleus Accumbens stimulates
- alcohol ≥ 20 g        → Alcohol (acute): Frontal depresses
"""

from __future__ import annotations

from typing import Optional

from ..schemas import AffectedBrainSection, DailyHealthSummary


CARDIO_TYPES = {"run", "ride", "swim", "walk", "hike", "row", "elliptical"}
CARDIO_MIN_MINUTES = 30
CAFFEINE_MG_THRESHOLD = 200.0
ALCOHOL_G_THRESHOLD = 20.0
TREND_MIN_DAYS = 3
TREND_MIN_ACTIVE_MINUTES_AVG = 30.0


def _add(
	sections: list[AffectedBrainSection], section: str, effect_type: str
) -> None:
	entry = AffectedBrainSection(section=section, effectType=effect_type)
	if entry not in sections:
		sections.append(entry)


def heuristic_sections(
	summary: Optional[DailyHealthSummary],
	trend: Optional[dict],
) -> list[AffectedBrainSection]:
	sections: list[AffectedBrainSection] = []

	if summary is not None and summary.activity is not None:
		has_cardio = any(
			w.type in CARDIO_TYPES and w.duration_min >= CARDIO_MIN_MINUTES
			for w in summary.activity.workouts
		)
		if has_cardio:
			_add(sections, "Frontal Lobe", "stimulates")
			_add(sections, "Amygdala", "modulates")

	if (
		trend is not None
		and trend.get("days", 0) >= TREND_MIN_DAYS
		and (trend.get("active_minutes_avg") or 0) >= TREND_MIN_ACTIVE_MINUTES_AVG
	):
		_add(sections, "Hippocampus", "modulates")

	caffeine_mg: Optional[float] = None
	alcohol_g: Optional[float] = None
	if summary is not None and summary.nutrition is not None:
		caffeine_mg = summary.nutrition.caffeine_mg
		alcohol_g = summary.nutrition.alcohol_g

	if caffeine_mg is not None and caffeine_mg > CAFFEINE_MG_THRESHOLD:
		_add(sections, "Frontal Lobe", "stimulates")
		_add(sections, "Nucleus Accumbens", "stimulates")

	if alcohol_g is not None and alcohol_g >= ALCOHOL_G_THRESHOLD:
		_add(sections, "Frontal Lobe", "depresses")

	return sections
