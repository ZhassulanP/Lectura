from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore"
    )
    database_url: str = "postgresql+psycopg://slidewise:slidewise@localhost:5432/slidewise"
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = Field(default="gemini-3.8-flash", pattern=r"^[a-zA-Z0-9._-]+$")
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    max_upload_bytes: int = Field(default=50 * 1024 * 1024, gt=0)
    max_document_pages: int = Field(default=500, gt=0)
    max_extracted_chars: int = Field(default=2_000_000, gt=0)
    max_ai_input_chars: int = Field(default=120_000, gt=0)
    ai_timeout_seconds: float = Field(default=90, gt=0, le=300)
    api_prefix: str = "/api/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
