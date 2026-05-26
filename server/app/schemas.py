from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


BrainSectionEffectType = Literal["stimulates", "depresses", "damages", "modulates"]


class MyBrainLog(BaseModel):
	sleep: float = Field(..., ge=0, le=24)
	coffee: float = Field(..., ge=0, le=50)
	mood: int = Field(..., ge=0, le=4)


class AffectedBrainSection(BaseModel):
	section: str
	effectType: BrainSectionEffectType


class DailyLogAnalysis(BaseModel):
	message: str
	affectedSections: list[AffectedBrainSection]

