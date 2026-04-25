#!/usr/bin/env bash
set -euo pipefail

# Ensure schema is up to date at each deploy/start.
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
