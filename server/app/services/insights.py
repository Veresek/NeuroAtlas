"""Deterministic signal → brain-section heuristics for My Brain.

Every rule is anchored to an existing atlas entry (client/src/data/atlas.json)
so heuristic output stays consistent with the atlas language Gemini and the
3D brain model already use. Cross-checked against research.json on 2026-10-04:

- sleep < 6h            → Sleep Deprivation (acute): Frontal depresses, Amygdala stimulates
- cardio ≥ 30 min       → Physical Activity (acute): Frontal stimulates, Amygdala modulates
- active trend (≥3 days)→ Physical Activity (chronic): Hippocampus modulates
- caffeine > 200 mg     → Caffeine (acute): Frontal stimulates, Nucleus Accumbens stimulates
- alcohol ≥ 20 g        → Alcohol (acute): Frontal depresses
- mood ≤ 1              → Sadness (acute): Amygdala stimulates

Dropped from the original plan table (no atlas/research.json support):
Thalamus-for-caffeine, Brainstem-for-alcohol, water-intake rule (water_ml is
not populated by the in-scope connectors).
"""

from __future__ import annotations

from typing import Optional

from ..schemas import AffectedBrainSection, DailyHealthSummary, MyBrainLog


CARDIO_TYPES = {"run", "ride", "swim", "walk", "hike", "row", "elliptical"}
CARDIO_MIN_MINUTES = 30
CAFFEINE_MG_THRESHOLD = 200.0
CAFFEINE_MG_PER_CUP = 95.0
COFFEE_CUPS_THRESHOLD = 3
ALCOHOL_G_THRESHOLD = 20.0
SLEEP_H_THRESHOLD = 6.0
MOOD_THRESHOLD = 1
TREND_MIN_DAYS = 3
TREND_MIN_ACTIVE_MINUTES_AVG = 30.0


def _add(
	sections: list[AffectedBrainSection], section: str, effect_type: str
) -> None:
	entry = AffectedBrainSection(section=section, effectType=effect_type)
	if entry not in sections:
		sections.append(entry)


def heuristic_sections(
	log: MyBrainLog,
	summary: Optional[DailyHealthSummary],
	trend: Optional[dict],
) -> list[AffectedBrainSection]:
	sections: list[AffectedBrainSection] = []

	if log.sleep < SLEEP_H_THRESHOLD:
		_add(sections, "Frontal Lobe", "depresses")
		_add(sections, "Amygdala", "stimulates")

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

	high_caffeine = (
		(caffeine_mg is not None and caffeine_mg > CAFFEINE_MG_THRESHOLD)
		or (
			caffeine_mg is None
			and log.coffee * CAFFEINE_MG_PER_CUP > CAFFEINE_MG_THRESHOLD
		)
	)
	if high_caffeine:
		_add(sections, "Frontal Lobe", "stimulates")
		_add(sections, "Nucleus Accumbens", "stimulates")

	if alcohol_g is not None and alcohol_g >= ALCOHOL_G_THRESHOLD:
		_add(sections, "Frontal Lobe", "depresses")

	if log.mood <= MOOD_THRESHOLD:
		_add(sections, "Amygdala", "stimulates")

	return sections
