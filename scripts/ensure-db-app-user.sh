#!/usr/bin/env bash
# Ensures the Prisma app DB role exists and can read/write the 4gk database.
# Safe to run on every deploy — fixes the recurring "postgres NOLOGIN" outage.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_USER="${POSTGRES_APP_USER:-fourgk_app}"
APP_PASSWORD="${POSTGRES_APP_PASSWORD:-4gk_app_local}"
VOLUME_NAME="${COMPOSE_PROJECT_NAME:-4gk}_pgdata"

app_user_ok() {
  docker compose exec -T db psql -U "$APP_USER" -d 4gk -c "SELECT 1" >/dev/null 2>&1
}

grant_app_privileges() {
  docker compose exec -T db psql -U postgres -d 4gk -v ON_ERROR_STOP=1 <<SQL
GRANT CONNECT ON DATABASE "4gk" TO ${APP_USER};
GRANT USAGE ON SCHEMA public TO ${APP_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${APP_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${APP_USER};
SQL
}

create_or_reset_app_user_as_postgres() {
  docker compose exec -T db psql -U postgres -d 4gk -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_USER}') THEN
    CREATE ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_PASSWORD}';
  ELSE
    ALTER ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_PASSWORD}';
  END IF;
END
\$\$;
SQL
  grant_app_privileges
}

recover_via_single_user() {
  echo "==> Recovering DB roles via single-user mode"
  docker compose stop app umami 2>/dev/null || true
  docker compose stop db

  local sql_file
  sql_file="$(mktemp)"
  cat >"$sql_file" <<EOF
CREATE ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_PASSWORD}';
ALTER ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';
EOF

  docker compose run --rm -i -u postgres \
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
    db postgres --single -D /var/lib/postgresql/data postgres <"$sql_file" 2>/dev/null || true

  cat >"$sql_file" <<EOF
ALTER ROLE ${APP_USER} WITH LOGIN PASSWORD '${APP_PASSWORD}';
ALTER ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';
EOF

  docker compose run --rm -i -u postgres \
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
    db postgres --single -D /var/lib/postgresql/data postgres <"$sql_file"
  rm -f "$sql_file"

  docker compose up -d db
  for _ in $(seq 1 30); do
    if docker compose exec -T db pg_isready -h localhost -U postgres >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  grant_app_privileges
  docker compose up -d app umami 2>/dev/null || docker compose up -d app
}

if app_user_ok; then
  echo "==> DB app user ${APP_USER} OK"
  exit 0
fi

echo "==> Ensuring DB app user ${APP_USER}"

if docker compose exec -T db psql -U postgres -d 4gk -c "SELECT 1" >/dev/null 2>&1; then
  create_or_reset_app_user_as_postgres
else
  recover_via_single_user
fi

if app_user_ok; then
  echo "==> DB app user ${APP_USER} ready"
else
  echo "ERROR: ${APP_USER} still cannot connect" >&2
  exit 1
fi
