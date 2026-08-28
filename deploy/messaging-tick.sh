#!/usr/bin/env bash
# ============================================================================
# Sending what was queued for later.
#
# A rule with a positive `offset_minutes` — "three hours after check-out" —
# writes a fully rendered message to `message_sends` with `scheduled_for` in the
# future and stops. This is the thing that comes back for it. Without this
# timer those rows sit in the outbox for ever, and the Automations screen shows
# a rule that has "sent" something nobody received.
#
# ── EVERY FIVE MINUTES, AND WHY THAT IS NOT WASTEFUL ──────────────────────
#
# The query is one indexed read — `message_sends (scheduled_for) where status =
# 'queued'` — and on an empty outbox it returns nothing and exits. The delay a
# facility configures is a floor, not a promise: a message due at 14:00 going
# out at 14:04 is fine, where one going out twice is not.
#
# ── OVERLAP IS SAFE, WHICH IS WHY THE TIMER DOES NOT GUARD AGAINST IT ─────
#
# Each message is claimed with a conditional `queued -> sending` update that
# reports the rows it actually changed, so two ticks cannot both take the same
# row. Asserted in supabase/tests/messaging-tick.sql, because the guarantee is a
# property of the UPDATE rather than of the code calling it.
#
# Same shape as clover-sweep.sh, deliberately: --resolve pins the hostname to
# the loopback so this exercises the real Caddy → app path without leaving the
# box, and --max-time because `maxDuration` in the route is a Vercel config that
# nothing reads under `next start`.
# ============================================================================
set -Eeuo pipefail

# CRON_SECRET and SWEEP_HOST, shared with the sweep. Unquoted — systemd's
# EnvironmentFile parser keeps quotes as part of the value.
set -a
# shellcheck disable=SC1091
. /etc/yipyy/cron.env
set +a

: "${CRON_SECRET:?CRON_SECRET is unset; the route answers 503 and nothing is sent}"
: "${SWEEP_HOST:?SWEEP_HOST is unset (e.g. yipyy.com)}"

out=$(curl --silent --show-error --fail-with-body \
	--connect-timeout 10 --max-time 280 \
	--resolve "${SWEEP_HOST}:443:127.0.0.1" \
	--header "Authorization: Bearer ${CRON_SECRET}" \
	"https://${SWEEP_HOST}/api/cron/messaging-tick") || {
	echo "messaging tick FAILED: ${out}" >&2
	exit 1
}

echo "messaging tick: ${out}"

# A tick reporting `failed` sent nothing to somebody who was owed a message.
# `skipped` is NOT a problem — it is the suppression list working — and the two
# must not look the same from outside, or an outage hides behind unsubscribes.
if printf '%s' "$out" | grep -qE '"failed":[1-9]'; then
	echo "messaging tick completed WITH FAILURES — see the payload above" >&2
	exit 2
fi
