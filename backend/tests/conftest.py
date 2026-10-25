import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["DEV_AUTH_ENABLED"] = "true"
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
os.environ["JWT_SECRET"] = "test-secret-test-secret-test-secret-0123"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:  # lifespan → create_all
        yield c


def login(client: TestClient, name: str, nickname: str | None = None) -> dict[str, str]:
    res = client.post("/api/auth/dev", json={"name": name})
    assert res.status_code == 200
    headers = {"Authorization": f"Bearer {res.json()['token']}"}
    if nickname:
        assert client.put("/api/me/nickname", json={"nickname": nickname}, headers=headers).status_code == 200
    return headers


def play_run(client: TestClient, headers: dict[str, str], age_seconds: float = 0) -> int:
    """판을 시작하고, 시작 시각을 age_seconds 초 전으로 돌려 "그만큼 플레이한 것"으로 만든다."""
    from datetime import datetime, timedelta, timezone

    from app.db import SessionLocal
    from app.models import Run

    res = client.post("/api/runs", headers=headers)
    assert res.status_code == 200, res.text
    run_id = res.json()["run_id"]
    if age_seconds:
        with SessionLocal() as db:
            run = db.get(Run, run_id)
            run.started_at = datetime.now(timezone.utc) - timedelta(seconds=age_seconds)
            db.commit()
    return run_id


def submit(client: TestClient, headers: dict[str, str], score: int, age_seconds: float = 1000):
    """판 하나를 시작해서 점수를 제출한다 (기본: 1000초 플레이한 판)."""
    run_id = play_run(client, headers, age_seconds)
    return client.post("/api/scores", json={"score": score, "run_id": run_id}, headers=headers)
