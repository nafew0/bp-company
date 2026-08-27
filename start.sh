#!/usr/bin/env bash
# Start backend + frontend together. Ctrl+C stops both.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo
  echo "Stopping servers..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Starting Django backend on :8000 ..."
(
  cd "$ROOT/backend"
  source venv/bin/activate
  exec python manage.py runserver 8000
) &
BACKEND_PID=$!

sleep 2
echo "Starting Next.js frontend on :3000 ..."
cd "$ROOT/frontend"
npm run dev

cleanup
