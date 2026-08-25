# 0006 — A self-hosted VPS replaces Vercel

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** Product owner, AI operating harness
- **Affects:** deployment, TLS, the facility-subdomain automation, the Clover
  reconciliation schedule, and `src/lib/vercel/domains.ts` (deleted)

## Context

Yipyy ran on a Vercel **Hobby** plan while taking **live Clover card payments**.
Each of the following is a fact about that plan rather than an opinion about it:

- **Hobby forbids commercial use.** The platform was charging real cards.
- **Cron is limited to once per day**, so a refund issued in Clover's own
  dashboard could take up to 24 hours to reach the Yipyy booking. The sweep
  exists precisely because Clover documents no delivery guarantee for webhooks.
- **A project is capped at 50 domains**, and every facility consumes one.
- **Deployments happen on push**, so CI reported _after_ customers already had
  the code. The four required checks were a post-mortem, not a gate.
- On 2026-08-24 the plan produced **six hours of silent non-deployment** —
  fourteen commits, every gate green, no deployment record at all, because a
  `vercel.json` cron expression is rejected before any build exists.

The last one is the one that decided it. A platform whose failure mode is _no
artifact and no error_ cannot be reasoned about from inside the repository.

## Decision

Run the application on a single Ubuntu 24.04 VPS: Docker, Caddy terminating TLS,
the Next.js standalone build in a container image built by GitHub Actions.

**Postgres stays on Supabase.** The VPS holds no data. RLS remains the
authorisation boundary, the 53 SQL test files keep passing unchanged, and a box
that dies is rebuilt from `git` rather than restored from a backup. Moving the
database while live cards were running would have been unpaid risk.

**TLS is issued on demand, not registered in advance.** This is the part that
made the whole move affordable.

## The thing everyone worried about, and why it got smaller

The stated fear was losing the facility-subdomain automation. It turned out to
be three separate things, only one of which was Vercel's:

|                 | Before                                             | After                       |
| --------------- | -------------------------------------------------- | --------------------------- |
| DNS             | one wildcard `CNAME *` at the registrar            | one wildcard `A *`          |
| **TLS**         | **`POST /v10/projects/{id}/domains` per facility** | **issued on first request** |
| Host → facility | `src/lib/facility-host.ts`, a pure function        | unchanged                   |

`src/lib/vercel/domains.ts` existed for exactly one reason: Vercel will not
issue a certificate for `*.yipyy.com` without holding the nameservers, so each
host had to be registered individually. Behind Caddy the certificate issues
itself, authorised by `/api/internal/tls-ask`, which reuses
`facilitySlugFromHost()` — including its 37 reserved labels — and then the
`facility_branding_by_slug` SECURITY DEFINER lookup. An unauthenticated path
needs no service-role key.

376 lines, three API-route consumers and three environment variables became
~40 lines of gate. **The automation did not survive by being ported. It stopped
being needed.**

That gate is not optional. DNS points every conceivable `*.yipyy.com` name at
the box, so without it anyone opening TLS connections with random SNIs would
exhaust Let's Encrypt's 50 certificates per registered domain per week and lock
out real facilities for seven days. Verified in production: `pawradise` and
`doggieville-mtl` get certificates; `nonsense12345.yipyy.com` is refused at the
handshake.

It also gained a capability Vercel could not offer: any hostname the endpoint
approves gets a certificate, so a facility bringing its **own** domain is a DNS
change on their side and a database row on ours.

## Consequences

**Better:**

- The Clover sweep runs **every 15 minutes** instead of once a day.
- **CI gates the deploy.** The image is built only after typecheck, lint,
  format, checks, sql and build pass. The inversion of what Vercel did.
- **Blue/green deploys**: the idle colour starts, is health-checked and proved
  with a real request, then Caddy is reloaded onto it — gracefully, so a
  card-present payment 90 seconds into waiting for a tap is not interrupted.
  Rollback is one reload, under a second, because the old colour keeps running.
- No 50-domain cap, no `maxDuration` ceiling, no commercial-use violation.
- Measured 9 ms to Supabase from the box — the same region Vercel's `iad1` used.

**Worse, and accepted:**

- **One box.** If Hostinger loses it, the site is down until it is rebuilt
  (~30 minutes, everything is in git). Vercel absorbed that.
- **Nothing watched it.** Addressed by a scheduled uptime check, with its limits
  written down: GitHub's cron is best-effort and this is not a monitoring
  service.
- **`caddy_data` is now stateful** — every certificate and the ACME account key.
  Backed up daily and verified by restore, but the archives are on the same disk
  as the volume they protect.
- **`maxDuration` exports are dead code** off Vercel. Nothing bounds a handler
  now except Caddy's `response_header_timeout`, set deliberately at 180s, above
  `terminal.ts`'s own 150s budget.

## What this decision did NOT settle

**No card payment has been taken on this infrastructure**, and no receipt has
been printed on a physical Clover Flex. The sweep proves the merchant token and
Clover's API work from the box; it does not prove a charge, a refund, or a
webhook arriving. Until somebody does both, CUJ-16, CUJ-17 and CUJ-18 are
unverified here, and this ADR should not be read as claiming otherwise.

## Alternatives considered

**Vercel Pro.** Fixes the licence and the cron ceiling, not the 50-domain cap or
the per-facility certificate registration, and leaves deployment as a
post-mortem. It buys permission to keep the architecture, not a better one.

**A wildcard certificate via DNS-01.** Would remove the per-host issuance
entirely, and needs the nameservers. Moving them means recreating eleven zone
records, three of which (`send` MX, `send` SPF, `resend._domainkey` DKIM) carry
every WorkOS password-reset and verification email — and get those wrong and
nothing breaks visibly, mail just lands in spam. On-demand TLS achieves the same
outcome without touching the zone. Revisit only if facility creation ever
approaches 50 per week.

**Moving Postgres too.** Rejected. It converts a hosting change into a data
migration, and the RLS policies are the authorisation boundary.
