from __future__ import annotations

import base64
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi import Request, Response

from ..db import get_vaults
from ..settings import settings


VAULT_COOKIE = "na_vault"
VAULT_COOKIE_MAX_AGE = 2 * 365 * 24 * 3600  # ~2 years


def _derive_key(vault_id: str) -> bytes:
	if not settings.server_token_key:
		raise ValueError("SERVER_TOKEN_KEY is not configured")
	hkdf = HKDF(
		algorithm=SHA256(),
		length=32,
		salt=None,
		info=b"vault:" + vault_id.encode(),
	)
	return hkdf.derive(settings.server_token_key.encode())


def encrypt_token(plaintext: str, vault_id: str) -> tuple[str, str]:
	"""Encrypts a provider refresh token; returns (ciphertext_b64, nonce_b64)."""
	key = _derive_key(vault_id)
	nonce = os.urandom(12)
	ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
	return base64.b64encode(ciphertext).decode(), base64.b64encode(nonce).decode()


def decrypt_token(ciphertext_b64: str, nonce_b64: str, vault_id: str) -> str:
	key = _derive_key(vault_id)
	ciphertext = base64.b64decode(ciphertext_b64)
	nonce = base64.b64decode(nonce_b64)
	return AESGCM(key).decrypt(nonce, ciphertext, None).decode()


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


async def save_provider_token(
	vault_id: str,
	provider: str,
	refresh_token: str,
	expires_at: Optional[datetime],
	scopes: list[str],
	enabled: bool = True,
) -> None:
	ciphertext, nonce = encrypt_token(refresh_token, vault_id)
	await get_vaults().update_one(
		{"vault_id": vault_id, "provider": provider},
		{
			"$set": {
				"ciphertext": ciphertext,
				"nonce": nonce,
				"expires_at": expires_at,
				"scopes": scopes,
				"enabled": enabled,
				"connected_at": datetime.now(timezone.utc),
			}
		},
		upsert=True,
	)


async def load_vault_record(vault_id: str, provider: str) -> Optional[dict]:
	return await get_vaults().find_one({"vault_id": vault_id, "provider": provider})


async def load_provider_token(vault_id: str, provider: str) -> Optional[str]:
	record = await load_vault_record(vault_id, provider)
	if not record:
		return None
	return decrypt_token(record["ciphertext"], record["nonce"], vault_id)


async def delete_provider_token(vault_id: str, provider: str) -> None:
	await get_vaults().delete_one({"vault_id": vault_id, "provider": provider})


async def list_connected_providers(vault_id: str) -> list[str]:
	cursor = get_vaults().find({"vault_id": vault_id}, {"provider": 1})
	return [doc["provider"] async for doc in cursor]


async def set_provider_enabled(
	vault_id: str, provider: str, enabled: bool
) -> None:
	await get_vaults().update_one(
		{"vault_id": vault_id, "provider": provider},
		{"$set": {"enabled": enabled}},
	)


async def list_enabled_providers(vault_id: str) -> list[str]:
	cursor = get_vaults().find(
		{"vault_id": vault_id, "enabled": {"$ne": False}}, {"provider": 1}
	)
	return [doc["provider"] async for doc in cursor]


async def list_disabled_providers(vault_id: str) -> list[str]:
	cursor = get_vaults().find(
		{"vault_id": vault_id, "enabled": False}, {"provider": 1}
	)
	return [doc["provider"] async for doc in cursor]
