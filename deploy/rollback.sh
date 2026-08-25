#!/usr/bin/env bash
# ============================================================================
# Go back to the previous colour. Under a second.
#
#   /opt/yipyy/rollback.sh
#
# No pull, no image, no GHCR — the previous container is still running, because
# deploy.sh deliberately leaves it there. That is the entire reason ~600 MB of
# idle memory is spent: the only rollback speed that matters when the thing
# being rolled back moves money is "immediately".
#
# If the other colour is NOT healthy there is nothing to roll back to, and this
# refuses rather than pointing traffic at something broken. Use
# `deploy.sh <previous-sha>` in that case — slower, but it verifies.
# ============================================================================
set -Eeuo pipefail
cd /opt/yipyy

UPSTREAM=caddy/upstream.caddy

CURRENT=$(grep -oE 'reverse_proxy app_(blue|green):3000' "$UPSTREAM" | grep -oE 'app_(blue|green)')
if [ "$CURRENT" = "app_blue" ]; then OTHER=app_green; else OTHER=app_blue; fi
NAME="yipyy-${OTHER//_/-}"

st=$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo missing)
if [ "$st" != "healthy" ]; then
	echo "FATAL: ${OTHER} is ${st}, not healthy — there is nothing to roll back to."
	echo "Use: /opt/yipyy/deploy.sh <previous-sha>"
	exit 1
fi

sed -i -E "s|reverse_proxy app_(blue\|green):3000|reverse_proxy ${OTHER}:3000|" "$UPSTREAM"
docker exec yipyy-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

echo "rolled back: ${CURRENT} -> ${OTHER}"
