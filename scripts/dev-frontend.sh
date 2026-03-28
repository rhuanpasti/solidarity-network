#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${HOST:-0.0.0.0}"
PORT="${FRONTEND_PORT:-4200}"

cd "$ROOT_DIR"

echo "Starting frontend on http://localhost:${PORT}"
npm --prefix apps/frontend run start -- --host "$HOST" --port "$PORT"
