#!/usr/bin/env bash
# 로컬 Postgres 로 마이그레이션과 권한 테스트를 실행한다. (사용: bash scripts/test-rls.sh)
set -euo pipefail
DB=toki_rls_test
cd "$(dirname "$0")/.."
su postgres -c "dropdb --if-exists $DB && createdb $DB" 2>/dev/null || { dropdb --if-exists $DB; createdb $DB; }
run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q $DB" < "$1" || psql -v ON_ERROR_STOP=1 -q "$DB" < "$1"; }
run tests/rls_stub.sql; run supabase/migrations/0001_init.sql; run tests/rls_test.sql
