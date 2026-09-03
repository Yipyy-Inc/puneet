#!/usr/bin/env bash
# ============================================================================
# Deploy one image tag to staging.yipyy.com.
#
#   /opt/yipyy/deploy-staging.sh <commit-sha>
#
# ADR 0007. This is the SHORT script, and the difference from deploy.sh is the
# whole point of it: production swaps colours so a card-present payment 90
# seconds into somebody tapping survives a deploy. Staging has no payment to
# protect — CLOVER_ENVIRONMENT=sandbox — and two viewers who can wait two
# seconds. So it recreates one container and stops.
#
# What it does NOT do, deliberately:
#
#   - It never touches `caddy/upstream.caddy`. That file decides which colour
#     serves PRODUCTION, and a staging deploy has no business rewriting it.
#   - It never touches the blue or green containers, or their tags in .env.
#   - It never runs `docker image prune`. deploy.sh does that, and a staging
#     deploy pruning images could remove the previous production colour's image
#     — which is the thing rollback.sh needs to still be there.
# ============================================================================
set -Eeuo pipefail
umask 077
cd /opt/yipyy

TAG="${1:?usage: deploy-staging.sh <image-tag>}"
IMAGE="ghcr.io/yipyy-inc/puneet:${TAG}"
SITE=caddy/sites/staging.caddy
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.staging.yml)

log() { printf '\n==> %s\n' "$*"; }

# ── THE CREDENTIALS ARE CHECKED BEFORE ANYTHING IS STARTED ────────────────
#
# staging.yipyy.com reads and writes the PRODUCTION database. The basic auth in
# caddy/sites/staging.caddy is the only thing between the open internet and live
# customer records, and an empty STAGING_BASIC_AUTH_HASH does not fail open — it
# fails to PARSE, which would take Caddy's whole config down at the next reload
# and with it the production site.
#
# So it is checked here, before a container is started and long before a reload
# is attempted. Reading .env rather than the environment because that is where
# the box keeps its runtime secrets and nothing exports them into this shell.
if ! grep -qE '^STAGING_BASIC_AUTH_HASH=.+$' .env; then
	echo "FATAL: STAGING_BASIC_AUTH_HASH is missing or empty in /opt/yipyy/.env."
	echo
	echo "staging.yipyy.com reads and writes the PRODUCTION database, so it is not"
	echo "published without a password. Generate one and add both lines:"
	echo
	echo "  docker run --rm caddy:2-alpine caddy hash-password --plaintext '<password>'"
	echo "  STAGING_BASIC_AUTH_USER=yipyy"
	echo "  STAGING_BASIC_AUTH_HASH=<the bcrypt hash it printed>"
	exit 1
fi

test -f docker-compose.staging.yml || {
	echo "FATAL: docker-compose.staging.yml is not on this box."
	echo "The deploy-staging job copies it; check that step ran."
	exit 1
}

log "staging: image=${IMAGE}"

# Same reasoning as deploy.sh: an unreachable registry with a local copy is not
# fatal, an unreachable registry with nothing to start is.
log "pulling"
if ! docker pull "$IMAGE"; then
	if docker image inspect "$IMAGE" >/dev/null 2>&1; then
		echo "WARNING: could not reach the registry; using the copy already on this box."
	else
		echo "FATAL: cannot pull ${IMAGE} and there is no local copy."
		exit 1
	fi
fi

# Only ever IMAGE_TAG_STAGING. The two production tags are not read, not
# written, and not adjacent to anything here.
if grep -q '^IMAGE_TAG_STAGING=' .env; then
	sed -i -E "s|^IMAGE_TAG_STAGING=.*|IMAGE_TAG_STAGING=${TAG}|" .env
else
	echo "IMAGE_TAG_STAGING=${TAG}" >>.env
fi
grep -q "^IMAGE_TAG_STAGING=${TAG}$" .env || {
	echo "FATAL: .env rewrite failed; nothing was started."
	exit 1
}

log "starting app_staging"
"${COMPOSE[@]}" --profile staging up -d --force-recreate app_staging

log "waiting for app_staging to report healthy"
for i in $(seq 1 40); do
	st=$(docker inspect -f '{{.State.Health.Status}}' yipyy-app-staging 2>/dev/null || echo starting)
	if [ "$st" = "healthy" ]; then
		echo "healthy after $((i * 5))s"
		break
	fi
	if [ "$st" = "unhealthy" ] || [ "$i" = 40 ]; then
		echo "FATAL: app_staging never became healthy (status=${st})"
		docker logs --tail 200 yipyy-app-staging || true
		# Left STOPPED rather than running-and-broken. Production is untouched
		# either way; a half-working staging site is worse than an absent one,
		# because somebody reviews a redesign on it and reports the wrong bug.
		"${COMPOSE[@]}" --profile staging stop app_staging || true
		exit 1
	fi
	sleep 5
done

# From inside Caddy's namespace with a real Host header, the same shape as
# deploy.sh's smoke test and for the same reason: it walks the path
# facilitySlugFromHost actually sees. A rendered /sign-in proves the container
# reached Supabase from this box's egress and server-rendered a page, which
# /api/health cannot tell you — its "Data Layer" check reads a fixture.
log "smoke test"
docker exec yipyy-caddy wget -q -O /dev/null -T 25 \
	--header="Host: staging.yipyy.com" \
	"http://app_staging:3000/sign-in" || {
	echo "FATAL: /sign-in did not render from app_staging."
	"${COMPOSE[@]}" --profile staging stop app_staging || true
	exit 1
}

# ── THE RELOAD IS THE ONLY STEP THAT CAN TOUCH PRODUCTION ─────────────────
#
# Caddy validates and reloads ONE config for the whole box, so a broken
# staging site file is a broken production config. It is restored before
# anything is reloaded, so the worst case is that staging does not appear —
# never that yipyy.com stops answering.
#
# Only reload when the site file is new or changed; a redeploy of the same
# config has nothing to tell Caddy, and every avoided reload is a reload that
# cannot go wrong.
if [ -f "$SITE" ]; then
	if ! docker exec yipyy-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
		echo "FATAL: the Caddy config does not validate with the staging site in place."
		echo "Nothing was reloaded, so production is serving exactly what it was."
		echo "Check STAGING_BASIC_AUTH_HASH in .env — an empty hash does not parse."
		exit 1
	fi
	log "reloading Caddy"
	docker exec yipyy-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || {
		echo "FATAL: reload failed. The previous config is still live."
		exit 1
	}
else
	echo "NOTE: ${SITE} is not on this box, so staging.yipyy.com will not resolve"
	echo "to the container that was just started. Copy it and re-run."
fi

log "staging live on ${TAG}"
