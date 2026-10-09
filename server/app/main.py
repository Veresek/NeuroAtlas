from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI, HTTPException, Request

from .db import get_states
from .routers.integrations import router as integrations_router
from .schemas import AffectedBrainSection, DailyLogAnalysis, MyBrainLog
from .services.gemini import generate_daily_log_analysis, merge_sections
from .services.insights import heuristic_sections
from .services.summary_store import (
	compute_trend,
	filter_disabled,
	load_summaries,
)
from .services.vault import get_vault_id, list_disabled_providers
from .settings import settings


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
	try:
		await get_states().create_index([("created_at", 1)], expireAfterSeconds=600)
	except Exception as e:
		logger.warning("Could not create oauth_states TTL index: %s", e)
	yield


app = FastAPI(title="NeuroAtlas API", version="0.1.0", lifespan=lifespan)
app.include_router(integrations_router)


@app.get("/health")
def health() -> dict:
	return {"ok": True}


@app.post("/api/my-brain/analyze", response_model=DailyLogAnalysis)
async def analyze_my_brain(log: MyBrainLog, request: Request) -> DailyLogAnalysis:
	if not settings.gemini_api_key:
		raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
	if not settings.gemini_model:
		raise HTTPException(status_code=500, detail="GEMINI_MODEL is not configured.")

	summary = None
	trend = None
	try:
		vault_id = get_vault_id(request)
		if vault_id:
			today = date.today()
			summaries = await load_summaries(
				vault_id,
				(today - timedelta(days=6)).isoformat(),
				today.isoformat(),
			)
			summaries = filter_disabled(
				summaries, await list_disabled_providers(vault_id)
			)
			if summaries and summaries[-1].date == today.isoformat():
				summary = summaries[-1]
			trend = compute_trend(summaries)
	except Exception as e:
		# enrichment is best-effort: analysis must work with the note alone
		logger.warning("My Brain enrichment failed: %s", e)
		summary = None
		trend = None

	try:
		analysis = await generate_daily_log_analysis(log, summary, trend)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=str(e)) from e

	heuristic: list[AffectedBrainSection] = heuristic_sections(summary, trend)
	analysis.affectedSections = merge_sections(heuristic, analysis.affectedSections)
	return analysis
