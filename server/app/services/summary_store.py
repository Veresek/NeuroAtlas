from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from ..db import get_summaries
from ..schemas import ActivitySummary, DailyHealthSummary, NutritionSummary


MAX_WORKOUT_MINUTES = 24 * 60


class HealthFragment(BaseModel):
	"""Normalized per-source contribution to one day of a vault's health record."""

	source: str
	date: str  # YYYY-MM-DD
	external_ids: list[str] = []
	activity: Optional[ActivitySummary] = None
	nutrition: Optional[NutritionSummary] = None


def _sanitize(fragment: HealthFragment) -> Optional[HealthFragment]:
	"""Drops absurd workouts; returns None when nothing remains."""
	if fragment.activity is not None:
		workouts = [
			w
			for w in fragment.activity.workouts
			if 0 < w.duration_min <= MAX_WORKOUT_MINUTES
		]
		activity = fragment.activity.model_copy(update={"workouts": workouts})
		has_activity_data = (
			activity.workouts
			or activity.steps is not None
			or activity.active_minutes is not None
			or activity.calories_burned is not None
		)
		fragment = fragment.model_copy(
			update={"activity": activity if has_activity_data else None}
		)
	if fragment.activity is None and fragment.nutrition is None:
		return None
	return fragment


async def merge_fragments(vault_id: str, fragments: list[HealthFragment]) -> int:
	"""Upserts one doc per (vault_id, date); skips fragments already synced.

	Returns the number of day-docs created or modified.
	"""
	by_date: dict[str, list[HealthFragment]] = {}
	for fragment in fragments:
		clean = _sanitize(fragment)
		if clean is None:
			continue
		by_date.setdefault(clean.date, []).append(clean)

	collection = get_summaries()
	changed = 0
	for date, day_fragments in by_date.items():
		doc = await collection.find_one({"vault_id": vault_id, "date": date})
		existing_ids: dict[str, list[str]] = dict((doc or {}).get("external_ids", {}))
		sources = set((doc or {}).get("sources", []))
		activity = (doc or {}).get("activity")
		nutrition = (doc or {}).get("nutrition")
		doc_changed = False

		for fragment in day_fragments:
			known = set(existing_ids.get(fragment.source, []))
			if fragment.external_ids and known.issuperset(fragment.external_ids):
				continue
			if fragment.activity is not None:
				activity = fragment.activity.model_dump()
			if fragment.nutrition is not None:
				nutrition = fragment.nutrition.model_dump()
			sources.add(fragment.source)
			known.update(fragment.external_ids)
			existing_ids[fragment.source] = sorted(known)
			doc_changed = True

		if not doc_changed:
			continue

		update: dict = {"sources": sorted(sources), "external_ids": existing_ids}
		if activity is not None:
			update["activity"] = activity
		if nutrition is not None:
			update["nutrition"] = nutrition
		await collection.update_one(
			{"vault_id": vault_id, "date": date}, {"$set": update}, upsert=True
		)
		changed += 1
	return changed


async def load_summaries(
	vault_id: str, date_from: str, date_to: str
) -> list[DailyHealthSummary]:
	cursor = (
		get_summaries()
		.find(
			{"vault_id": vault_id, "date": {"$gte": date_from, "$lte": date_to}},
			{"vault_id": 0, "external_ids": 0, "_id": 0},
		)
		.sort("date", 1)
	)
	docs = [doc async for doc in cursor]
	return [DailyHealthSummary.model_validate(doc) for doc in docs]


async def delete_vault_summaries(vault_id: str) -> None:
	await get_summaries().delete_many({"vault_id": vault_id})


def compute_trend(summaries: list[DailyHealthSummary]) -> dict:
	"""7-day averages over the most recent docs that carry data."""
	recent = summaries[-7:]

	def avg(values: list[float]) -> Optional[float]:
		present = [v for v in values if v is not None]
		return round(sum(present) / len(present), 1) if present else None

	active = [
		s.activity.active_minutes for s in recent if s.activity
	]
	burned = [
		s.activity.calories_burned for s in recent if s.activity
	]
	workouts_count = sum(len(s.activity.workouts) for s in recent if s.activity)
	intake = [s.nutrition.calories for s in recent if s.nutrition]
	protein = [s.nutrition.protein_g for s in recent if s.nutrition]

	return {
		"days": len(recent),
		"active_minutes_avg": avg(active),
		"calories_burned_avg": avg(burned),
		"workouts_count": workouts_count,
		"calories_intake_avg": avg(intake),
		"protein_g_avg": avg(protein),
	}
