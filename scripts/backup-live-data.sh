#!/bin/zsh
# Backs up the live ReLoop data (not the schema) before a database change.
#
# What it saves: every row in the public schema (listings, shop owners,
# submissions, profiles, ...) plus auth.users and auth.identities (the
# accounts, and the link email log-ins need), as one SQL file in
# ~/ReLoop-backups, outside the repo.
#
# The connection string is typed at a hidden prompt, kept only in this shell's
# memory, never written to disk and never printed. pg_dump reads inside a
# read-only snapshot, so this changes nothing on the database.
#
# The backup holds personal data and password hashes. Keep it on this computer;
# never commit, upload or share it.
#
# Usage: zsh scripts/backup-live-data.sh
set -u
setopt pipe_fail

BIN=/opt/homebrew/opt/libpq/bin
BACKUP_DIR="$HOME/ReLoop-backups"
STAMP=$(date +%Y-%m-%d-%H%M%S)
OUT="$BACKUP_DIR/backup-$STAMP.sql"

if [[ ! -x $BIN/pg_dump ]]; then
  echo "pg_dump not found. Install it with: brew install libpq" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
# Never write the backup anywhere git could pick it up.
if git -C "$BACKUP_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Refusing to back up: $BACKUP_DIR is inside a git repository." >&2
  exit 1
fi

printf 'Paste the Postgres connection string (input hidden): '
read -rs PGURL; echo
if [[ -z $PGURL ]]; then
  echo "No connection string given; nothing was backed up." >&2
  exit 1
fi

umask 077
echo "Backing up live data to $OUT ..."
$BIN/pg_dump -d "$PGURL" --data-only --no-owner \
  --table='public.*' --table=auth.users --table=auth.identities \
  -f "$OUT"
dump_status=$?
unset PGURL

if (( dump_status != 0 )); then
  rm -f "$OUT"
  echo "Backup FAILED (pg_dump exit $dump_status). Do not run the fix script until a backup works." >&2
  exit $dump_status
fi

chmod 600 "$OUT"
rows=$(grep -c '^COPY ' "$OUT")
size=$(du -h "$OUT" | cut -f1)
echo "Backup done: $OUT ($size, $rows tables)."
echo "Keep this file private: it contains personal data and password hashes."
