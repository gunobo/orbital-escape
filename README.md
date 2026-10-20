# 궤도이탈 (Orbital Escape)

중력과 힘의 크기를 조절해 여러 중력장을 통과하며 우주 궤적을 조정하는 3D 시뮬레이션 게임.

## 현재 상태

- **frontend/**: React + TypeScript + Three.js(react-three-fiber) 3D 게임
- **backend/**: FastAPI + SQLAlchemy(SQLite) — 구글 로그인, 닉네임 설정, 점수 제출, 랭킹 API
- 비로그인 상태에서도 플레이 가능하며 최고기록은 `localStorage`에 저장된다. 로그인(+닉네임 설정)하면 게임오버 시 점수가 서버로 전송되어 랭킹에 반영된다. (유저당 최고 기록만 유지)

## 로컬 실행

```bash
# 1) 백엔드 (http://localhost:8000) — 로컬 테스트용 임시 로그인 켜기
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
DEV_AUTH_ENABLED=true .venv/bin/uvicorn app.main:app --reload --port 8000

# 2) 프론트엔드 (http://localhost:5173, /api 는 8000으로 프록시됨)
cd frontend
npm install
npm run dev
```

백엔드 테스트: `cd backend && .venv/bin/python -m pytest`

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/config` | 프론트가 쓰는 설정 (구글 클라이언트 ID, 개발 로그인 여부) |
| POST | `/api/auth/google` | 구글 ID 토큰 검증 → 서비스용 JWT 발급 (최초 로그인 시 유저 생성) |
| GET | `/api/me` | 내 정보 |
| PUT | `/api/me/nickname` | 닉네임 설정 (2~12자, 중복 불가) |
| POST | `/api/scores` | 점수 제출 (최고 기록만 갱신, 닉네임 필수) |
| GET | `/api/leaderboard?limit=` | 랭킹 (동점은 같은 순위, 먼저 달성한 사람이 앞) |

> 주의: 점수는 클라이언트가 보고하는 값이라 서버가 플레이를 검증하지는 못한다. 현재는 범위 검사(0~1,000,000)만 한다.

## 조작법

- 방향키 / WASD: 이동 (추력)
- Shift: 부스트 (더 강한 추력, 연료 더 많이 소모)
- 중력장 중심의 고리를 통과해야 성공 — 3회 놓치면 실패
- 운석에 부딪히면 즉시 실패
- 연료가 거의 떨어지면 기름 아이템이 등장 (먹으면 연료 회복 + 질량 증가)

## 배포 (Docker + Cloudflare Tunnel)

`docker-compose.yml`에 `backend`(FastAPI, SQLite는 `./data`에 저장), `web`(nginx: 정적 빌드 서빙 + `/api` 프록시), `cloudflared` 세 서비스가 정의되어 있다. 라즈베리파이(arm64)에서도 그대로 빌드된다.

**0. 환경변수 준비**: `.env.example`을 `.env`로 복사하고 채운다.
- `GOOGLE_CLIENT_ID`: Google Cloud Console의 OAuth 클라이언트 ID(웹). **승인된 JavaScript 원본**에 `https://sg.imjemin.co.kr`를 추가해야 한다. (ID 토큰 방식이라 리디렉션 URI는 필요 없음)
- `JWT_SECRET`: `openssl rand -hex 32` 등으로 생성한 긴 비밀키
- `DEV_AUTH_ENABLED`: 운영에서는 반드시 `false`

아래 터널 설정은 그다음 순서로 진행한다.

1. **터널 생성 및 DNS 연결** (Cloudflare 계정에 로그인된 아무 기기에서 한 번만):
   ```bash
   cloudflared tunnel login          # 아직 로그인 안 했다면
   cloudflared tunnel create orbital-escape
   cloudflared tunnel route dns orbital-escape sg.imjemin.co.kr
   ```
   위 명령이 `~/.cloudflared/<TUNNEL_ID>.json` 자격 증명 파일을 만든다.

2. **설정 파일 준비**: 이 저장소의 `cloudflared/config.yml.example`을 `cloudflared/config.yml`로 복사하고 `<TUNNEL_ID>`를 실제 터널 ID로 교체한다. 1번에서 생성된 `<TUNNEL_ID>.json` 파일도 `cloudflared/` 폴더에 함께 넣는다. (`config.yml`과 `*.json`은 `.gitignore`에 등록되어 있어 저장소에는 올라가지 않는다 — 서버에 직접 복사해야 한다.)

3. **실행** (실제 서비스를 구동할 라즈베리파이 등에서):
   ```bash
   docker compose up -d --build
   ```
   `web` 컨테이너가 게임을 서빙하고, `cloudflared` 컨테이너가 `sg.imjemin.co.kr` → `web` 컨테이너로 트래픽을 터널링한다.

## 문서

- [docs/prompt.md](docs/prompt.md) — 게임 기획 스펙
- [docs/subsentence1.md](docs/subsentence1.md) — 과학 개념 → 게임 메커니즘 변환표

## 다음 단계

- 라즈베리파이 배포 + Cloudflare Tunnel(`sg.imjemin.co.kr`) 연결 및 실제 구글 클라이언트 ID로 로그인 확인
- 점수 부정 제출 방지(서버 측 플레이 검증 등), 게임 밸런스 조정
