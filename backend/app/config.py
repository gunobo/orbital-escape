import os
import secrets
from dataclasses import dataclass


def _flag(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    google_client_id: str
    jwt_secret: str
    jwt_expire_hours: int
    database_url: str
    dev_auth_enabled: bool
    max_score: int


def load_settings() -> Settings:
    return Settings(
        google_client_id=os.getenv("GOOGLE_CLIENT_ID", "").strip(),
        # 설정하지 않으면 프로세스마다 임의 값 → 재시작 시 로그인 토큰이 무효화됨 (운영에서는 반드시 지정)
        jwt_secret=os.getenv("JWT_SECRET") or secrets.token_urlsafe(32),
        jwt_expire_hours=int(os.getenv("JWT_EXPIRE_HOURS", "168")),
        database_url=os.getenv("DATABASE_URL", "sqlite:///./app.db"),
        dev_auth_enabled=_flag("DEV_AUTH_ENABLED", False),
        max_score=int(os.getenv("MAX_SCORE", "1000000")),
    )


settings = load_settings()
