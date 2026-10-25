"""공격자 관점 테스트: 이 API가 이상한 요청이나 부정행위에 어떻게 반응하는지 확인한다."""
from .conftest import login, play_run, submit


def test_cannot_claim_a_huge_score_without_playing(client):
    h = login(client, "cheater", "cheater1")
    res = submit(client, h, 900_000, age_seconds=5)  # 5초 플레이했다고 90만 점?
    assert res.status_code == 422
    # 방금 시작한 판으로도 막힌다 (30 m/s * 시간 + 여유분)
    run = play_run(client, h)
    assert client.post("/api/scores", json={"score": 500, "run_id": run}, headers=h).status_code == 422
    assert client.get("/api/leaderboard").json()["entries"] == []


def test_a_believable_score_for_the_time_played_is_accepted(client):
    h = login(client, "honest", "honest1")
    # 100초 플레이 -> 평균 22 m/s 로 2,200 m 는 가능하다
    assert submit(client, h, 2200, age_seconds=100).status_code == 200
    # 같은 시간에 4,000 m 는 불가능하다
    assert submit(client, h, 4000, age_seconds=100).status_code == 422


def test_a_run_can_only_be_used_once(client):
    h = login(client, "reuse", "reuser")
    run = play_run(client, h, 1000)
    assert client.post("/api/scores", json={"score": 100, "run_id": run}, headers=h).status_code == 200
    assert client.post("/api/scores", json={"score": 100, "run_id": run}, headers=h).status_code == 409


def test_a_rejected_run_cannot_be_retried_with_a_lower_guess(client):
    h = login(client, "probe", "prober")
    run = play_run(client, h, 10)
    assert client.post("/api/scores", json={"score": 99999, "run_id": run}, headers=h).status_code == 422
    assert client.post("/api/scores", json={"score": 100, "run_id": run}, headers=h).status_code == 409


def test_cannot_use_someone_elses_run(client):
    a = login(client, "a", "alpha")
    b = login(client, "b", "bravo")
    run = play_run(client, a, 1000)
    assert client.post("/api/scores", json={"score": 100, "run_id": run}, headers=b).status_code == 400
    assert client.post("/api/scores", json={"score": 100, "run_id": 99999}, headers=b).status_code == 400


def test_banking_time_by_starting_runs_early_does_not_work(client):
    h = login(client, "banker", "banker1")
    old = play_run(client, h, 3600)  # 1시간 전에 시작해 둔 판
    new = play_run(client, h)  # 새 판을 시작하면 예전 판은 사라진다 (SQLite는 같은 번호를 재사용할 수도 있다)
    for run_id in {old, new}:
        res = client.post("/api/scores", json={"score": 50000, "run_id": run_id}, headers=h)
        assert res.status_code in (400, 422), (run_id, res.status_code)  # 어느 쪽이든 받아들여지지 않는다
    assert client.get("/api/leaderboard").json()["entries"] == []


def test_nicknames_differing_only_by_case_are_the_same(client):
    a = login(client, "a")
    b = login(client, "b")
    assert client.put("/api/me/nickname", json={"nickname": "admin"}, headers=a).status_code == 200
    assert client.put("/api/me/nickname", json={"nickname": "Admin"}, headers=b).status_code == 409
    assert client.put("/api/me/nickname", json={"nickname": "ADMIN"}, headers=b).status_code == 409
    # 본인이 대소문자만 바꾸는 것은 허용
    assert client.put("/api/me/nickname", json={"nickname": "Admin"}, headers=a).status_code == 200


def test_garbage_inputs_never_cause_server_errors(client):
    h = login(client, "fuzz", "fuzzer")
    run = play_run(client, h, 1000)
    bad_scores = [None, "abc", 1.5, [], {}, -1, 10**30, "１２"]
    for score in bad_scores:
        res = client.post("/api/scores", json={"score": score, "run_id": run}, headers=h)
        assert res.status_code in (200, 400, 409, 422), (score, res.status_code)
    for run_id in [None, "x", -1, 0, 10**30, 1.5]:
        res = client.post("/api/scores", json={"score": 10, "run_id": run_id}, headers=h)
        assert res.status_code in (400, 409, 422), (run_id, res.status_code)
    bad_nicks = ["", " ", "a", "x" * 500, "<script>alert(1)</script>", "'; DROP TABLE users;--", "\u0000nick", "닉네임🔥", None, 123]
    for nick in bad_nicks:
        res = client.put("/api/me/nickname", json={"nickname": nick}, headers=h)
        assert res.status_code in (200, 409, 422), (nick, res.status_code)
    for path in ["/api/leaderboard?limit=0", "/api/leaderboard?limit=-5", "/api/leaderboard?limit=abc", "/api/leaderboard?limit=999999"]:
        assert client.get(path).status_code in (200, 422), path
    assert client.post("/api/auth/dev", json={}).status_code == 422
    assert client.post("/api/auth/google", json={"credential": "x" * 100_000}).status_code in (401, 422)
