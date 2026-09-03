# 궤도이탈 (Orbital Escape)

중력과 힘의 크기를 조절해 여러 중력장을 통과하며 우주 궤적을 조정하는 3D 시뮬레이션 게임.

## 현재 상태

프론트엔드 3D 프로토타입 (React + TypeScript + Three.js / react-three-fiber). 점수는 `localStorage`에 로컬 최고기록으로 저장된다. 백엔드(FastAPI, 구글 로그인, 랭킹 DB)는 다음 단계에서 추가 예정.

## 실행 방법

```bash
cd frontend
npm install
npm run dev
```

## 조작법

- 방향키 / WASD: 이동 (추력)
- Shift: 부스트 (더 강한 추력, 연료 더 많이 소모)
- 중력장 중심의 고리를 통과해야 성공 — 3회 놓치면 실패
- 운석에 부딪히면 즉시 실패
- 연료가 거의 떨어지면 기름 아이템이 등장 (먹으면 연료 회복 + 질량 증가)

## 배포 (Docker + Cloudflare Tunnel)

`docker-compose.yml`에 프론트엔드(`web`, nginx로 정적 빌드 서빙)와 `cloudflared` 두 서비스가 정의되어 있다. 라즈베리파이(또는 다른 서버)에서 다음 순서로 붙이면 된다.

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

- FastAPI 백엔드: 구글 로그인(닉네임 설정 포함), 점수 제출/랭킹 API, DB 연동
- 라즈베리파이 배포 + Cloudflare Tunnel(`sg.imjemin.co.kr`) 연결
