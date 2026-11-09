#!/usr/bin/env bash
# Phase 0: confirm the probe DB on a real phone is encrypted at the file level (06 §2, P3).
# Prerequisite: debug build installed, "Run SQLCipher probe" tapped and showing PASS.
# A plaintext SQLite file starts with the 16-byte header "SQLite format 3\0"; SQLCipher's does not.
set -euo pipefail

PKG="org.tara.app"
DB="files/SQLite/tara-probe.db"
PLAIN_HEADER="53514c69746520666f726d6174203300" # "SQLite format 3\0"

HEADER="$(adb exec-out run-as "$PKG" head -c 16 "$DB" | xxd -p | tr -d '\n')"
if [[ -z "$HEADER" ]]; then
  echo "FAIL: $DB not found — run the probe in the app first"; exit 1
fi

adb exec-out run-as "$PKG" rm -f "$DB" "$DB-wal" "$DB-shm" || true

if [[ "$HEADER" == "$PLAIN_HEADER" ]]; then
  echo "FAIL: database file is plaintext SQLite"; exit 1
fi
echo "OK: database file header is not plaintext SQLite (encrypted). Probe file removed."
