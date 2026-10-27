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
    # 점수 검증: 한 판의 평균 속도는 이 값을 넘을 수 없다 (게임의 순항 속도 최대는 22 m/s)
    max_avg_speed: float
    run_slack_m: float


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    # science26 은 postgresql:// 형식으로 준다. 드라이버(psycopg 3)를 명시해 둔다
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def load_settings() -> Settings:
    return Settings(
        google_client_id=os.getenv("GOOGLE_CLIENT_ID", "").strip(),
        # 설정하지 않으면 프로세스마다 임의 값 → 재시작 시 로그인 토큰이 무효화됨 (운영에서는 반드시 지정)
        jwt_secret=os.getenv("JWT_SECRET") or secrets.token_urlsafe(32),
        jwt_expire_hours=int(os.getenv("JWT_EXPIRE_HOURS", "168")),
        database_url=_database_url(),
        dev_auth_enabled=_flag("DEV_AUTH_ENABLED", False),
        max_score=int(os.getenv("MAX_SCORE", "1000000")),
        max_avg_speed=float(os.getenv("MAX_AVG_SPEED", "30")),
        run_slack_m=float(os.getenv("RUN_SLACK_M", "60")),
    )


settings = load_settings()
