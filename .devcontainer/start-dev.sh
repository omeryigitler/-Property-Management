#!/usr/bin/env bash
set -u

cd "$(git rev-parse --show-toplevel)"

if curl -fsS http://127.0.0.1:3000 >/dev/null 2>&1; then
  exit 0
fi

nohup npm run dev > /tmp/property-management-vite.log 2>&1 &

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000 >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

cat /tmp/property-management-vite.log 2>/dev/null || true
exit 1
