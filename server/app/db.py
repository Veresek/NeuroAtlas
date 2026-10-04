from __future__ import annotations

from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from .settings import settings


DB_NAME = "neuroatlas"
VAULTS_COLLECTION = "oauth_vaults"
SUMMARIES_COLLECTION = "daily_health_summaries"

_client: Optional[Any] = None


def set_db_client(client: Any) -> None:
	"""Test seam: inject a (mock) async mongo client."""
	global _client
	_client = client


def get_db() -> AsyncIOMotorDatabase:
	global _client
	if _client is None:
		from motor.motor_asyncio import AsyncIOMotorClient

		_client = AsyncIOMotorClient(settings.mongo_url)
	return _client[DB_NAME]


def get_vaults():
	return get_db()[VAULTS_COLLECTION]


def get_summaries():
	return get_db()[SUMMARIES_COLLECTION]
