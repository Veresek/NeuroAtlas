from datetime import datetime, timezone
from uuid import uuid4

import pytest
from mongomock_motor import AsyncMongoMockClient

from app import db
from app.services.vault import (
	delete_provider_token,
	decrypt_token,
	encrypt_token,
	list_connected_providers,
	load_provider_token,
	load_vault_record,
	save_provider_token,
)
from app.settings import settings


TEST_KEY = "test-key-32-chars-minimum-length!!"


@pytest.fixture(autouse=True)
def mock_db():
	db.set_db_client(AsyncMongoMockClient())
	settings.server_token_key = TEST_KEY
	yield
	settings.server_token_key = ""
	db.set_db_client(None)


def test_decrypt_roundtrip():
	vault_id = str(uuid4())
	ciphertext, nonce = encrypt_token("secret-refresh-token", vault_id)
	assert decrypt_token(ciphertext, nonce, vault_id) == "secret-refresh-token"


def test_key_isolation_between_vaults():
	vault_a = str(uuid4())
	vault_b = str(uuid4())
	ciphertext, nonce = encrypt_token("secret-refresh-token", vault_a)
	with pytest.raises(Exception):
		decrypt_token(ciphertext, nonce, vault_b)


def test_encrypt_requires_server_token_key():
	settings.server_token_key = ""
	with pytest.raises(ValueError, match="SERVER_TOKEN_KEY"):
		encrypt_token("x", str(uuid4()))


async def test_stored_token_is_not_plaintext():
	vault_id = str(uuid4())
	await save_provider_token(
		vault_id,
		"strava",
		"super-secret-refresh",
		datetime(2026, 10, 5, tzinfo=timezone.utc),
		["activity:read_all"],
	)
	record = await load_vault_record(vault_id, "strava")
	assert record is not None
	assert record["ciphertext"] != "super-secret-refresh"
	assert "super-secret-refresh" not in repr(record)


async def test_load_returns_decrypted():
	vault_id = str(uuid4())
	await save_provider_token(vault_id, "fatsecret", "rt-123", None, ["basic"])
	assert await load_provider_token(vault_id, "fatsecret") == "rt-123"
	assert await load_provider_token(vault_id, "strava") is None


async def test_delete_removes_record():
	vault_id = str(uuid4())
	await save_provider_token(vault_id, "strava", "rt-x", None, [])
	await delete_provider_token(vault_id, "strava")
	assert await load_vault_record(vault_id, "strava") is None


async def test_list_connected_providers():
	vault_id = str(uuid4())
	await save_provider_token(vault_id, "strava", "rt-1", None, [])
	await save_provider_token(vault_id, "fatsecret", "rt-2", None, [])
	await save_provider_token(str(uuid4()), "strava", "other-vault", None, [])
	connected = await list_connected_providers(vault_id)
	assert sorted(connected) == ["fatsecret", "strava"]
