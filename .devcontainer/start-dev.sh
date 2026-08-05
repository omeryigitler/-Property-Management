#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="/tmp/property-management-workspace.log"
PID_FILE="/tmp/property-management-workspace.pid"
PORT="3000"

cd "$ROOT_DIR"

echo "[Property Management] Starting workspace..."

if [[ ! -x "node_modules/.bin/vite" ]]; then
  echo "[Property Management] Installing dependencies..."
  npm install
fi

if command -v lsof >/dev/null 2>&1; then
  LISTENERS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$LISTENERS" ]]; then
    echo "$LISTENERS" | xargs -r kill 2>/dev/null || true
    sleep 1
    LISTENERS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$LISTENERS" ]]; then
      echo "$LISTENERS" | xargs -r kill -9 2>/dev/null || true
    fi
  fi
elif command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]]; then
    kill "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

rm -f "$LOG_FILE"
nohup npm run dev >"$LOG_FILE" 2>&1 </dev/null &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

for _ in $(seq 1 60); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi

  if curl --max-time 3 -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    BROWSE_URL=""

    if command -v gh >/dev/null 2>&1 && [[ -n "${CODESPACE_NAME:-}" ]]; then
      gh codespace ports visibility "${PORT}:public" -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
      BROWSE_URL="$(
        gh codespace ports -c "$CODESPACE_NAME" --json sourcePort,browseUrl \
          --jq ".[] | select(.sourcePort == ${PORT}) | .browseUrl" 2>/dev/null | head -n 1 || true
      )"
    fi

    if [[ -z "$BROWSE_URL" && -n "${CODESPACE_NAME:-}" ]]; then
      BROWSE_URL="https://${CODESPACE_NAME}-${PORT}.app.github.dev"
    fi

    echo "[Property Management] Workspace ready: http://localhost:${PORT}"
    if [[ -n "$BROWSE_URL" ]]; then
      echo "[Property Management] Open: ${BROWSE_URL}"
      if command -v code >/dev/null 2>&1; then
        code --open-url "$BROWSE_URL" >/dev/null 2>&1 || true
      fi
    fi
    exit 0
  fi

  sleep 1
done

echo "[Property Management] Workspace server could not start."
echo "---------------- Server log ----------------"
cat "$LOG_FILE" 2>/dev/null || true
echo "--------------------------------------------"
exit 1
