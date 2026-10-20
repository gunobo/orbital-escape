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
