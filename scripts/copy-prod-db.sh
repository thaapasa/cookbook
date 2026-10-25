#!/usr/bin/env bash
# Replaces the local dev database with a copy of the production database,
# and sets every user's password to "password".
# Requires Tailscale, so that PROD_DB_URL in .env works.
set -euo pipefail

cd "$(dirname "$0")/.."

# Reads a variable from .env, removing optional surrounding quotes.
env_value() {
  sed -n "s/^$1=//p" .env | tail -n 1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

prod_url="$(env_value PROD_DB_URL)"
dev_url="$(env_value DATABASE_URL)"
if [[ -z "$prod_url" || -z "$dev_url" ]]; then
  echo "PROD_DB_URL and DATABASE_URL must be set in .env" >&2
  exit 1
fi
if [[ "$dev_url" != *@localhost:* && "$dev_url" != *@127.0.0.1:* ]]; then
  echo "DATABASE_URL does not point to localhost, refusing to overwrite it" >&2
  exit 1
fi

# Checks that a database answers, before anything is changed.
check_connection() {
  if ! psql --quiet --no-psqlrc --tuples-only --command='SELECT 1' "$2" >/dev/null; then
    echo "Cannot connect to $1" >&2
    exit 1
  fi
}
echo "Checking database connections"
check_connection "production database (PROD_DB_URL)" "$prod_url"
check_connection "local database (DATABASE_URL)" "$dev_url"

dump_dir="$(mktemp -d)"
trap 'rm -rf "$dump_dir"' EXIT
dump_file="$dump_dir/cookbook.sql"

echo "Dumping production database"
pg_dump --no-owner --no-acl --file="$dump_file" "$prod_url"

echo "Replacing local database"
psql --quiet --set=ON_ERROR_STOP=1 "$dev_url" <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
SQL
psql --quiet --set=ON_ERROR_STOP=1 --file="$dump_file" "$dev_url" >/dev/null

# Argon2id hash of "password", made with src/server/auth/password.ts.
password_hash='$argon2id$v=19$m=65536,t=3,p=4$7iEX1fQFXrE_zAOvG9vHmQ$DftslMFhpBfFMQKQ8iVpYfyonyNoVmnm9bC0GFUrGa4'
psql --quiet --set=ON_ERROR_STOP=1 --set=hash="$password_hash" "$dev_url" <<'SQL'
UPDATE users SET password_hash = :'hash';
SQL

# A fixed integration token, so that other services in local dev can use the
# same token after every copy. The oldest user with an integration token gets
# it. If no user has one, the oldest user gets it.
dev_token='ckb_int_local_dev_token'
token_user="$(psql --quiet --set=ON_ERROR_STOP=1 --no-psqlrc --tuples-only --no-align \
  --set=token="$dev_token" "$dev_url" <<'SQL'
WITH target AS (
  SELECT u.id, u.username FROM users u
  ORDER BY
    EXISTS (SELECT 1 FROM user_tokens t WHERE t.user_id = u.id AND t.kind = 'integration') DESC,
    u.created_at, u.id
  LIMIT 1
), saved AS (
  INSERT INTO user_tokens (user_id, kind, token_hash, last_chars)
  SELECT id, 'integration', sha256(convert_to(:'token', 'UTF8')), right(:'token', 4) FROM target
  ON CONFLICT (user_id, kind) DO UPDATE
  SET token_hash = excluded.token_hash, last_chars = excluded.last_chars, created_at = now()
)
SELECT username FROM target;
SQL
)"

echo "Done. Every user's password is now \"password\"."
if [[ -n "$token_user" ]]; then
  echo "The integration token of $token_user is now $dev_token."
fi
