#!/usr/bin/env bash
# 백엔드(8000)와 프론트(5173)를 한 번에 켠다. 종료는 Ctrl+C (두 서버가 같이 꺼진다).
#   ./scripts/dev.sh
# 로컬 테스트용 임시 로그인(DEV_AUTH_ENABLED)이 켜진 상태로 실행된다.
set -euo pipefail
cd "$(dirname "$0")/.."

busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
for port in 8000 5173; do
  if busy "$port"; then
    echo "포트 $port 를 이미 다른 프로그램이 쓰고 있어요. 먼저 끄고 다시 실행하세요:  lsof -nP -iTCP:$port -sTCP:LISTEN" >&2
    exit 1
  fi
done

if [ ! -x backend/.venv/bin/uvicorn ]; then
  echo "▶ 백엔드 가상환경 만드는 중 (처음 한 번만)"
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
if [ ! -d frontend/node_modules ]; then
  echo "▶ 프론트 패키지 설치 중 (처음 한 번만)"
  (cd frontend && npm install)
fi

echo "▶ 백엔드 시작: http://localhost:8000  (개발용 로그인 켜짐)"
(cd backend && DEV_AUTH_ENABLED=true .venv/bin/uvicorn app.main:app --port 8000) &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

# 백엔드가 뜰 때까지 기다린다
for _ in $(seq 1 30); do
  curl -fsS http://localhost:8000/api/health >/dev/null 2>&1 && break
  sleep 0.5
done
curl -fsS http://localhost:8000/api/health >/dev/null 2>&1 || { echo "백엔드가 시작되지 않았어요." >&2; exit 1; }

echo "▶ 프론트 시작: http://localhost:5173"
cd frontend && npm run dev
