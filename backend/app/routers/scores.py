from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user, get_optional_user
from ..config import settings
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/api")


def _rank_of(db: Session, user: User) -> int:
    """점수가 더 높은 사용자 수 + 1 (동점은 같은 순위)."""
    higher = db.scalar(
        select(func.count()).select_from(User).where(
            User.nickname.is_not(None), User.best_score > user.best_score
        )
    )
    return int(higher or 0) + 1


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
