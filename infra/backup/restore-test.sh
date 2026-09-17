#!/usr/bin/env bash
# Prove a production backup restores, on a throwaway local database. Owner only: it needs the
# private age key, which lives on the owner's Mac and nowhere else.
#
#   infra/backup/restore-test.sh                        latest backup from the production bucket
#   infra/backup/restore-test.sh <file>.dump.age        a file already downloaded
#   infra/backup/restore-test.sh --garder [<file>]      keep the restored database to explore it
#
# Needs Docker, plus the railway CLI when downloading. Nothing else is installed on the Mac:
# aws, age and pg_restore run in containers. The database runs in the SAME image as production
# (TimescaleDB + PostGIS; a plain Postgres refuses the dump), amd64 only, so emulated on Apple
# Silicon. It has no network at all. The bucket credentials are passed by name from `railway run`
# to `docker run`, never on a command line, and never printed. Everything is removed on exit.

set -euo pipefail

PROJECT_ID="0081f1e1-c1bc-4fb5-9f4f-8b599e56aba4"
DB_IMAGE="ghcr.io/railwayapp-templates/timescale-postgis-ssl:pg17-ts2.17"
TOOLS_IMAGE="obiou-sommets-backup-tools"
IDENTITY="${AGE_IDENTITY:-$HOME/.config/obiou-sommets/backup-age.key}"
RAILWAY="${RAILWAY_BIN:-railway}"
here="$(cd "$(dirname "$0")" && pwd)"

keep=""
if [ "${1:-}" = "--garder" ]; then keep=1; shift; fi
source_file="${1:-}"

command -v docker >/dev/null || { echo "✗ docker introuvable" >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "✗ Docker ne répond pas : lancer Docker Desktop ou OrbStack" >&2; exit 1; }
[ -r "$IDENTITY" ] || { echo "✗ clé privée age introuvable : $IDENTITY" >&2; exit 1; }
if [ -n "$source_file" ]; then
  [ -r "$source_file" ] || { echo "✗ fichier introuvable : $source_file" >&2; exit 1; }
else
  command -v "$RAILWAY" >/dev/null || { echo "✗ railway CLI introuvable" >&2; exit 1; }
fi

work="$(mktemp -d)"
db="obiou-restore-test-$$"
cleanup() {
  rm -rf "$work"
  if [ -z "$keep" ]; then docker rm -f -v "$db" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

echo "→ image d'outils (aws, age, pg 17)"
docker build -q -t "$TOOLS_IMAGE" "$here" >/dev/null

if [ -n "$source_file" ]; then
  name="$(basename "$source_file")"
  cp "$source_file" "$work/$name"
else
  echo "→ téléchargement de la dernière sauvegarde de production"
  "$RAILWAY" run --no-local --project "$PROJECT_ID" --service backup --environment production -- \
    docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION -e ENDPOINT -e BUCKET \
      -v "$work:/work" "$TOOLS_IMAGE" sh -euc '
        prefix="backups/postgres"
        latest=$(aws s3 ls --endpoint-url "$ENDPOINT" "s3://$BUCKET/$prefix/" | awk "{print \$4}" | grep "\.dump\.age$" | sort | tail -1)
        [ -n "$latest" ] || { echo "✗ aucune sauvegarde dans le bucket" >&2; exit 1; }
        aws s3 cp --only-show-errors --endpoint-url "$ENDPOINT" "s3://$BUCKET/$prefix/$latest" "/work/$latest"'
  name="$(cd "$work" && ls -- *.dump.age)"
fi
echo "  $name ($(du -h "$work/$name" | cut -f1))"

echo "→ déchiffrement"
docker run --rm -v "$work:/work" -v "$IDENTITY:/key:ro" "$TOOLS_IMAGE" \
  age --decrypt --identity /key --output /work/restore.dump "/work/$name"

echo "→ base jetable, même image que la production (premier lancement : ~900 Mo à télécharger)"
docker run -d --platform linux/amd64 --network none --name "$db" \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD="$(openssl rand -hex 24)" -e POSTGRES_DB=postgres \
  -v "$work:/restore:ro" "$DB_IMAGE" >/dev/null
# The entrypoint answers pg_isready during its temporary init server: wait for the real one.
for _ in $(seq 1 90); do
  if docker logs "$db" 2>&1 | grep -q "init process complete" && docker exec "$db" pg_isready -q -U postgres; then
    ready=1; break
  fi
  sleep 2
done
[ -n "${ready:-}" ] || { echo "✗ la base jetable n'a pas démarré" >&2; docker logs "$db" 2>&1 | tail -20 >&2; exit 1; }

echo "→ restauration (pg_restore --exit-on-error, comme la vérification nocturne)"
docker exec "$db" createdb -U postgres obiou_restore
docker exec "$db" pg_restore -U postgres --no-owner --no-privileges --exit-on-error \
  --dbname=obiou_restore /restore/restore.dump

sql() { docker exec "$db" psql -U postgres -d obiou_restore --no-psqlrc -tA -c "$1"; }
tables=$(sql "select count(*) from information_schema.tables where table_schema = 'public'")
directus=$(sql "select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'directus\_%'")

echo
echo "Extensions : $(sql "select string_agg(extname || ' ' || extversion, ', ' order by extname) from pg_extension")"
echo "Tables non vides (nombre de lignes seulement, aucun contenu affiché) :"
sql "select format('  %-32s %s', table_name, n) from (
       select table_name,
              (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', table_name), false, true, '')))[1]::text::bigint as n
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE') t
     where n > 0 order by table_name"
echo

if [ "$tables" -eq 0 ] || [ "$directus" -eq 0 ]; then
  echo "✗ restauration vide : $tables tables publiques, dont $directus directus_*" >&2
  exit 1
fi
echo "✓ $name restaurée : $tables tables publiques, dont $directus directus_*"

if [ -n "$keep" ]; then
  echo
  echo "Base gardée (sans réseau). Pour l'explorer, puis la supprimer :"
  echo "  docker exec -it $db psql -U postgres -d obiou_restore"
  echo "  docker rm -f -v $db"
fi
