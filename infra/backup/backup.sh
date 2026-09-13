#!/bin/sh
# Obiou Sommets — daily Postgres backup.
#
#   1. pg_dump (custom format) over Railway's private network;
#   2. restore the dump into a scratch database and count tables: a dump that
#      does not restore is not a backup;
#   3. encrypt with age to a PUBLIC key (the private key never lives on Railway);
#   4. upload to the bucket, then keep only the newest $RETENTION_COUNT files.
#
# Any failure exits non-zero, which shows as a failed cron run in Railway.

set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AGE_RECIPIENT:?AGE_RECIPIENT (age public key) is required}"
: "${BUCKET:?BUCKET is required}"
: "${ENDPOINT:?ENDPOINT is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
RETENTION_COUNT="${RETENTION_COUNT:-30}"
PREFIX="backups/postgres"
SCRATCH_DB="obiou_restore_check"

case "$DATABASE_URL" in
  *.railway.internal*) ;;
  *)
    echo "✗ refusing to run: DATABASE_URL must use Railway's private network (*.railway.internal)" >&2
    exit 1
    ;;
esac

stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
workdir=$(mktemp -d)
dump="$workdir/obiou-sommets-$stamp.dump"
trap 'rm -rf "$workdir"' EXIT

# Same server, other database: swap the path segment of the URL.
scratch_url=$(printf '%s' "$DATABASE_URL" | sed -E "s#^(postgres(ql)?://[^/]+)/[^?]*#\1/$SCRATCH_DB#")

echo "→ dumping"
pg_dump --format=custom --no-owner --no-privileges --file="$dump" "$DATABASE_URL"
size=$(du -h "$dump" | cut -f1)

echo "→ verifying the dump restores ($size)"
psql --quiet --no-psqlrc -v ON_ERROR_STOP=1 "$DATABASE_URL" \
  -c "drop database if exists $SCRATCH_DB" -c "create database $SCRATCH_DB"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$scratch_url" "$dump"
tables=$(psql --no-psqlrc -tA "$scratch_url" -c "select count(*) from information_schema.tables where table_schema = 'public'")
psql --quiet --no-psqlrc -v ON_ERROR_STOP=1 "$DATABASE_URL" -c "drop database $SCRATCH_DB"

echo "→ encrypting and uploading"
age --recipient "$AGE_RECIPIENT" --output "$dump.age" "$dump"
aws s3 cp --only-show-errors --endpoint-url "$ENDPOINT" "$dump.age" "s3://$BUCKET/$PREFIX/$(basename "$dump").age"

echo "→ applying retention (keep $RETENTION_COUNT)"
aws s3 ls --endpoint-url "$ENDPOINT" "s3://$BUCKET/$PREFIX/" \
  | awk '{print $4}' | grep '\.dump\.age$' | sort \
  | awk -v keep="$RETENTION_COUNT" '{ lines[NR] = $0 } END { for (i = 1; i <= NR - keep; i++) print lines[i] }' \
  | while read -r old; do
      aws s3 rm --only-show-errors --endpoint-url "$ENDPOINT" "s3://$BUCKET/$PREFIX/$old"
    done

echo "✓ backup uploaded and verified restorable: $(basename "$dump").age ($size, $tables tables)"
