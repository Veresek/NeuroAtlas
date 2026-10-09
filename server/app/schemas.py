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

