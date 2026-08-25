#!/usr/bin/env bash
# ============================================================================
# The one thing on this box that cannot be rebuilt from git.
#
# `caddy_data` holds every issued certificate AND the ACME account key. The app
# is disposable — a fresh box plus `git pull` plus a `docker pull` reproduces it
# in minutes — but this volume is not, and losing it is not merely inconvenient:
#
#   Every facility host would have to be re-issued AT ONCE, against Let's
#   Encrypt's limit of 50 certificates per registered domain per week. Past
#   fifty facilities that is a multi-week outage for the ones at the back of the
#   queue, caused by a disk failure rather than by anything anyone did.
#
# The ACME account key matters separately: re-registering resets the
# per-account rate limits and loses the issuance history.
#
# ── WHAT THIS DOES NOT PROTECT AGAINST ────────────────────────────────────
#
# The box itself. These archives live on the same disk as the thing they back
# up, so they survive `docker volume rm`, a bad upgrade or a corrupted store —
# and not a dead server. Copying them somewhere else needs a destination this
# deployment does not yet have; until it does, that limit is stated rather than
# papered over.
# ============================================================================
set -Eeuo pipefail
umask 077

VOLUME=/var/lib/docker/volumes/yipyy_caddy_data/_data
DEST=/opt/yipyy/backups
KEEP_DAYS=14

[ -d "$VOLUME" ] || {
	echo "FATAL: ${VOLUME} does not exist. Has the compose project been renamed?" >&2
	exit 1
}

mkdir -p "$DEST"
chmod 700 "$DEST"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
ARCHIVE="${DEST}/caddy-data-${STAMP}.tar.gz"

tar -czf "$ARCHIVE" -C "$VOLUME" .
chmod 600 "$ARCHIVE"

# A tar that cannot be listed is not a backup. Verified every time rather than
# on the day it is needed.
#
# ── LISTED ONCE, INTO A VARIABLE, DELIBERATELY ────────────────────────────
#
# `tar -tzf … | grep -q …` looks obvious and is wrong under `set -o pipefail`:
# grep -q exits at the FIRST match, tar takes SIGPIPE and returns non-zero, and
# pipefail reports the pipeline as failed. So a successful match becomes a
# failure and the guard fires on a perfectly good archive — which is exactly
# what it did on its first run, deleting a backup that contained all five
# certificates.
LIST=$(tar -tzf "$ARCHIVE") || {
	echo "FATAL: ${ARCHIVE} is not readable back; removing it." >&2
	rm -f "$ARCHIVE"
	exit 1
}

# The certificate directory must actually be in there. An empty-but-valid
# archive would pass the check above and fail the only time it matters.
if ! printf '%s\n' "$LIST" | grep -q 'certificates/'; then
	echo "FATAL: ${ARCHIVE} contains no certificates/ directory." >&2
	rm -f "$ARCHIVE"
	exit 1
fi

SIZE=$(du -h "$ARCHIVE" | cut -f1)
COUNT=$(printf '%s\n' "$LIST" | grep -c '\.crt$' || true)
echo "backed up ${COUNT} certificate(s), ${SIZE} -> ${ARCHIVE}"

find "$DEST" -name 'caddy-data-*.tar.gz' -mtime "+${KEEP_DAYS}" -delete
echo "kept: $(find "$DEST" -name 'caddy-data-*.tar.gz' | wc -l) archive(s)"
