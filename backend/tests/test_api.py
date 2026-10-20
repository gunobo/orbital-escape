from app.routers import auth as auth_router

from .conftest import login


def test_config_exposes_client_id(client):
    body = client.get("/api/config").json()
    assert body == {"google_client_id": "test-client-id", "dev_auth": True}


def test_google_login_creates_user_once(client, monkeypatch):
    monkeypatch.setattr(
        auth_router, "verify_google_credential", lambda cred: {"sub": "g-123", "email": "a@b.c"}
    )
    first = client.post("/api/auth/google", json={"credential": "x"}).json()
    second = client.post("/api/auth/google", json={"credential": "x"}).json()
    assert first["user"]["id"] == second["user"]["id"]
    assert first["user"]["nickname"] is None


def test_invalid_google_token_rejected(client):
    res = client.post("/api/auth/google", json={"credential": "not-a-token"})
    assert res.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_nickname_validation_and_uniqueness(client):
    a = login(client, "a")
    b = login(client, "b")
    assert client.put("/api/me/nickname", json={"nickname": "x"}, headers=a).status_code == 422
    assert client.put("/api/me/nickname", json={"nickname": "bad name!"}, headers=a).status_code == 422
    assert client.put("/api/me/nickname", json={"nickname": "우주인"}, headers=a).status_code == 200
    assert client.put("/api/me/nickname", json={"nickname": "우주인"}, headers=b).status_code == 409
    # 본인이 같은 닉네임으로 다시 저장하는 것은 허용
    assert client.put("/api/me/nickname", json={"nickname": "우주인"}, headers=a).status_code == 200


def test_score_requires_nickname(client):
    h = login(client, "nonick")
    assert client.post("/api/scores", json={"score": 10}, headers=h).status_code == 400


def test_score_keeps_best_only_and_rejects_invalid(client):
    h = login(client, "p1", "pilot1")
    assert client.post("/api/scores", json={"score": 120}, headers=h).json()["is_new_best"] is True
    low = client.post("/api/scores", json={"score": 50}, headers=h).json()
    assert low == {"best_score": 120, "is_new_best": False, "rank": 1}
    assert client.post("/api/scores", json={"score": -1}, headers=h).status_code == 422
    assert client.post("/api/scores", json={"score": 10**9}, headers=h).status_code == 422
    assert client.post("/api/scores", json={"score": 1}).status_code == 401


def test_leaderboard_order_ties_and_my_rank(client):
    a = login(client, "a", "alpha")
    b = login(client, "b", "bravo")
    c = login(client, "c", "charlie")
    client.post("/api/scores", json={"score": 300}, headers=a)
    client.post("/api/scores", json={"score": 500}, headers=b)
    client.post("/api/scores", json={"score": 300}, headers=c)

    board = client.get("/api/leaderboard", headers=c).json()
    assert [(e["rank"], e["nickname"]) for e in board["entries"]] == [
        (1, "bravo"),
        (2, "alpha"),  # 먼저 달성한 사람이 앞
        (2, "charlie"),  # 동점은 같은 순위
    ]
    assert board["my_rank"] == 2
    assert client.get("/api/leaderboard").json()["my_rank"] is None
    assert len(client.get("/api/leaderboard?limit=1").json()["entries"]) == 1
