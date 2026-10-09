from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

	gemini_api_key: str = ""
	gemini_model: str = "gemma-4-31b-it"
	app_env: str = "development"
	mongo_url: str = "mongodb://localhost:27017"


settings = Settings()

