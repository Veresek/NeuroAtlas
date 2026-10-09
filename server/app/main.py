from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request, Response

from .schemas import DailyLogAnalysis, MyBrainLog
from .services.gemini import generate_daily_log_analysis
from .services.vault import get_vault_id, issue_vault_cookie
from .settings import settings


app = FastAPI(title="NeuroAtlas API", version="0.1.0")


@app.get("/health")
def health() -> dict:
	return {"ok": True}


@app.post("/api/my-brain/analyze", response_model=DailyLogAnalysis)
async def analyze_my_brain(
	log: MyBrainLog, request: Request, response: Response
) -> DailyLogAnalysis:
	if not settings.gemini_api_key:
		raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
	if not settings.gemini_model:
		raise HTTPException(status_code=500, detail="GEMINI_MODEL is not configured.")

	# Anonymous vault identity for per-vault history: the endpoint that used to
	# set this cookie as part of connecting an app is gone, so analyze owns it.
	get_vault_id(request) or issue_vault_cookie(response)

	try:
		return await generate_daily_log_analysis(log)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=str(e)) from e
