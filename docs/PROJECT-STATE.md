# Project state — 2026-08-31

A handoff written because the machine is changing and the session history will
not survive it. Read [AGENTS.md](../AGENTS.md) first for how to work here; this
file is only what a new session cannot reconstruct from the code.

Everything below was checked against the repository or the live database on the
date above. Where something is unverified, it says so — that is a fact about the
advice, and the next person is entitled to it.

---

## 1. Set the machine up first, or nothing here works

**`.env.local` is not in git and must be carried across by hand.** It is
gitignored on purpose: it holds production WorkOS credentials, the Supabase
service-role key, a direct Postgres URL and live Clover keys. Without it,
`bun run test:sql` cannot connect and every verification script below fails.
Move it over a channel you trust; do not paste it into a chat, an issue, or a
prompt.

It must contain at least `SUPABASE_DB_URL` (a DIRECT Postgres connection
string, not the pooler), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
and the WorkOS block.

Then: `bun install`, `gh auth login`, and confirm with
`bun run typecheck && bun run test:sql`.

**Use bun, never npm/yarn/pnpm.**

---

## 2. The two facts that shape every decision here

**The database is shared and it is production.** There is one Postgres. CI
writes to it, the deployed site reads it, and so does any script you run
locally. A test that leaves rows behind is a bug in the shared environment, not
a mess on your machine. Every verification script in this project cleans up in
`finally` and asserts the remaining count is zero.

**You cannot sign in locally.** `.env.local` carries PRODUCTION WorkOS keys, and
the `@yipyy.dev` development accounts do not authenticate against them. So no
signed-in screen can be opened on a dev machine. Do not "fix" this by editing
the credentials.

The consequence runs through everything below: most of this product has been
verified at the database and API layer, and looked at in a browser only where a
page needs no session.

---

## 3. How to verify something without a browser

This is the most useful thing in this document. It was worked out the hard way
and it found five real bugs that typecheck and lint were happy with.

Server modules import `server-only`, which throws outside Next. Stub it — and
because the `@/` alias only resolves inside the repo, the script must live in
`scripts/`:

```ts
// scripts/tmp-preload.ts
import { plugin } from "bun";
plugin({
  name: "stub-server-only",
  setup(b) {
    b.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
```

```ts
// scripts/tmp-whatever.ts — real server code, real database
import { SQL } from "bun";
import { createClient } from "@supabase/supabase-js";
import { theFunctionUnderTest } from "@/lib/...";

const db = new SQL(process.env.SUPABASE_DB_URL!); // direct Postgres
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
); // PostgREST, service role

try {
  /* seed with FIXED uuids, exercise, assert */
} finally {
  /* delete, then assert the remaining count is 0 and PRINT it */
}
```

Run it, then delete it:

```
set -a; . ./.env.local; set +a
bun --preload ./scripts/tmp-preload.ts scripts/tmp-whatever.ts
rm -f scripts/tmp-*.ts
```

**Always pair a positive control with the negative one.** "It refused" proves
nothing on its own — run the same code with only the condition under test
changed, and watch the verdict change with it. Every bug in section 6 was found
this way, and one of them was found because the HEALTHY case failed, not the
broken one.

**Never use a real-looking address in a fixture.** See section 7.

---

## 4. Where the Reputation Booster stands

The source of truth for intent is the v2 spec in `docs/working files/` — 44
numbered findings across data defects, compliance risks, config conflicts and
gaps.

### Real, tested, deployed

A check-out emits `check_out` (all four services do); the scheduler writes a
`review_requests` row and queues a message on the existing outbox; the client
opens `/review/<token>` on their own phone; the response lands in Postgres; a
rating at or below the threshold opens an escalation with a business-hours SLA
clock in the same transaction; moderation publishes to a public page at
`/<facilitySlug>/reviews`; every metric carries its denominator.

Also real: incidents (`public.incidents`, with `review_escalations.incident_id`),
the inbound Twilio STOP webhook, the send-time booking-health re-check, and
manual send (`POST /api/reputation/requests`) with an override that gets past
the cooldown and the negative pause and nothing else.

Compliance deletions are live: review gating is gone from the type, the stored
payload and the branch that read it; Yelp cannot be made solicitable (a database
CHECK, not a UI convention); the platform badges implying we could hide a Google
review are gone. `bun run check:no-review-gating` keeps it that way.

### Not done

- **The loop has never run.** Production holds **0 requests, 0 responses, 0
  escalations**. The seeded rule is `enabled = false` on `yipyy-demo-facility`
  and exists on no other facility. Everything above is proven by SQL tests and
  scripts, never by a real check-out producing a real message.
- **G-01, the report-card review widget.** Blocked on report cards actually
  sending — `/api/report-cards/[id]/send` only flips `delivery_status`.
- **Apology credit.** No `store_credit` write exists in any reputation route.
- **The analytics report is not registered** in the reports hub, so the metrics
  have no route of their own.
- **G-03, SMS reply 1–5.** Genuinely blocked: `src/lib/messaging/send.ts` uses
  ONE platform Twilio number shared by every facility, so an inbound "5" cannot
  be attributed to a facility. Needs per-facility sending numbers first
  (`communication_connections` exists and is empty).
- **Google Business Profile sync.** No Google credentials exist anywhere in this
  repo — not in `.env.local`, not in `.env.example`. Anything built would ship
  having never authenticated. This is an open decision, not an oversight.
- **The Ask-for-a-review dialog has never been rendered.** It is typechecked and
  its route is proven end to end, but nobody has looked at the screen.

### The last fixture standing

`src/data/reputation.ts` (829 lines) survives for exactly ONE import:
`reputationSettings` in
`src/components/customer/report-cards/report-card-rating.tsx`. Nothing else in
the product reads it, and that widget is the G-01 surface above.

The whole localStorage half — the 30-second tick, the trigger engine, a
duplicate template system, and a generator that pushed fixture escalation tasks
onto the live staff task board — was deleted on 2026-08-30: 1,900 lines, eight
files.

---

## 5. Open decisions that need a human

1. **Google Business Profile** — build it env-gated and clearly marked as never
   having authenticated, or leave the honest manual path
   (`review_channels.public_rating` with `rating_source='manual'`) until
   credentials exist? Recommendation: leave it.
2. **A reversed check-out still gets asked for a review.** Undo sets
   `checked_out_at = null`, but the event has already fired and neither `status`
   nor `payment_status` changes, so nothing stops the send — and because the
   dedupe key is per booking, the LATER genuine check-out emits nothing at all.
   The fix is a judgement about what a reopen means and it changes boarding and
   daycare equally. In the debt map, deliberately not chosen.

---

## 6. Traps found the hard way (each cost real time)

- **`bookings.payment_status` is derived from `payments` by trigger.** Writing
  it directly is silently discarded — inserted as `paid`, updated to `refunded`,
  it reads back `pending`, with no error and no warning. Write payment rows.
- **Client screens hold a numeric `ref`, never the uuid.** `rowToClient` maps
  `id: row.ref`. An API that asks the UI for a uuid is asking for something it
  has never had.
- **An eligibility rung re-run after its own row exists will find itself.** The
  send-time guard suppressed every request for `cooldown` because the recency
  query returned the request it was deciding about. Hence `excludeRequestId`.
- **"A refusal is still a row" collides with the one-row-per-visit index.** A
  refused manual send writes a suppressed row, so the override retry hit 23505
  and told the person the client had already been asked. An override now revives
  that row instead of inserting beside it.
- **`bookings.assigned_staff_id` references `staff(id)`**, despite being
  DECLARED against `facility_memberships` in 20260801120000 — it was repointed
  in 20260801150000. Reading the declaration is how a tip trigger nearly shipped
  attributing every tip to nobody.
- **`revoke ... from public` is not `revoke ... from anon`.** You almost always
  need both. `anon` still holds a dangling SELECT grant on `public.clients` —
  not exploitable (RLS is on, no anon policy, an anon session reads zero rows,
  measured by running the count AS the role) but one permissive policy away from
  being open. Wants its own migration and a table-level sweep;
  `rpc-session-required.sql` does that for FUNCTIONS and the table equivalent
  does not exist.
- **PostgREST cannot embed `message_sends`** — `source_id` has no FK and
  deliberately never will, because a rule, a workflow and a review request all
  live in that one column. Two queries and a merge.

[docs/quality/debt-map.md](quality/debt-map.md) is the canonical list. Add there
rather than here, and include the measurement that established the claim.

---

## 7. Something that actually happened, and the rule it earned

On 2026-08-29 a review-request email was **really delivered** to
`david.park@gmail.com` — a seeded demo client at `yipyy-demo-facility`, but a
plausible real mailbox — during scheduler testing. Resend accepted it and
returned a provider id. A second, to `jane@example.com`, failed with a 422
because that domain does not resolve.

Both `message_sends` rows are still there and orphaned: their `review_requests`
rows were cleaned up, the sends were not. They have deliberately NOT been
deleted — the outbox is the record of what was sent to whom, and under CASL that
record is the point.

**The rule: the production messaging tick sends queued rows.** Writing a queued
row on this database is arming a real send, not staging one. Every fixture
address must be `@example.invalid` — a reserved TLD that cannot resolve — and
never `@example.com`, never a plausible mailbox.

---

## 8. Known red, and not yours

The **nightly full e2e suite has failed on the same three `clover-connect`
specs** on consecutive nights (2026-08-29 and 2026-08-30), on the signed-out
Clover launch page. It predates the reputation work — verified by reading the
earlier run, not assumed. Nobody has looked at it. It is failing where money
lives, and it is the "a test nobody runs" shape AGENTS.md warns about.

The push gate (24 specs) is green; only the nightly full suite is red.

---

## 9. Deploy, briefly

Push to `main`, no PR. CI gates, then builds an image, then SSHes to the VPS and
swaps colours with a graceful `caddy reload`.

**Do not infer the deploy from the push.** Confirm:

```
gh run list --limit 1 --json headSha,conclusion --jq '.[0]'
curl -sS -o /dev/null -w '%{http_code}\n' https://yipyy.com/api/health
```

The deploy job intermittently fails with `dial tcp ***:22: i/o timeout` at the
30-second action timeout — twice on 2026-08-30, both cleared by re-running the
job. Re-run before investigating the server; the site stays healthy throughout,
because the previous colour keeps serving.

Rollback: `ssh root@<box> /opt/yipyy/rollback.sh`.
