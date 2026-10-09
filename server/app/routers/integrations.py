from __future__ import annotations

import logging
import secrets
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from ..db import get_states
from ..schemas import ProviderToggle
from ..services.connectors import CONNECTORS
from ..services.summary_store import (
	compute_trend,
	filter_disabled,
	load_summaries,
	merge_fragments,
	remove_source,
)
from ..services.vault import (
	delete_provider_token,
	get_vault_id,
	list_disabled_providers,
	list_enabled_providers,
	load_provider_token,
	load_vault_record,
	save_provider_token,
	set_provider_enabled,
	set_vault_cookie,
)
from ..settings import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

STATE_TTL_SECONDS = 600


def _parse_day(value: Optional[str], default: date) -> date:
	if not value:
		return default
	try:
		return date.fromisoformat(value)
	except ValueError:
		raise HTTPException(status_code=400, detail="Invalid date; expected YYYY-MM-DD")


@router.get("/integrations")
async def list_integrations(request: Request) -> dict:
	vault_id = get_vault_id(request)
	providers = []
	for name in CONNECTORS:
		connected = False
		connected_at = None
		enabled = False
		if vault_id:
			record = await load_vault_record(vault_id, name)
			if record:
				connected = True
				connected_at = record.get("connected_at")
				enabled = bool(record.get("enabled", True))
		providers.append(
			{
				"provider": name,
				"connected": connected,
				"connected_at": connected_at,
				"enabled": enabled,
			}
		)
	return {"providers": providers}


@router.post("/integrations/{provider}/toggle")
async def toggle_provider(
	provider: str, body: ProviderToggle, request: Request
) -> dict:
	if provider not in CONNECTORS:
		raise HTTPException(status_code=404, detail="Unknown provider")
	vault_id = get_vault_id(request)
	record = await load_vault_record(vault_id, provider) if vault_id else None
	if record is None:
		raise HTTPException(status_code=404, detail="Provider not connected")
	await set_provider_enabled(vault_id, provider, body.enabled)
	return {"ok": True, "enabled": body.enabled}


@router.get("/integrations/{provider}/connect")
async def connect_provider(provider: str, request: Request):
	connector = CONNECTORS.get(provider)
	if connector is None:
		raise HTTPException(status_code=404, detail="Unknown provider")
	if not connector.is_configured:
		raise HTTPException(
			status_code=500,
			detail=(
				f"Provider '{provider}' is not configured — set "
				f"{connector.config_hint} in the server environment."
			),
		)

	vault_id = get_vault_id(request)
	is_new_vault = vault_id is None
	if vault_id is None:
		vault_id = str(uuid.uuid4())

	state = secrets.token_urlsafe(24)
	await get_states().insert_one(
		{
			"vault_id": vault_id,
			"provider": provider,
			"state": state,
			"created_at": datetime.now(timezone.utc),
		}
	)

	response = RedirectResponse(connector.build_authorize_url(state), status_code=302)
	if is_new_vault:
		set_vault_cookie(response, vault_id)
	return response


@router.get("/integrations/{provider}/callback")
async def provider_callback(
	provider: str, request: Request, code: str = "", state: str = ""
):
	connector = CONNECTORS.get(provider)
	if connector is None:
		raise HTTPException(status_code=404, detail="Unknown provider")

	vault_id = get_vault_id(request)
	if not vault_id or not code or not state:
		raise HTTPException(status_code=400, detail="Missing vault cookie, code, or state")

	state_doc = await get_states().find_one_and_delete(
		{"vault_id": vault_id, "provider": provider, "state": state}
	)
	if state_doc is None:
		raise HTTPException(status_code=400, detail="Invalid or expired state")
	created_at = state_doc.get("created_at")
	if created_at is not None:
		if created_at.tzinfo is None:
			created_at = created_at.replace(tzinfo=timezone.utc)
		if (datetime.now(timezone.utc) - created_at).total_seconds() > STATE_TTL_SECONDS:
			raise HTTPException(status_code=400, detail="Invalid or expired state")

	try:
		token = await connector.exchange_code(code)
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=502, detail=f"Token exchange failed: {e}") from e

	if not token.refresh_token:
		raise HTTPException(status_code=502, detail="Provider did not return a refresh token")

	await save_provider_token(
		vault_id, provider, token.refresh_token, token.expires_at, []
	)
	return RedirectResponse(settings.client_base_url, status_code=302)


@router.post("/integrations/{provider}/disconnect")
async def disconnect_provider(provider: str, request: Request):
	connector = CONNECTORS.get(provider)
	if connector is None:
		raise HTTPException(status_code=404, detail="Unknown provider")

	vault_id = get_vault_id(request)
	refresh_token = await load_provider_token(vault_id, provider) if vault_id else None
	if refresh_token is None:
		raise HTTPException(status_code=404, detail="Provider not connected")

	try:
		token = await connector.refresh(refresh_token)
		await connector.revoke(token.access_token)
	except Exception as e:
		logger.warning("Best-effort revoke failed for %s: %s", provider, e)

	await delete_provider_token(vault_id, provider)
	await remove_source(vault_id, provider)
	return {"ok": True}


@router.post("/integrations/sync")
async def sync_integrations(
	request: Request,
	from_day: Optional[str] = Query(default=None, alias="from"),
	to_day: Optional[str] = Query(default=None, alias="to"),
):
	today = date.today()
	date_to = _parse_day(to_day, today)
	date_from = _parse_day(from_day, date_to - timedelta(days=6))

	synced: list[str] = []
	failed: list[dict] = []
	vault_id = get_vault_id(request)
	if not vault_id:
		return {"synced": synced, "failed": failed}

	for provider in await list_enabled_providers(vault_id):
		connector = CONNECTORS.get(provider)
		if connector is None:
			continue
		try:
			refresh_token = await load_provider_token(vault_id, provider)
			try:
				token = await connector.refresh(refresh_token)
			except Exception:
				# Providers rotate refresh tokens: another tab may have
				# rotated ours between load and use. Re-read once and retry.
				reloaded = await load_provider_token(vault_id, provider)
				if reloaded is None or reloaded == refresh_token:
					raise
				token = await connector.refresh(reloaded)
				refresh_token = reloaded
			if token.refresh_token and token.refresh_token != refresh_token:
				record = await load_vault_record(vault_id, provider) or {}
				await save_provider_token(
					vault_id,
					provider,
					token.refresh_token,
					token.expires_at,
					record.get("scopes", []),
					record.get("enabled", True),
				)
			fragments = await connector.fetch_fragments(
				token.access_token, date_from, date_to
			)
			await merge_fragments(vault_id, fragments)
			synced.append(provider)
		except Exception as e:
			logger.warning("Sync failed for %s: %s", provider, e)
			failed.append({"provider": provider, "error": str(e)})

	return {"synced": synced, "failed": failed}


@router.get("/me/health")
async def my_health(
	request: Request,
	from_day: Optional[str] = Query(default=None, alias="from"),
	to_day: Optional[str] = Query(default=None, alias="to"),
):
	today = date.today()
	date_to = _parse_day(to_day, today)
	date_from = _parse_day(from_day, date_to - timedelta(days=6))

	vault_id = get_vault_id(request)
	if not vault_id:
		return {"summaries": [], "trend": compute_trend([])}

	summaries = await load_summaries(
		vault_id, date_from.isoformat(), date_to.isoformat()
	)
	summaries = filter_disabled(summaries, await list_disabled_providers(vault_id))
	return {
		"summaries": [summary.model_dump() for summary in summaries],
		"trend": compute_trend(summaries),
	}
