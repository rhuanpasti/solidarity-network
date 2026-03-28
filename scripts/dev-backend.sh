#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PREPARE_DB=0

for arg in "$@"; do
  case "$arg" in
    --prepare-db)
      PREPARE_DB=1
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./scripts/dev-backend.sh [--prepare-db]" >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

if [[ ! -f apps/backend/.env ]]; then
  cp apps/backend/.env.example apps/backend/.env
  echo "Created apps/backend/.env from .env.example"
fi

echo "Generating Prisma client"
npm --prefix apps/backend run prisma:generate

if [[ "$PREPARE_DB" -eq 1 ]]; then
  echo "Applying database migrations"
  npx --prefix apps/backend prisma migrate deploy

  echo "Running database seed"
  npm --prefix apps/backend run prisma:seed
fi

echo "Starting backend on http://localhost:3000"
npm --prefix apps/backend run start:dev
