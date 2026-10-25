from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user, get_optional_user
from ..config import settings
from ..db import get_db
from ..models import Run, User

router = APIRouter(prefix="/api")


def _rank_of(db: Session, user: User) -> int:
    """점수가 더 높은 사용자 수 + 1 (동점은 같은 순위)."""
    higher = db.scalar(
        select(func.count()).select_from(User).where(
            User.nickname.is_not(None), User.best_score > user.best_score
        )
    )
    return int(higher or 0) + 1


@router.post("/runs", response_model=schemas.RunOut)
def start_run(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> schemas.RunOut:
    """게임을 시작할 때 부른다. 이 시각이 점수 검증의 기준이 된다."""
    if user.nickname is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "닉네임을 먼저 설정해주세요.")
    # 끝내지 않은 예전 판은 정리한다 (미리 시작해 두고 시간을 모으는 것을 막는다)
    db.query(Run).filter(Run.user_id == user.id, Run.used.is_(False)).delete()
    run = Run(user_id=user.id)
    db.add(run)
    db.commit()
    return schemas.RunOut(run_id=run.id)


def _elapsed_seconds(run: Run) -> float:
    started = run.started_at
    if started.tzinfo is None:  # SQLite는 시간대 정보를 돌려주지 않는다
        started = started.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - started).total_seconds()


@router.post("/scores", response_model=schemas.ScoreOut)
def submit_score(
    body: schemas.ScoreIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.ScoreOut:
    if user.nickname is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "닉네임을 먼저 설정해주세요.")
    if body.score < 0 or body.score > settings.max_score:
        raise HTTPException(422, "유효하지 않은 점수입니다.")

    run = db.get(Run, body.run_id)
    if run is None or run.user_id != user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "유효하지 않은 판입니다.")
    if run.used:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 기록된 판입니다.")
    run.used = True  # 거절되더라도 한 번 시도한 판은 다시 못 쓴다
    db.add(run)

    # 시작 후 흐른 시간 동안 갈 수 있는 거리보다 큰 점수는 거절한다
    allowed = _elapsed_seconds(run) * settings.max_avg_speed + settings.run_slack_m
    if body.score > allowed:
        db.commit()
        raise HTTPException(422, "플레이 시간에 비해 점수가 너무 높습니다.")

    is_new_best = body.score > user.best_score
    if is_new_best:
        user.best_score = body.score
        user.best_score_at = datetime.now(timezone.utc)
        db.add(user)
    db.commit()
    return schemas.ScoreOut(
        best_score=user.best_score, is_new_best=is_new_best, rank=_rank_of(db, user)
    )


@router.get("/leaderboard", response_model=schemas.LeaderboardOut)
def leaderboard(
    limit: int = Query(20, ge=1, le=100),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> schemas.LeaderboardOut:
    rows = db.scalars(
        select(User)
        .where(User.nickname.is_not(None), User.best_score > 0)
        .order_by(User.best_score.desc(), User.best_score_at.asc(), User.id.asc())
        .limit(limit)
    ).all()

    entries: list[schemas.LeaderboardEntry] = []
    prev_score: int | None = None
    prev_rank = 0
    for index, row in enumerate(rows, start=1):
        rank = prev_rank if row.best_score == prev_score else index
        entries.append(schemas.LeaderboardEntry(rank=rank, nickname=row.nickname or "", score=row.best_score))
        prev_score, prev_rank = row.best_score, rank

    my_rank = _rank_of(db, user) if user and user.nickname and user.best_score > 0 else None
    return schemas.LeaderboardOut(entries=entries, my_rank=my_rank)
