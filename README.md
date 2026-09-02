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

## 문서

- [docs/prompt.md](docs/prompt.md) — 게임 기획 스펙
- [docs/subsentence1.md](docs/subsentence1.md) — 과학 개념 → 게임 메커니즘 변환표

## 다음 단계

- FastAPI 백엔드: 구글 로그인(닉네임 설정 포함), 점수 제출/랭킹 API, DB 연동
- 라즈베리파이 배포 + Cloudflare Tunnel(`sg.imjemin.co.kr`) 연결
