# syntax=docker/dockerfile:1

# ============================================================================
# Yipyy — production image.
#
# Bun resolves and installs (it owns bun.lock); Node 24 builds and serves,
# because Node 24 is what the Vercel project has built this app with for its
# entire life. Bun's value here is the lockfile and install speed, both of which
# are spent in the first stage. Running the build under Node removes a variable
# from a migration that has enough of them.
#
# ── WHY THE BUILD DOES NOT HAPPEN ON THE SERVER ───────────────────────────
#
# `next build` on this repo once SIGKILLed an 8 GB Vercel builder
# (`buildMachineUpgradeReason: "out-of-memory"`), which is why
# `typescript.ignoreBuildErrors` is set and typechecking moved to CI. The target
# VPS has 7.8 GB. So the image is built in GitHub Actions and pulled by the box,
# and the box never compiles anything. That also makes a deploy atomic and a
# rollback a re-tag rather than a rebuild.
#
# ── THE SIX BUILD ARGS ARE NOT OPTIONAL ───────────────────────────────────
#
# `NEXT_PUBLIC_*` values are INLINED by `next build` — they are not read from
# the environment at runtime, so setting them in docker-compose does nothing.
# That also means the image is environment-specific: a staging image and a
# production image are different images and one cannot be promoted to the other.
#
# Worse, `next.config.ts` reads NEXT_PUBLIC_SUPABASE_URL at config-EVALUATION
# time to build `images.remotePatterns`, and swallows its absence (returns
# null). So a build with no environment SUCCEEDS and produces an app where every
# uploaded logo answers 400 with nothing in any log. CI's own `build` job runs
# with no env for exactly this reason — it proves the app compiles, it does NOT
# produce a deployable artifact. The gate below makes that unreachable here.
#
# All six are public by design, so their appearance in `docker history` is not a
# leak. NOTHING else belongs here: SUPABASE_SERVICE_ROLE_KEY, WORKOS_API_KEY,
# the CLOVER_* secrets and CRON_SECRET are runtime-only, and a layer keeps what
# you put in it even after you delete it.
# ============================================================================


# ── deps ────────────────────────────────────────────────────────────────────
# Debian, never Alpine. The runner is glibc, and a node_modules resolved against
# musl carries the wrong `sharp` and the wrong SWC binary.
#
# NOTE ON sharp: bun.lock is platform-INDEPENDENT — it records all 24 of sharp's
# platform packages with their os/cpu constraints and filters at install time,
# so installing here on linux/amd64 resolves `@img/sharp-linux-x64` correctly.
# The trap is not the lockfile. The trap is `COPY . .` dragging a Windows
# node_modules over this one, which `.dockerignore` prevents.
FROM oven/bun:1-debian AS deps
WORKDIR /app

# package.json has "prepare": "husky", and .git is not in the build context.
ENV HUSKY=0

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


# ── builder ─────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_DOMAIN
ARG NEXT_PUBLIC_REALTIME_URL
ARG NEXT_PUBLIC_WORKOS_REDIRECT_URI

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_APP_DOMAIN=${NEXT_PUBLIC_APP_DOMAIN} \
    NEXT_PUBLIC_REALTIME_URL=${NEXT_PUBLIC_REALTIME_URL} \
    NEXT_PUBLIC_WORKOS_REDIRECT_URI=${NEXT_PUBLIC_WORKOS_REDIRECT_URI} \
    BUILD_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=6144

# Fail here, loudly, rather than on a deployed image that looks fine.
# NEXT_PUBLIC_REALTIME_URL is NOT in this list, deliberately: empty is a
# supported and current production state — it selects the BroadcastChannel
# transport in `src/lib/realtime/realtime-client.ts` instead of a WebSocket
# server, and no WebSocket server exists yet. Requiring it would be requiring a
# component that was never built.
RUN node -e "\
const need=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_APP_DOMAIN','NEXT_PUBLIC_WORKOS_REDIRECT_URI'];\
const missing=need.filter(n=>!(process.env[n]||'').trim());\
if(missing.length){console.error('FATAL: missing --build-arg: '+missing.join(', '));process.exit(1)}\
try{new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)}catch{console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL is not a URL. images.remotePatterns would silently omit the Supabase host and every uploaded logo would answer 400.');process.exit(1)}\
console.log('build args OK');"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN node node_modules/next/dist/bin/next build

# `next build` uses Turbopack by default in Next 16 (the `build` script carries
# no --webpack, unlike `dev`). If standalone emission ever stops working under
# it, the build "succeeds" and the runner's COPY fails with a message about a
# missing path that explains nothing. Say what actually happened.
RUN test -d .next/standalone \
 || { echo 'FATAL: next build produced no .next/standalone.'; \
      echo 'Either BUILD_STANDALONE did not reach next.config.ts, or the'; \
      echo 'Turbopack builder did not emit standalone output. Retry with:'; \
      echo '  node node_modules/next/dist/bin/next build --webpack'; exit 1; }


# ── runner ──────────────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runner

# ── WORKDIR IS LOAD-BEARING ───────────────────────────────────────────────
#
# `receipt-image.ts:93` computes FONT_DIR = join(process.cwd(),
# "src/lib/clover/fonts") and assigns it to FONTCONFIG_PATH before importing
# sharp. process.cwd() is wherever `node server.js` was started, which is this
# WORKDIR. /app plus `COPY .next/standalone ./` reproduces exactly the layout
# the Vercel lambda had. Do not "tidy" this to /app/.next/standalone.
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=UTC

# No fontconfig package and no fonts-* package, deliberately. sharp's prebuilt
# libvips statically bundles librsvg, cairo, pango, freetype AND fontconfig, so
# there is nothing to install — and installing a SYSTEM font would defeat the
# tofu probe below by giving librsvg a proportional fallback that renders `iiii`
# and `WWWW` differently. It would pass the test and print a misaligned receipt.

RUN groupadd --system --gid 10001 nodejs \
 && useradd  --system --uid 10001 --gid nodejs \
             --home-dir /app --shell /usr/sbin/nologin nextjs

# standalone FIRST; everything after merges into the same tree.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Neither of these is part of standalone output, and both are load-bearing.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The receipt font, unconditionally rather than trusting the tracing glob to
# keep matching `/api/payments/clover/**`. 58 KB against a Clover Flex printing
# rectangles.
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/clover/fonts ./src/lib/clover/fonts

# sharp is `await import("sharp")` at CALL time, not module load — so a tracer
# that missed it fails at the first receipt render rather than at boot. Copied
# explicitly so that cannot happen.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# fonts.conf declares `<cachedir prefix="default">fontconfig</cachedir>`, and in
# fontconfig `prefix="default"` means RELATIVE TO THE WORKING DIRECTORY — not to
# the config file. So the cache path is /app/fontconfig, which a non-root user
# cannot create. Without this the font cache is rebuilt on every single render.
RUN mkdir -p /app/fontconfig .next/cache \
 && chown -R nextjs:nodejs /app/fontconfig /app/.next

# ── TWO GATES THAT TURN RUNTIME FAILURES INTO BUILD FAILURES ──────────────
COPY docker/font-probe.mjs /tmp/font-probe.mjs
RUN node -e "const s=require('sharp'); if(!s.versions||!s.versions.vips) throw new Error('sharp has no libvips'); console.log('sharp ok — libvips '+s.versions.vips);" \
 && FONTCONFIG_PATH=/app/src/lib/clover/fonts XDG_CACHE_HOME=/tmp \
    node /tmp/font-probe.mjs \
 && rm -f /tmp/font-probe.mjs

USER nextjs:nodejs
EXPOSE 3000

# ── STATUS CODE ONLY, NEVER THE BODY ──────────────────────────────────────
# /api/health answers 200 unconditionally and makes no outbound calls, so a
# Supabase or Clover outage cannot flap this. Its JSON `healthy` field, by
# contrast, goes false on heap pressure or a >100ms fixture read — both routine
# on a 2-vCPU box under load. Gate on that and you have built a restart loop.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=4 \
  CMD ["node","-e","fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node","server.js"]
