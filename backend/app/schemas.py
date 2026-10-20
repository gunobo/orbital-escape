import re

from pydantic import BaseModel, field_validator

NICKNAME_PATTERN = re.compile(r"^[0-9A-Za-z가-힣_\-]{2,12}$")


class GoogleLoginIn(BaseModel):
    credential: str


class DevLoginIn(BaseModel):
    name: str


class NicknameIn(BaseModel):
    nickname: str

    @field_validator("nickname")
    @classmethod
    def _valid(cls, v: str) -> str:
        v = v.strip()
        if not NICKNAME_PATTERN.match(v):
            raise ValueError("닉네임은 2~12자의 한글/영문/숫자/_/- 만 사용할 수 있습니다.")
        return v


class ScoreIn(BaseModel):
    score: int


class UserOut(BaseModel):
    id: int
    nickname: str | None
    best_score: int


class AuthOut(BaseModel):
    token: str
    user: UserOut


class ConfigOut(BaseModel):
    google_client_id: str
    dev_auth: bool


class LeaderboardEntry(BaseModel):
    rank: int
    nickname: str
    score: int


class LeaderboardOut(BaseModel):
    entries: list[LeaderboardEntry]
    my_rank: int | None = None


class ScoreOut(BaseModel):
    best_score: int
    is_new_best: bool
    rank: int
