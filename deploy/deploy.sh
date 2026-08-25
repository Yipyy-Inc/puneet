#!/usr/bin/env bash
# ============================================================================
# Deploy one image tag to the VPS. Run by the `deploy` job over SSH.
#
#   /opt/yipyy/deploy.sh <commit-sha>
#
# The box does not build. It pulls an image GitHub Actions already built with
# the six NEXT_PUBLIC_* values baked in, which is why a rollback is
#
#   /opt/yipyy/deploy.sh <previous-sha>
#
# and takes as long as a pull, not as long as a compile.
#
# ── WHAT THIS DOES NOT DO YET ─────────────────────────────────────────────
#
# It recreates the single app container rather than swapping between two. That
# means a short gap, bounded below by how fast Node starts. `stop_grace_period`
# is 200s in the compose file, so a card-present payment already in flight is
# allowed to FINISH rather than being severed — but a request arriving during
# the gap gets a 502 from Caddy.
#
# That is acceptable for the staging host and for the first facility. It is NOT
# acceptable once every facility is behind the apex, and blue/green — two app
# services, one Caddy, swapped with `caddy reload` — is required before the
# final DNS flip. Written down here rather than discovered then.
# ============================================================================
set -Eeuo pipefail
umask 077
cd /opt/yipyy

TAG="${1:?usage: deploy.sh <image-tag>}"
IMAGE="ghcr.io/yipyy-inc/puneet:${TAG}"

log() { printf '\n==> %s\n' "$*"; }

PREVIOUS=$(grep -m1 '^IMAGE_TAG=' .env | cut -d= -f2- || echo "")
log "current=${PREVIOUS:-none}  target=${TAG}"

log "pulling ${IMAGE}"
docker pull "$IMAGE"

# Written before the swap so a failure can put it back.
sed -i -E "s|^IMAGE_TAG=.*|IMAGE_TAG=${TAG}|" .env
grep -q "^IMAGE_TAG=${TAG}$" .env || {
	echo "FATAL: .env rewrite failed; nothing was swapped."
	exit 1
}

revert() {
	if [ -n "$PREVIOUS" ]; then
		log "reverting to ${PREVIOUS}"
		sed -i -E "s|^IMAGE_TAG=.*|IMAGE_TAG=${PREVIOUS}|" .env
		docker compose up -d app || true
	fi
}

log "starting the new container"
docker compose up -d app || {
	revert
	echo "FATAL: the new container would not start."
	exit 1
}

log "waiting for the healthcheck"
for i in $(seq 1 40); do
	st=$(docker inspect -f '{{.State.Health.Status}}' yipyy-app 2>/dev/null || echo starting)
	if [ "$st" = healthy ]; then
		echo "healthy after $((i * 5))s"
		break
	fi
	if [ "$st" = unhealthy ] || [ "$i" = 40 ]; then
		echo "FATAL: never became healthy (status=${st})"
		docker logs --tail 200 yipyy-app || true
		revert
		exit 1
	fi
	sleep 5
done

# ── THE SMOKE TEST THAT PROVES THE MOST ───────────────────────────────────
#
# Through Caddy's own network namespace, with a real Host header, so it walks
# the same path `facilitySlugFromHost` sees. /sign-in rendering means the
# container reached Supabase from this box's egress IP and Next server-rendered
# a page — far more than /api/health can tell you, because that endpoint's
# "Data Layer" check reads a TypeScript fixture rather than the database.
log "smoke test"
docker exec yipyy-caddy wget -q -O /dev/null -T 20 \
	--header="Host: ${SMOKE_HOST:-yipyy.com}" \
	"http://app:3000/sign-in" || {
	echo "FATAL: /sign-in did not render from the new container."
	revert
	exit 1
}

log "live on ${TAG}"
docker image prune -f --filter 'until=168h' >/dev/null 2>&1 || true
