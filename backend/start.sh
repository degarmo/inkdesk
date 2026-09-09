#!/usr/bin/env bash
# Render / production start: apply Django migrations, then serve.
# Domain tables (Shop, User, Client, ...) are owned by Prisma in Phase 1.
# This migrate only creates Django system tables and django_shop_auth_token.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
if [ -d "$ROOT/.venv/bin" ]; then
  PATH="$ROOT/.venv/bin:$PATH"
fi
python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn --bind "0.0.0.0:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-2}" --timeout 60 inkdesk.wsgi:application
