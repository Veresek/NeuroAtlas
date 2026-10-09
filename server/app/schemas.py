from typing import Literal

from pydantic import BaseModel, Field, field_validator


BrainSectionEffectType = Literal["stimulates", "depresses", "damages", "modulates"]


class MyBrainLog(BaseModel):
	note: str = Field(..., min_length=1, max_length=2000)

	@field_validator("note")
	@classmethod
	def note_must_not_be_blank(cls, value: str) -> str:
		stripped = value.strip()
		if not stripped:
			raise ValueError("note must not be blank")
		return stripped


class AffectedBrainSection(BaseModel):
	section: str
	effectType: BrainSectionEffectType


class DailyLogAnalysis(BaseModel):
	message: str
	affectedSections: list[AffectedBrainSection]


class ProviderToggle(BaseModel):
	enabled: bool


class Workout(BaseModel):
	type: str
	duration_min: float
	calories: float | None = Field(default=None, ge=0)
	avg_hr: int | None = Field(default=None, ge=0)


class ActivitySummary(BaseModel):
	steps: int | None = Field(default=None, ge=0)
	active_minutes: float | None = Field(default=None, ge=0)
	calories_burned: float | None = Field(default=None, ge=0)
	workouts: list[Workout] = Field(default_factory=list)


class NutritionSummary(BaseModel):
	calories: float | None = Field(default=None, ge=0)
	protein_g: float | None = Field(default=None, ge=0)
	carbs_g: float | None = Field(default=None, ge=0)
	fat_g: float | None = Field(default=None, ge=0)
	caffeine_mg: float | None = Field(default=None, ge=0)
	water_ml: float | None = Field(default=None, ge=0)
	alcohol_g: float | None = Field(default=None, ge=0)


class DailyHealthSummary(BaseModel):
	date: str  # YYYY-MM-DD
	sources: list[str] = Field(default_factory=list)
	activity: ActivitySummary | None = None
	nutrition: NutritionSummary | None = None

