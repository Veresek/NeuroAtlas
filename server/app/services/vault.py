from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Request, Response

from ..settings import settings


VAULT_COOKIE = "na_vault"
VAULT_COOKIE_MAX_AGE = 2 * 365 * 24 * 3600  # ~2 years


def get_vault_id(request: Request) -> Optional[str]:
	raw = request.cookies.get(VAULT_COOKIE)
	if not raw:
		return None
	try:
		return str(uuid.UUID(raw))
	except ValueError:
		return None


def set_vault_cookie(response: Response, vault_id: str) -> None:
	response.set_cookie(
		VAULT_COOKIE,
		vault_id,
		max_age=VAULT_COOKIE_MAX_AGE,
		httponly=True,
		samesite="lax",
		secure=(settings.app_env == "production"),
	)


def issue_vault_cookie(response: Response) -> str:
	vault_id = str(uuid.uuid4())
	set_vault_cookie(response, vault_id)
	return vault_id
