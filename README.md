# 궤도이탈 (Orbital Escape)

중력과 힘의 크기를 조절해 여러 중력장을 통과하며 우주 궤적을 조정하는 3D 시뮬레이션 게임.

## 현재 상태

"하면서 배우는" 과학 게임이다. 기획서(docs)의 학습 목표 — 자유낙하 vs 수평투사, 만유인력, 작용-반작용, 에너지 보존과 손실 — 를 게임 규칙으로 만들고, 화면에 눈에 보이게(힘 화살표·물리 패널·비교 실험) 했으며, 판이 끝나면 이번 판의 숫자로 만든 복습 퀴즈를 낸다. 물리를 점검한 내용은 [docs/prototype-check.md](docs/prototype-check.md) 참고.

- **frontend/**: React + TypeScript + Three.js(react-three-fiber) 3D 게임
- **backend/**: FastAPI + SQLAlchemy(SQLite) — 구글 로그인, 닉네임 설정, 점수 제출, 랭킹 API
- 비로그인 상태에서도 플레이 가능하며 최고기록은 `localStorage`에 저장된다. 로그인(+닉네임 설정)하면 게임오버 시 점수가 서버로 전송되어 랭킹에 반영된다. (유저당 최고 기록만 유지)

## 로컬 실행

```bash
./scripts/dev.sh          # 백엔드(8000) + 프론트(5173)를 한 번에 켠다 (Ctrl+C로 같이 종료)
```

브라우저에서 http://localhost:5173 을 연다. 처음엔 가상환경·패키지를 자동으로 설치한다. 로컬 테스트용 임시 로그인(DEV_AUTH_ENABLED)이 켜져 있어서 구글 설정 없이도 로그인/랭킹을 확인할 수 있다.

따로 켜고 싶다면:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # (처음 한 번)
cd backend && DEV_AUTH_ENABLED=true .venv/bin/uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

테스트: `cd backend && .venv/bin/python -m pytest` · `cd frontend && npm test`

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

| | |
|---|---|
| 🖱 **마우스 조종(기본)** | 화면의 고리를 마우스로 가리키면 우주선이 그쪽으로 날아간다 (엔진 힘 한계·연료 소모는 그대로) |
| ⌨ 키보드 조종 | 방향키/WASD로 직접 가속, Shift는 부스트 (M키로 마우스/키보드 전환) |
| 시점 전환 | C 또는 1~5: 추적 · 높은 추적 · 위에서 · 옆에서(포물선/자유낙하 관찰) · 1인칭 |
| 일시정지 | Space / P / Esc (창을 벗어나면 자동 일시정지, 재개 시 카운트다운) |
| 물리 패널·힘 화살표 | H |
| 관성 제어(자동 제동) | Z: 끄면 힘이 없을 때 속도가 그대로 유지되고 에너지가 보존된다 |

규칙: 중력장 한가운데의 고리를 통과하면 성공, 놓치면 **목숨(❤️ 3개) -1**, 0개가 되거나 운석에 부딪히면 종료. 연료가 줄면 기름 아이템이 나타나고, 먹으면 연료와 함께 질량이 는다. 점수는 이동 거리(m).

## 과학 개념 ↔ 게임 장치

| 개념 | 게임에서 보이는 곳 |
|---|---|
| 만유인력 F = GMm/r² | 중력 화살표(보라), 물리 패널의 F–r 그래프에서 점이 곡선을 따라 움직임 |
| 작용-반작용 | 보라(내가 받는 힘)·주황(행성이 받는 힘) 화살표 길이가 같음, 가속도는 질량비 반대로 |
| 자유낙하 vs 수평투사 | 운석은 수직 등가속도(g)·수평 등속. 시작 화면 비교 실험, '옆에서' 시점 |
| F = ma, 질량 변화 | 질량 = 본체 + 연료. 기름을 먹으면 무거워져 같은 엔진 힘의 가속도가 줄어듦 |
| 에너지 보존과 손실 | 물리 패널의 운동E·위치E·합, 제동(관성 제어) 손실 누적 |
| 관성 | Z로 관성 제어를 끄고 속도 유지 확인 |

## 밸런스 조정

게임 로직은 렌더링과 분리된 순수 함수(`frontend/src/systems/simulation.ts`)라서 헤드리스로 돌릴 수 있다. 봇(`bot.ts`)이 수백 판을 플레이해 난이도를 수치로 보여준다.

```bash
cd frontend
npm test                          # 시뮬레이션 단위 테스트
VITE_RUNS=200 npm run balance     # 봇 밸런스 리포트 (생존 거리, 사망 원인, 연료/질량)
```

조정 가능한 값은 모두 [frontend/src/constants/physics.ts](frontend/src/constants/physics.ts)에 있다 (추력, 연료 소모/보충, 질량 증가, 게이트 크기, 중력 세기·난이도 상승폭, 운석 밀도 등).

현재 값 기준 결과 (기본 운석 속도 3/2, 150판, 생존 거리 중앙값): 가만히 있기 ≈ 340m · 초보 봇 ≈ 1,170m · 보통 봇 ≈ 2,200m · 숙련 봇 ≈ 2,600m. 봇은 키보드 가속으로 날고 마우스 조종은 쓰지 않으므로, 사람이 마우스로 하면 더 쉽다. 봇은 사람의 *상대적인* 난이도 차이를 보기 위한 근사치이며 절대 기준은 아니다.

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
- [docs/prototype-check.md](docs/prototype-check.md) — 기획서 7번 "프로토타입 실행 후 점검" (과학적 정확성 점검과 수정 내용)

## 다음 단계

- 라즈베리파이 배포 + Cloudflare Tunnel(`sg.imjemin.co.kr`) 연결 및 실제 구글 클라이언트 ID로 로그인 확인
- 점수 부정 제출 방지(서버 측 플레이 검증 등), 게임 밸런스 조정
