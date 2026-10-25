from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import create_token, get_current_user, verify_google_credential
from ..config import settings
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/api")


def _user_out(user: User) -> schemas.UserOut:
    return schemas.UserOut(id=user.id, nickname=user.nickname, best_score=user.best_score)


def _get_or_create(db: Session, provider_id: str, email: str | None) -> User:
    user = db.scalar(select(User).where(User.provider_id == provider_id))
    if user is None:
        user = User(provider_id=provider_id, email=email)
        db.add(user)
        db.commit()
    return user


@router.get("/config", response_model=schemas.ConfigOut)
def get_config() -> schemas.ConfigOut:
    return schemas.ConfigOut(
        google_client_id=settings.google_client_id, dev_auth=settings.dev_auth_enabled
    )


@router.post("/auth/google", response_model=schemas.AuthOut)
def login_google(body: schemas.GoogleLoginIn, db: Session = Depends(get_db)) -> schemas.AuthOut:
    claims = verify_google_credential(body.credential)
    user = _get_or_create(db, claims["sub"], claims.get("email"))
    return schemas.AuthOut(token=create_token(user), user=_user_out(user))


@router.post("/auth/dev", response_model=schemas.AuthOut)
def login_dev(body: schemas.DevLoginIn, db: Session = Depends(get_db)) -> schemas.AuthOut:
    """로컬 개발/테스트 전용 로그인. DEV_AUTH_ENABLED=true 일 때만 동작한다."""
    if not settings.dev_auth_enabled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not Found")
    name = body.name.strip()[:32] or "dev"
    user = _get_or_create(db, f"dev:{name}", None)
    return schemas.AuthOut(token=create_token(user), user=_user_out(user))


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(get_current_user)) -> schemas.UserOut:
    return _user_out(user)


@router.put("/me/nickname", response_model=schemas.UserOut)
def set_nickname(
    body: schemas.NicknameIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.UserOut:
    # admin / Admin 처럼 대소문자만 다른 닉네임도 같은 것으로 본다 (사칭 방지)
    taken = db.scalar(
        select(User.id).where(func.lower(User.nickname) == body.nickname.lower(), User.id != user.id)
    )
    if taken is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 사용 중인 닉네임입니다.")
    user.nickname = body.nickname
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 사용 중인 닉네임입니다.")
    return _user_out(user)
