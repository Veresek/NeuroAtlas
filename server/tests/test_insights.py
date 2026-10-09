from app.schemas import ActivitySummary, DailyHealthSummary, NutritionSummary, Workout
from app.services.gemini import ALLOWED_SECTION_NAMES
from app.services.insights import heuristic_sections


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


def test_empty_day_no_sections():
	assert heuristic_sections(None, None) == []


def test_cardio_30min_maps_physical_activity_acute():
	result = pairs(heuristic_sections(cardio_summary(35), None))
	assert ("Frontal Lobe", "stimulates") in result
	assert ("Amygdala", "modulates") in result


def test_short_workout_below_30min_no_cardio_rule():
	result = pairs(heuristic_sections(cardio_summary(20), None))
	assert ("Frontal Lobe", "stimulates") not in result


def test_non_cardio_workout_type_no_cardio_rule():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["strava"],
		activity=ActivitySummary(
			workouts=[Workout(type="weighttraining", duration_min=45)]
		),
	)
	result = pairs(heuristic_sections(summary, None))
	assert ("Frontal Lobe", "stimulates") not in result


def test_high_caffeine_mg_maps_caffeine_rule():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(caffeine_mg=250),
	)
	result = pairs(heuristic_sections(summary, None))
	assert ("Frontal Lobe", "stimulates") in result
	assert ("Nucleus Accumbens", "stimulates") in result


def test_caffeine_mg_below_threshold_no_rule():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(caffeine_mg=150),
	)
	assert heuristic_sections(summary, None) == []


def test_alcohol_maps_frontal_depresses():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["fatsecret"],
		nutrition=NutritionSummary(alcohol_g=30),
	)
	result = pairs(heuristic_sections(summary, None))
	assert ("Frontal Lobe", "depresses") in result


def test_chronic_activity_trend_maps_hippocampus():
	trend = {"days": 5, "active_minutes_avg": 45}
	result = pairs(heuristic_sections(None, trend))
	assert ("Hippocampus", "modulates") in result


def test_chronic_trend_needs_three_days():
	trend = {"days": 2, "active_minutes_avg": 45}
	assert heuristic_sections(None, trend) == []


def test_dedupe_stable_order():
	# cardio and high caffeine both map Frontal Lobe stimulates
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["strava", "fatsecret"],
		activity=ActivitySummary(workouts=[Workout(type="run", duration_min=60)]),
		nutrition=NutritionSummary(caffeine_mg=400),
	)
	result = heuristic_sections(summary, None)
	frontal_stimulates = [
		s
		for s in result
		if s.section == "Frontal Lobe" and s.effectType == "stimulates"
	]
	assert len(frontal_stimulates) == 1


def test_all_sections_in_allowed_names():
	summary = DailyHealthSummary(
		date="2026-10-04",
		sources=["strava", "fatsecret"],
		activity=ActivitySummary(workouts=[Workout(type="run", duration_min=60)]),
		nutrition=NutritionSummary(caffeine_mg=400, alcohol_g=40),
	)
	trend = {"days": 7, "active_minutes_avg": 60}
	result = heuristic_sections(summary, trend)
	assert result, "expected at least one section for a maximally-loaded day"
	for section in result:
		assert section.section in ALLOWED_SECTION_NAMES
		assert section.effectType in {"stimulates", "depresses", "damages", "modulates"}
