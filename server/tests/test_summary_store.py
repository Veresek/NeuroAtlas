import pytest
from mongomock_motor import AsyncMongoMockClient

from app import db
from app.schemas import ActivitySummary, NutritionSummary, Workout
from app.services.summary_store import (
	HealthFragment,
	compute_trend,
	delete_vault_summaries,
	load_summaries,
	merge_fragments,
)


VAULT = "vault-1"
DATE = "2026-10-03"


@pytest.fixture(autouse=True)
def mock_db():
	db.set_db_client(AsyncMongoMockClient())
	yield
	db.set_db_client(None)


def strava_fragment(date: str = DATE, ids: tuple = ("a1", "a2")) -> HealthFragment:
	return HealthFragment(
		source="strava",
		date=date,
		external_ids=list(ids),
		activity=ActivitySummary(
			active_minutes=70.0,
			calories_burned=641.0,
			workouts=[
				Workout(type="run", duration_min=35, calories=320.5, avg_hr=148),
				Workout(type="run", duration_min=35, calories=320.5),
			],
		),
	)


def fatsecret_fragment(date: str = DATE, ids: tuple = ("f1",)) -> HealthFragment:
	return HealthFragment(
		source="fatsecret",
		date=date,
		external_ids=list(ids),
		nutrition=NutritionSummary(calories=2100, protein_g=120, carbs_g=250, fat_g=70),
	)


async def test_merge_two_sources_same_date():
	changed = await merge_fragments(VAULT, [strava_fragment(), fatsecret_fragment()])
	assert changed == 1
	summaries = await load_summaries(VAULT, DATE, DATE)
	assert len(summaries) == 1
	summary = summaries[0]
	assert sorted(summary.sources) == ["fatsecret", "strava"]
	assert summary.activity is not None
	assert summary.nutrition is not None
	assert len(summary.activity.workouts) == 2
	assert summary.nutrition.calories == 2100


async def test_resync_is_idempotent():
	await merge_fragments(VAULT, [strava_fragment()])
	changed = await merge_fragments(VAULT, [strava_fragment()])
	assert changed == 0
	summaries = await load_summaries(VAULT, DATE, DATE)
	assert len(summaries[0].activity.workouts) == 2


async def test_merge_preserves_other_source_fields():
	await merge_fragments(VAULT, [strava_fragment(), fatsecret_fragment()])
	await merge_fragments(VAULT, [strava_fragment(date=DATE, ids=("a1", "a2", "a3"))])
	summary = (await load_summaries(VAULT, DATE, DATE))[0]
	assert summary.nutrition is not None
	assert summary.nutrition.calories == 2100
	assert sorted(summary.sources) == ["fatsecret", "strava"]


async def test_sanity_drops_absurd_workout():
	fragment = HealthFragment(
		source="strava",
		date=DATE,
		external_ids=["x1"],
		activity=ActivitySummary(workouts=[Workout(type="run", duration_min=5000)]),
	)
	changed = await merge_fragments(VAULT, [fragment])
	assert changed == 0
	assert await load_summaries(VAULT, DATE, DATE) == []


async def test_load_summaries_range_sorted():
	await merge_fragments(
		VAULT,
		[strava_fragment(date="2026-10-03"), strava_fragment(date="2026-10-01"), strava_fragment(date="2026-10-02")],
	)
	all_days = await load_summaries(VAULT, "2026-10-01", "2026-10-03")
	assert [s.date for s in all_days] == ["2026-10-01", "2026-10-02", "2026-10-03"]
	partial = await load_summaries(VAULT, "2026-10-02", "2026-10-03")
	assert [s.date for s in partial] == ["2026-10-02", "2026-10-03"]


async def test_compute_trend_averages():
	await merge_fragments(
		VAULT,
		[
			HealthFragment(
				source="strava",
				date="2026-10-01",
				external_ids=["d1"],
				activity=ActivitySummary(
					active_minutes=30,
					calories_burned=300,
					workouts=[Workout(type="run", duration_min=30)],
				),
			),
			HealthFragment(
				source="fatsecret",
				date="2026-10-01",
				external_ids=["n1"],
				nutrition=NutritionSummary(calories=2000, protein_g=100),
			),
			HealthFragment(
				source="strava",
				date="2026-10-02",
				external_ids=["d2"],
				activity=ActivitySummary(
					active_minutes=40,
					calories_burned=400,
					workouts=[Workout(type="ride", duration_min=40)],
				),
			),
			HealthFragment(
				source="fatsecret",
				date="2026-10-02",
				external_ids=["n2"],
				nutrition=NutritionSummary(calories=2200, protein_g=120),
			),
		],
	)
	summaries = await load_summaries(VAULT, "2026-10-01", "2026-10-02")
	trend = compute_trend(summaries)
	assert trend["days"] == 2
	assert trend["active_minutes_avg"] == 35
	assert trend["calories_burned_avg"] == 350
	assert trend["workouts_count"] == 2
	assert trend["calories_intake_avg"] == 2100
	assert trend["protein_g_avg"] == 110


async def test_delete_vault_summaries():
	await merge_fragments(VAULT, [strava_fragment()])
	await delete_vault_summaries(VAULT)
	assert await load_summaries(VAULT, "2026-01-01", "2026-12-31") == []
