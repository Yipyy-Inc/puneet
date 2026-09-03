# 0007 — Staging precedes production, and the redesign gets its own branch

- **Status:** Accepted
- **Date:** 2026-09-03
- **Deciders:** Product owner (with the client), AI operating harness
- **Supersedes nothing.** It adds a second deployment target to
  [0006](0006-self-hosted-vps-replaces-vercel.md) and one named exception to CLAUDE.md's
  "push straight to `main`".
- **Design system:** [docs/design-system/](../../design-system/) — the thing being staged.

## Context

The platform is being redesigned onto the design system imported on 2026-09-03. The product
owner has agreed with the client that the redesign is reviewed on `staging.yipyy.com` first,
and reaches `yipyy.com` only once the client is happy with it.

Two things about the existing pipeline make that not automatic.

**A push to `main` deploys to production.** Since 2026-08-25 the `image` job builds a container
once typecheck, lint, format, unit, checks, sql and build have passed, and `deploy` SSHes to the
VPS and swaps colours. So redesign commits on `main` would reach customers one at a time, which
is the opposite of what was agreed.

**And production is live.** It takes card payments through Clover and sends real messages. It
cannot be frozen at a pinned sha for the length of a redesign, because a hotfix would then
promote whatever redesign work happened to be sitting on `main` beside it.

Two questions were put to the product owner on 2026-09-03 and answered:

1. **How does the redesign reach production — screen by screen, or in one cutover?**
   → **One cutover at the end.** Staging accumulates the whole redesign; the client reviews it
   there screen by screen; production takes it in a single deploy once the set is signed off.
   This is what [WORK_ORDER.md](../../design-system/WORK_ORDER.md) already assumes: stage 1
   replaces `:root` outright, and a scoped `[data-yy="v2"]` theme — which per-screen promotion
   would have required — is not built.
2. **What database does staging read and write?** → **The production Postgres.** One image, one
   set of `NEXT_PUBLIC_*` build args, and what the client approves is the artifact that ships.
   The alternative — a second Supabase project — was rejected because the Supabase URL and
   publishable key are inlined by `next build`, so it would mean a second image per commit and
   a seed to maintain.

## Decision

### The redesign gets its own branch, and staging deploys from it

```
redesign  ──────────────────────────────────────→ staging.yipyy.com   (auto, every push)
main      ──[hotfix]──[hotfix]───────────────────→ yipyy.com          (auto, unchanged)
                                      ↑
                          merge main → redesign, often

                                                  ← the cutover is one merge, redesign → main
```

Product work and hotfixes keep going straight to `main` and keep reaching production the same
day, exactly as CLAUDE.md says. Design work goes to `redesign`. **The cutover is the merge**, and
it is the only moment production's appearance changes.

`main` is merged **into** `redesign` regularly rather than the reverse. A redesign branch that
sits still for two months against a moving product is a merge nobody wants to do; one that
absorbs `main` every few days is a series of small ones. The two rarely touch the same lines —
`main` moves logic and routes, `redesign` moves presentation.

**What this costs, stated plainly:** the artifact promoted at cutover is built from the merge
commit, not from the image the client approved on staging. Same source, not the same bytes. That
property was the reason for sharing the production database, and a long-lived branch takes half
of it back. The trade is accepted: hotfixes reaching production unimpeded is worth more.

### staging.yipyy.com is a third container on the same box

Not a second VPS. The box already runs two app colours behind one Caddy, and the marginal cost of
a third container is memory rather than money.

- **A named Caddy site block**, not the catch-all. Named means the certificate is obtained at
  startup, which is what makes this work at all: `/api/internal/tls-ask` allows only the apex,
  `www`, `app.`, `hq.` and hostnames that resolve to a real facility, so `staging.yipyy.com`
  reaching the on-demand path would be refused and the TLS handshake would fail. Naming the site
  sidesteps that route entirely and it needs no change.
- **No blue/green.** Staging may be down for two seconds during a deploy. There is no card
  mid-tap to protect, so `deploy-staging.sh` recreates one container and is done.
- **Capped at 1200m with a 900 MB heap**, against production's 2600m per colour. The box has
  7.8 GB and both colours stay resident so a rollback is one reload; staging has two viewers.
- **`staging` was already a reserved subdomain label** in `src/lib/facility-host.ts` and in
  Postgres (`facilities_slug_not_reserved`), so no facility can ever hold the name and the
  hostname cannot collide with a tenant. `resolveHost` returns `{ audience: "staff", slug: null }`
  for it — the same answer it gives `app.yipyy.com` — so `/` opens the portal rather than the
  marketing page, with no routing change.
- **DNS needs nothing.** The wildcard `*.yipyy.com` record already resolves `staging.yipyy.com`
  to the box; verified against a public resolver on 2026-09-03.

### What is different inside the staging container

Runtime environment only — the image is identical to production's. These are set in the compose
service's own `environment:` block and **never in `.env`**, which both colours share: a
`YIPYY_DEPLOYMENT=staging` that leaked into `.env` would stop production sending anything.

|                               |                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `YIPYY_DEPLOYMENT=staging`    | What every guard below reads. Unset means production                                               |
| `CLOVER_ENVIRONMENT=sandbox`  | No real card can be charged. The code already refuses to mix sandbox and live credentials          |
| `STAGING_SUPPRESS_SENDS=true` | Outbound email, SMS and calls are recorded and not dispatched. Switchable, per the reasoning below |
| Basic auth, at Caddy          | It is a real login page on a real domain. `X-Robots-Tag: noindex` too                              |
| A banner in the root layout   | Host-independent, read from `YIPYY_DEPLOYMENT`, so it cannot be switched off by a redesign         |

## Consequences

### Staging writes to the production database, and that is the point of the guards

This was chosen knowingly. The specific consequences:

**Every write on staging is a production write.** A redesigned check-in checks a real dog in. A
redesigned cancel button cancels a real booking. There is no undo, and the banner exists so that
nobody is surprised by it.

**A sandbox Clover payment still writes to the live money tables.** `CLOVER_ENVIRONMENT=sandbox`
means no card is charged. It does not mean no row is written.

**A message queued from staging would be sent for real, by production.**
[deploy/messaging-tick.sh](../../../deploy/messaging-tick.sh) is a systemd timer on the box that
polls `message_sends` every five minutes and dispatches what is due. It reads the shared table and
has no idea which host queued the row. Staging installs no timer of its own, which changes
nothing — production's timer would send it.

That last one is why `STAGING_SUPPRESS_SENDS` exists and defaults to on. It is a switch rather
than a hard rule because the alternative — making staging read-only — was considered and
rejected: the client has to be able to walk a journey, not just look at a screenshot. Turn it off
deliberately, for a review that needs to see a message actually arrive, and turn it back on.

**Its coverage is not total, and the gap is named rather than implied.** The guard sits at every
Resend call site, the Twilio SMS and voice paths, and `dispatchEvent`, so nothing enters the
shared outbox from staging. It does not sit on anything a future call site adds. A new sender that
does not consult `outboundSendsSuppressed()` will send from staging, and no test will say so.

### The e2e suite still runs against production, not staging

Nothing here changes that. `tests/e2e/_fixtures.ts` treats an `E2E_BASE_URL` on localhost as a
local run, and CI's suite runs against its own built server. Pointing the suite at staging would
mean it and the client competing for the same rows in the same database.

### Reverting is one merge and one variable

If the redesign is abandoned, `redesign` is deleted and nothing on `main` ever knew about it. If
staging is no longer wanted, `DEPLOY_STAGING_ENABLED` goes to `false`, the container stops, and
the Caddy block is removed — production is untouched throughout, because it never shared anything
with staging but the database and the box.
