#!/usr/bin/env bash
# ============================================================================
# What `vercel.json`'s single `crons` entry used to do — but 96 times as often.
#
# Vercel's Hobby plan permits ONE cron per day. That is the whole reason a
# refund issued inside Clover's own dashboard could take up to 24 hours to reach
# the Yipyy booking. Off Vercel the schedule is ours, so it runs every 15
# minutes and the answer is "minutes".
#
# ── WHY THIS IS SAFE AT 96x THE RATE ──────────────────────────────────────
#
# `src/lib/clover/sweep.ts` keys off a `last_swept_at` watermark that is
# deliberately rewound by an overlap before use, and reconciliation is
# gap-based: only the shortfall is ever written. Running it more often examines
# fewer payments each time, not more.
#
# ── TWO DIFFERENCES FROM VERCEL WORTH KNOWING ─────────────────────────────
#
# --resolve pins the hostname to the loopback, so this exercises the real
#   Caddy → app path (TLS, Host header, the proxy) without leaving the box and
#   without depending on DNS. During the parallel run that also guarantees it
#   hits THIS box and not Vercel, which would otherwise sweep the same
#   merchants twice.
#
# --max-time, because `export const maxDuration = 300` in the route is a Vercel
#   routing config read by NOTHING under `next start`. Off Vercel there is no
#   ceiling on a handler at all unless something imposes one.
# ============================================================================
set -Eeuo pipefail

# CRON_SECRET and SWEEP_HOST. Written unquoted — systemd's EnvironmentFile
# parser keeps quotes as part of the value, and a secret with a stray quote
# fails `timingSafeEqual` in a way that looks exactly like a wrong secret.
set -a
# shellcheck disable=SC1091
. /etc/yipyy/cron.env
set +a

: "${CRON_SECRET:?CRON_SECRET is unset; the route answers 503 and the sweep never runs}"
: "${SWEEP_HOST:?SWEEP_HOST is unset (e.g. yipyy.com, or staging.yipyy.com during the parallel run)}"

out=$(curl --silent --show-error --fail-with-body \
	--connect-timeout 10 --max-time 840 \
	--resolve "${SWEEP_HOST}:443:127.0.0.1" \
	--header "Authorization: Bearer ${CRON_SECRET}" \
	"https://${SWEEP_HOST}/api/cron/clover-sweep") || {
	echo "sweep FAILED: ${out}" >&2
	exit 1
}

echo "sweep: ${out}"

# The route answers 200 with a per-facility `problems` array when a merchant is
# revoked or unreachable. A 200 that contains problems is not a success, and a
# permanently green timer is exactly how "the sweep has not actually worked for
# a week" stays invisible.
if printf '%s' "$out" | grep -q '"problems":\[[[:space:]]*{'; then
	echo "sweep completed WITH PROBLEMS — see the payload above" >&2
	exit 2
fi
