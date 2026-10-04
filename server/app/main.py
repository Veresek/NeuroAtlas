from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .db import get_states
from .routers.integrations import router as integrations_router
from .schemas import DailyLogAnalysis, MyBrainLog
from .services.gemini import generate_daily_log_analysis
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
async def analyze_my_brain(log: MyBrainLog) -> DailyLogAnalysis:
	if not settings.gemini_api_key:
		raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
	if not settings.gemini_model:
		raise HTTPException(status_code=500, detail="GEMINI_MODEL is not configured.")

	try:
		return await generate_daily_log_analysis(log)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=str(e)) from e
