#!/usr/bin/env bash
# Stop all Sterling E-Wallet microservices started by run-all.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d logs ]; then
  echo "No logs directory found; nothing to stop."
  exit 0
fi

for pidfile in logs/*.pid; do
  [ -e "$pidfile" ] || continue
  pid=$(cat "$pidfile")
  if kill -0 "$pid" 2>/dev/null; then
    echo "[stop-all] Killing $(basename "$pidfile" .pid) (PID=$pid)"
    kill "$pid" || true
  fi
  rm -f "$pidfile"
done
