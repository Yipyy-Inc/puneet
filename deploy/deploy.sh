#!/usr/bin/env bash
# ============================================================================
# Deploy one image tag to the VPS, without interrupting anybody.
#
#   /opt/yipyy/deploy.sh <commit-sha>
#
#   1. pull the image GitHub Actions built
#   2. start the IDLE colour on it
#   3. wait for its container healthcheck
#   4. prove it with a real request, through Caddy's own network namespace
#   5. rewrite one token in caddy/upstream.caddy and `caddy reload`
#   6. LEAVE THE OLD COLOUR RUNNING
#
# Step 5 is the whole design. `caddy reload` is graceful — in-flight requests
# finish on the old configuration and the process is never restarted — so a
# card-present payment that has been waiting 90 seconds for somebody to tap
# survives a deploy. Nothing here ever sends SIGTERM to a container holding a
# live Clover call.
#
# Step 6 is the rollback. `rollback.sh` flips the token back and reloads: under
# a second, no pull, no image, and it works when GHCR is down.
#
# The box never builds. `next build` once SIGKILLed an 8 GB Vercel builder on
# this repo and this box has 7.8 GB — so the artifact is built on a GitHub
# runner with 16 GB and pulled here.
# ============================================================================
set -Eeuo pipefail
umask 077
cd /opt/yipyy

TAG="${1:?usage: deploy.sh <image-tag>}"
IMAGE="ghcr.io/yipyy-inc/puneet:${TAG}"
UPSTREAM=caddy/upstream.caddy

log() { printf '\n==> %s\n' "$*"; }

# Which colour is serving right now, read from the file that decides it rather
# than from anything that could disagree with it.
CURRENT=$(grep -oE 'reverse_proxy app_(blue|green):3000' "$UPSTREAM" | grep -oE 'app_(blue|green)')
if [ "$CURRENT" = "app_blue" ]; then NEW=green; else NEW=blue; fi
NEWSVC="app_${NEW}"
UPPER=$(printf '%s' "$NEW" | tr '[:lower:]' '[:upper:]')

log "current=${CURRENT}  target=${NEWSVC}  image=${IMAGE}"

# ── A PULL FAILURE IS NOT ALWAYS FATAL ────────────────────────────────────
#
# If the image is already on this box, an unreachable or unauthorised registry
# must not stop the deploy — otherwise the rollback this script advertises
# ("works when GHCR is down") does not, because rolling back re-runs this line.
# A registry problem with NO local copy is still fatal, because there would be
# nothing to start.
log "pulling"
if ! docker pull "$IMAGE"; then
	if docker image inspect "$IMAGE" >/dev/null 2>&1; then
		echo "WARNING: could not reach the registry; using the copy already on this box."
	else
		echo "FATAL: cannot pull ${IMAGE} and there is no local copy."
		echo "If this is an authentication failure, the deploy job logs in to GHCR"
		echo "with a token it mints per run; check that step before adding a PAT here."
		exit 1
	fi
fi

# Only ever touches the IDLE colour's tag, so a failed deploy cannot change what
# is currently serving traffic.
if grep -q "^IMAGE_TAG_${UPPER}=" .env; then
	sed -i -E "s|^IMAGE_TAG_${UPPER}=.*|IMAGE_TAG_${UPPER}=${TAG}|" .env
else
	echo "IMAGE_TAG_${UPPER}=${TAG}" >>.env
fi
grep -q "^IMAGE_TAG_${UPPER}=${TAG}$" .env || {
	echo "FATAL: .env rewrite failed; nothing was swapped."
	exit 1
}

log "starting ${NEWSVC}"
docker compose --profile "$NEW" up -d --force-recreate "$NEWSVC"

log "waiting for ${NEWSVC} to report healthy"
for i in $(seq 1 40); do
	st=$(docker inspect -f '{{.State.Health.Status}}' "yipyy-app-${NEW}" 2>/dev/null || echo starting)
	if [ "$st" = "healthy" ]; then
		echo "healthy after $((i * 5))s"
		break
	fi
	if [ "$st" = "unhealthy" ] || [ "$i" = 40 ]; then
		echo "FATAL: ${NEWSVC} never became healthy (status=${st})"
		docker logs --tail 200 "yipyy-app-${NEW}" || true
		docker compose --profile "$NEW" stop "$NEWSVC" || true
		exit 1
	fi
	sleep 5
done

# ── THE SMOKE TEST THAT PROVES THE MOST ───────────────────────────────────
#
# From inside Caddy's network namespace, with a real Host header, so it walks
# the same path facilitySlugFromHost sees. A branded sign-in page rendering
# means the new container reached Supabase from this box's egress IP and Next
# server-rendered a page — far more than /api/health can tell you, because that
# endpoint's "Data Layer" check reads a TypeScript fixture, not the database.
log "smoke test"
SMOKE_HOST="${SMOKE_HOST:-yipyy.com}"
docker exec yipyy-caddy wget -q -O /dev/null -T 25 \
	--header="Host: ${SMOKE_HOST}" "http://${NEWSVC}:3000/sign-in" || {
	echo "FATAL: /sign-in did not render from ${NEWSVC}; leaving ${CURRENT} serving."
	docker compose --profile "$NEW" stop "$NEWSVC" || true
	exit 1
}

log "pointing Caddy at ${NEWSVC}"
cp "$UPSTREAM" "${UPSTREAM}.prev"
sed -i -E "s|reverse_proxy app_(blue\|green):3000|reverse_proxy ${NEWSVC}:3000|" "$UPSTREAM"

# Validate BEFORE reloading. A bad config on reload leaves the old one running,
# which is safe — but failing here says what is wrong instead of leaving a
# rejected reload to be noticed later.
docker exec yipyy-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || {
	cp "${UPSTREAM}.prev" "$UPSTREAM"
	echo "FATAL: Caddyfile did not validate; reverted, ${CURRENT} still serving."
	exit 1
}

docker exec yipyy-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || {
	cp "${UPSTREAM}.prev" "$UPSTREAM"
	docker exec yipyy-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
	echo "FATAL: reload failed; reverted to ${CURRENT}."
	exit 1
}

log "live on ${NEWSVC} (${TAG}). ${CURRENT} left running — rollback.sh is one reload away."
docker image prune -f --filter 'until=168h' >/dev/null 2>&1 || true
