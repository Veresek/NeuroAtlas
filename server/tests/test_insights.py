from app.schemas import ActivitySummary, DailyHealthSummary, MyBrainLog, NutritionSummary, Workout
from app.services.gemini import ALLOWED_SECTION_NAMES
from app.services.insights import heuristic_sections


NEUTRAL_LOG = MyBrainLog(sleep=7, coffee=0, mood=3)


def pairs(sections) -> set[tuple[str, str]]:
	return {(s.section, s.effectType) for s in sections}


def cardio_summary(duration_min: float = 35) -> DailyHealthSummary:
	return DailyHealthSummary(
		date="2026-10-04",
		sources=["strava"],
		activity=ActivitySummary(
			active_minutes=duration_min,
			workouts=[Workout(type="run", duration_min=duration_min)],
		),
	)


def test_neutral_day_no_sections():
	assert heuristic_sections(NEUTRAL_LOG, None, None) == []


def test_short_sleep_maps_frontal_and_amygdala():
	log = MyBrainLog(sleep=5, coffee=0, mood=3)
	result = pairs(heuristic_sections(log, None, None))
	assert ("Frontal Lobe", "depresses") in result
	assert ("Amygdala", "stimulates") in result


def test_cardio_30min_maps_physical_activity_acute():
	result = pairs(heuristic_sections(NEUTRAL_LOG, cardio_summary(35), None))
	assert ("Frontal Lobe", "stimulates") in result
	assert ("Amygdala", "modulates") in result


def test_short_workout_below_30min_no_cardio_rule():
	result = pairs(heuristic_sections(NEUTRAL_LOG, cardio_summary(20), None))
	assert ("Frontal Lobe", "stimulates") not in result


def test_non_cardio_workout_type_no_cardio_rule():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["strava"],
		activity=ActivitySummary(
			workouts=[Workout(type="weighttraining", duration_min=45)]
		),
	)
	result = pairs(heuristic_sections(NEUTRAL_LOG, summary, None))
	assert ("Frontal Lobe", "stimulates") not in result


def test_high_caffeine_mg_maps_caffeine_rule():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(caffeine_mg=250),
	)
	result = pairs(heuristic_sections(NEUTRAL_LOG, summary, None))
	assert ("Frontal Lobe", "stimulates") in result
	assert ("Nucleus Accumbens", "stimulates") in result


def test_coffee_cups_fallback_when_no_nutrition():
	log = MyBrainLog(sleep=7, coffee=3, mood=3)
	result = pairs(heuristic_sections(log, None, None))
	assert ("Frontal Lobe", "stimulates") in result

	log2 = MyBrainLog(sleep=7, coffee=2, mood=3)
	assert heuristic_sections(log2, None, None) == []


def test_caffeine_mg_below_threshold_no_rule():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(caffeine_mg=150),
	)
	assert heuristic_sections(NEUTRAL_LOG, summary, None) == []


def test_alcohol_maps_frontal_depresses():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(alcohol_g=30),
	)
	result = pairs(heuristic_sections(NEUTRAL_LOG, summary, None))
	assert ("Frontal Lobe", "depresses") in result


def test_low_mood_maps_amygdala():
	log = MyBrainLog(sleep=7, coffee=0, mood=1)
	result = pairs(heuristic_sections(log, None, None))
	assert ("Amygdala", "stimulates") in result


def test_chronic_activity_trend_maps_hippocampus():
	trend = {"days": 5, "active_minutes_avg": 45}
	result = pairs(heuristic_sections(NEUTRAL_LOG, None, trend))
	assert ("Hippocampus", "modulates") in result


def test_chronic_trend_needs_three_days():
	trend = {"days": 2, "active_minutes_avg": 45}
	assert heuristic_sections(NEUTRAL_LOG, None, trend) == []


def test_dedupe_stable_order():
	log = MyBrainLog(sleep=5, coffee=0, mood=0)  # both rules hit Amygdala stimulates
	result = heuristic_sections(log, None, None)
	amygdala_stimulates = [
		s for s in result if s.section == "Amygdala" and s.effectType == "stimulates"
	]
	assert len(amygdala_stimulates) == 1


def test_all_sections_in_allowed_names():
	log = MyBrainLog(sleep=4, coffee=5, mood=0)
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["strava", "fatsecret"],
		activity=ActivitySummary(workouts=[Workout(type="run", duration_min=60)]),
		nutrition=NutritionSummary(caffeine_mg=400, alcohol_g=40),
	)
	trend = {"days": 7, "active_minutes_avg": 60}
	result = heuristic_sections(log, summary, trend)
	assert result, "expected at least one section for a maximally-loaded day"
	for section in result:
		assert section.section in ALLOWED_SECTION_NAMES
		assert section.effectType in {"stimulates", "depresses", "damages", "modulates"}
