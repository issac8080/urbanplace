import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


def _env_file_path() -> str:
    """Resolve .env from the same directory as this config file (backend/)."""
    backend_dir = Path(__file__).resolve().parent
    return str(backend_dir / ".env")


class Settings(BaseSettings):
    secret_key: str = "change-me-in-production"
    openai_api_key: str = ""
    database_url: str = "sqlite:///./urban.db"
    upload_dir: str = "uploads"
    commission_rate: float = 0.30  # 30%

    class Config:
        env_file = _env_file_path()
        extra = "ignore"

    @field_validator("openai_api_key", mode="before")
    @classmethod
    def strip_api_key(cls, v):
        return v.strip() if isinstance(v, str) else v


@lru_cache()
def get_settings():
    return Settings()
