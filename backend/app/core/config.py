from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "LCO Attendance API"
    database_url: str = (
        "postgresql+psycopg://lco:lco_secret@127.0.0.1:5434/lco_attendance"
    )
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,null"
    )

    jwt_secret: str = "lco-dev-jwt-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12

    seed_admin_email: str = "admin@lco.local"
    seed_admin_password: str = "admin123"

    late_cutoff_hour: int = 9
    late_cutoff_minute: int = 0

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in {"development", "dev", "local"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
