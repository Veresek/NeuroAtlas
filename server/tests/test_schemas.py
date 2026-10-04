import pytest
from pydantic import ValidationError

from app.schemas import DailyHealthSummary, NutritionSummary, Workout


def test_daily_health_summary_minimal():
	summary = DailyHealthSummary(date="2026-10-04")
	assert summary.sources == []
	assert summary.activity is None
	assert summary.nutrition is None


def test_workout_requires_type_and_duration():
	with pytest.raises(ValidationError):
		Workout(type="run")  # duration_min missing


def test_summary_rejects_negative_calories():
	with pytest.raises(ValidationError):
		NutritionSummary(calories=-1)
