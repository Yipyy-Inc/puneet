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
gitignored on purpose: it holds the Supabase service-role key, a direct Postgres
URL, WorkOS credentials and Clover keys. Without it, `bun run test:sql` cannot
connect and every verification script below fails. Move it over a channel you
trust; do not paste it into a chat, an issue, or a prompt.

Which WorkOS and Clover environments it names is a thing to MEASURE, not
assume — see section 2, and `CLOVER_ENVIRONMENT` for the other half. On this
machine, 2026-08-31: `sk_test_` and `sandbox`.

**Carry the whole file, not the four keys an earlier version of this section
named.** It holds 27, and the ones easiest to leave behind are the ones whose
absence looks like an application bug rather than a missing variable:

| Block                                                                                                                                       | Absence looks like                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `SUPABASE_DB_URL` (DIRECT, not the pooler), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `test:sql` cannot connect; every script in section 3 fails        |
| `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_WEBHOOK_SECRET`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI`                  | sign-in fails, or a session that will not persist                 |
| `E2E_PASSWORD`, `E2E_POSTGRES_BOOKING_REF`, `E2E_POSTGRES_CLIENT_NAME`, `E2E_POSTGRES_CLIENT_REF`, `E2E_OTHER_CLIENT_REF`                   | specs fail on missing fixtures — reads like a data bug            |
| the ten `CLOVER_*`, including `CLOVER_E2E_*` and `CLOVER_E2E_TERMINAL_SERIAL`                                                               | the payment specs fail where money lives                          |
| `ANTHROPIC_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_DOMAIN`                                                                                | AI routes, the sweep, and host routing (`tls-ask` reads the last) |

`NEXT_PUBLIC_WORKOS_REDIRECT_URI` is pinned to `http://localhost:3000/auth/callback`.
Redirect-based flows therefore only complete on port 3000. Driving our own
sign-in FORM works on any port (measured on 3100), which is why a spec run on
another port can pass while a hosted flow does not.

Then: `bun install`, `gh auth login`, and confirm with
`bun run typecheck && bun run test:unit && bun run test:sql`.

**`bun install` does NOT download the Playwright browsers**, and nothing else in
this repo says so. They live in a machine-level cache outside the tree
(`%LOCALAPPDATA%\ms-playwright` on Windows), so a fresh machine's first e2e run
fails with "Executable doesn't exist" before a single spec is evaluated:

```
bunx playwright install chromium
```

Chromium is enough — `passkey-auth` drives a CDP virtual authenticator and is
Chromium-only by construction, and no suite here selects another browser.

**Use bun, never npm/yarn/pnpm.**

**Authorize the Supabase MCP server, or you cannot ship a migration.** Every
migration in this project reaches the database through MCP `apply_migration` —
not `supabase db push` — and the file is then named with the version the DATABASE
recorded, which `mcp__supabase__list_migrations` reports. A fresh machine starts
unauthorized, and the tools simply are not there; `/mcp` in an interactive
session is where that is fixed.

Without it you can still READ and WRITE SQL through `SUPABASE_DB_URL` (that is
all `bun run test:sql` uses, and the pattern in section 3 works unchanged), but
nothing records a migration version, so do not apply DDL that way and then
hand-write a version number to match — the two will disagree and the next
`db push` will not know which order it wanted.

**Verify against a BUILT server, not `bun run dev`.**

```
bun run build && bun run start --port 3000
E2E_BASE_URL=http://localhost:3000 bunx playwright test <spec>
```

The dev server died repeatedly on 2026-08-29 and looked like an app fault. It
was not: a zombie `node` from an earlier run still held port 3000, so two
servers fought over it and requests failed at random. `Get-NetTCPConnection
-LocalPort 3000 -State Listen` names the process; kill it and start clean. The
built server has been stable for hours at a time.

**If you run two Claude sessions in this repo, they share the working tree AND
the `.git`.** Your `HEAD` can move under you when the other one commits or
pulls, and their files can be sitting staged in the index you are about to
commit. Commit with an explicit pathspec — `git commit -F - -- <your paths>` —
and read `git status --short` first: a leading `M ` or `A ` in the FIRST column
is somebody else's staged work, not yours. Pushing also cancels their queued CI
run and vice versa (see section 9).

---

## 2. The two facts that shape every decision here

**The database is shared and it is production.** There is one Postgres. CI
writes to it, the deployed site reads it, and so does any script you run
locally. A test that leaves rows behind is a bug in the shared environment, not
a mess on your machine. Every verification script in this project cleans up in
`finally` and asserts the remaining count is zero.

**Whether you can sign in locally depends on which WorkOS environment
`.env.local` carries, so CHECK — do not assume either answer.**

```
grep -oE '^WORKOS_API_KEY=sk_(test_)?' .env.local
```

`sk_test_` is STAGING, and the `@yipyy.dev` development accounts authenticate
against it — so every signed-in screen opens, `bun run shoot owner "<path>"`
works, and the whole e2e suite runs locally. Anything else is PRODUCTION, whose
identities are different people entirely; the dev accounts will fail at sign-in
with "Invalid credentials", which reads like a broken account and is not one.
[tests/e2e/\_fixtures.ts](../tests/e2e/_fixtures.ts) explains the same seam from
the other side.

Section 1 records what this machine carried when it was last measured:
`sk_test_`, so sign-in worked and signed-in screens were driven all day.

**An earlier version of this section stated the opposite as a flat fact** — that
`.env.local` held production keys and therefore no signed-in screen could ever
be opened here. The consequence it drew, that verification had to stop at the
database and API layer, would have talked the next session out of browser checks
that were available the whole time. If you find production keys, the constraint
is real and section 3 is the whole toolkit; if you find staging keys, section 3
is the layer beneath browser verification rather than a replacement for it.

Whichever it is, do not "fix" it by editing credentials you did not put there.

---

## 3. How to verify something without a browser

Useful whether or not you can sign in — it reaches things a screen cannot, and
it found five real bugs that typecheck and lint were happy with. With staging
keys (section 2) it is the layer BELOW browser verification, not a substitute
for it: the strongest checks in this repo do both, and several of the defects
found on 2026-08-28/29 were only visible from one side or the other.

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

### The last fixture is gone, and it was doing two things wrong

`src/data/reputation.ts` (829 lines) survived for exactly ONE import —
`reputationSettings` in `report-card-rating.tsx`, the G-01 surface above. It was
deleted on 2026-08-31 along with the block that read it, because reading that
block closely showed it was not merely unconverted:

- **It gated reviews.** The "Share on Google" button rendered only when
  `stars >= reputationSettings.happyThreshold` (4), so the public link was shown
  to happy clients and withheld from unhappy ones. That is the practice
  `check:no-review-gating` exists to prevent, that Google's policies prohibit,
  and that the FTC's Rule on Consumer Reviews (16 CFR Part 465) prohibits.
- **It sent every facility's clients to one hardcoded demo profile** —
  `https://g.page/r/yipyy-mtl/review` — rather than their own `review_channels`
  row.

**The guard passed the whole time**, and that is the transferable part. Every
rule in it matched an IDENTIFIER (`feedbackRouting`, `"gated"`,
`gate*Public*`), and this gate used none — just a comparison. A check that names
the thing it forbids only catches the version that keeps the name. It now has a
second, structural rule: a rating compared against a threshold and chained by
`&&` into a public-link affordance. Verified both ways on 2026-08-31 — clean on
the fixed tree, and exit 1 when the original expression is reintroduced verbatim.

A rating that chooses COPY stays legal, deliberately: the survey's
`isLow ? escalatedTitle : sharedTitle` is correct, because `<PublicButtons>`
renders either way.

Severity was bounded by luck rather than design: `report_cards` holds 0 rows, so
nothing could reach the widget. It was live code on a customer-facing screen.

Bringing a share prompt back to the report card needs a `SECURITY DEFINER`
projection of `review_channels` for a signed-in client — the pattern in
`lib/api/published-reviews.ts` — because RLS scopes that table to staff
(`member_facility_ids()`), and a customer is not a member. That is G-01, still
blocked on report cards actually sending.

The whole localStorage half — the 30-second tick, the trigger engine, a
duplicate template system, and a generator that pushed fixture escalation tasks
onto the live staff task board — was deleted on 2026-08-30: 1,900 lines, eight
files.

---

## 4b. Where Automations, Smart Workflows and Rebook stand

Converted over 2026-08-27/29 and sharing one substrate with the reputation work
above — `message_templates`, `message_sends`, suppression, quiet hours and the
sender are the same code for all of it, which is the point. Full detail in
[docs/quality/debt-map.md](quality/debt-map.md); what a new session needs to know
before touching any of it:

- **`message_sends` is the outbox AND the log**, and everything counts from it —
  the History tab, the analytics tiles, `reminders_sent`. Do not add a counter
  column anywhere; a number that can disagree with the log is the bug this
  design exists to prevent.
- **`rebook_pipeline` is the single source for the Queue, the Lapsed tab and the
  send route.** It returns `is_lapsed` rather than filtering on it, so the two
  tabs read one definition of who is excluded. An exclusion added in a route
  instead would let the send write to somebody the screen showed as excluded.
- **The send route re-derives who is eligible** rather than trusting the ids in
  the request, and its permission check is in APPLICATION code (`my_permissions`
  - `holds`) because it writes the outbox as `service_role`. RLS will not catch
    that check being removed — `automation-send-boundary` is in the push gate for
    exactly that reason, and it was proved to fail without it.
- **Two opt-outs, deliberately not merged.** `message_suppressions` is the
  customer's decision, keyed by ADDRESS, stopping all marketing;
  `client_rebook_preferences` with `service IS NULL` is the facility's note about
  one client, stopping rebook reminders only. Both are enforced.
- **Still open:** the `replied` stop condition on workflows, which needs Twilio
  inbound webhooks that do not exist. Nothing else in these three modules reads
  a fixture.

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
- **A loaded machine makes the e2e suite lie, and it lies in the shape of an
  application bug.** Measured 2026-08-28: 35 `node` processes on this box, most
  belonging to an UNRELATED project, turned a ~45-minute suite into 1.9 hours
  with two-minute click timeouts and about a dozen failures. Reverting the change
  under test "fixed" it, which was the trap — the load had dropped between the
  runs. Only an A/B at comparable load settled it, and the change was innocent.
  So before believing a red suite: count the processes
  (`Get-Process node | Measure-Object`), and if you have changed anything
  between runs, change it back and re-run rather than trusting the comparison.
- **An aborted suite leaks rows, and the NEXT run blames the application.**
  Killing a run skips `afterAll`. Two orphaned `staff_time_clock_entries` for
  `groomer@yipyy.dev` — one spanning 20:13→22:08 — then made payroll fail with a
  409 "That overlaps a session this person already has", which reads exactly
  like an overlap bug in the code. Delete the leaked rows and it passed 23/23.
  If a spec fails on state rather than logic, check for your own debris first.

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

**Confirmed deliberately on 2026-08-29, from the other direction.** A rebook
reminder was queued for a temporary client at `yipyy-demo-facility` addressed to
a mailbox we own, and the VPS tick picked it up and delivered it: `status=sent`,
`provider=resend`, one attempt, `provider_id 63dee979-…`. Client, booking and
outbox row were all removed afterwards.

Two things worth carrying forward from that. First, it is the only end-to-end
proof the tick actually drains the outbox in production — everything else about
the messaging pipeline had been verified a layer below. Second, **`message_sends`
was completely EMPTY beforehand**: fourteen `automation_events` had been
processed, correctly, against zero enabled rules, so the whole system was live
and had never sent anything. "It works" and "it has never been asked to work"
look identical from a dashboard.

If you need to repeat this: queue the row through the real render path
(`loadMessageContext` + `resolveTemplate`, then the `UNRESOLVED_TAG` check), not
by hand-writing a body. Rendering locally resolves `{{portal_link}}` against
`NEXT_PUBLIC_APP_DOMAIN`, which is `yipyy.test` on a dev machine — so the mail
that arrives carries a dead link unless you correct that field before the tick
claims the row.

---

## 8. Known red, and not yours

**FOUND AND FIXED, 2026-08-31.** The three `clover-connect` failures on the
signed-out Clover launch page were not a defect in the application, and not
flake. The e2e job's "Start the built server" step passes Supabase and WorkOS
secrets but never passed `CLOVER_APP_ID`/`CLOVER_APP_SECRET`, so
`cloverConfig()` returned null and /clover served "Yipyy Pay is not available
here" — a page containing none of the three strings those specs assert. The fix
is two placeholder values in `ci.yml`; every case in that file stops before
Clover is contacted, so only their PRESENCE is ever read.

**It had never passed.** The spec was added 2026-08-27 in the same commit that
added it to the CI list, `CLOVER_APP_ID` has never once appeared in `ci.yml`,
and the nightly was green on 2026-08-26 and red every night from 2026-08-27 to
2026-08-31. Five consecutive nightlies, born red. The earlier note here said it
"predates the reputation work", which was true and beside the point.

Two things worth keeping from it. **An absence-only assertion passes on an error
page**: the fourth test in that file — `toHaveCount(0)` on an injected `img` —
was green throughout, so the file read as "mostly working" while the page under
it never rendered. When three tests fail and the one asserting nothing-is-there
passes, suspect the page, not the three. And **a spec that has never been green
is not a regression to bisect** — check whether it ever passed before looking
for what broke it.

The push gate (24 specs) was green throughout, because `clover-connect` is not
in it — it runs only nightly, which is why this stayed invisible for five days.

**`bun run prune` (Knip) exits 1 on a clean tree** — 180 unused files, measured
2026-08-31 on `main` with nothing of your own in the working directory. It is
NOT in the green sequence and NOT a CI job, so this is the expected state and
not something you introduced. Run it to read the report, never to get a zero:
the useful question is whether YOUR new file appears in it, which
`bun run prune 2>&1 | grep <your-file>` answers in a second.

---

## 9. Deploy, briefly

Push to `main`, no PR. CI gates, then builds an image, then SSHes to the VPS and
swaps colours with a graceful `caddy reload`.

**Do not infer the deploy from the push.** And do not confirm it with
`gh run list --limit 1`: several workflows run on this repo, and on 2026-08-29
that returned the **uptime** check — completed, successful, and nothing to do
with the push — while CI was still running. It reported a green deploy that had
not happened.

Select by workflow name AND sha:

```
RUN=$(gh run list --limit 12 --json headSha,name,databaseId \
  --jq '[.[] | select(.headSha|startswith("<sha>")) | select(.name=="CI")][0].databaseId')
gh run view $RUN --json conclusion,jobs \
  --jq '"overall: " + .conclusion, (.jobs[] | "  \(.name): \(.conclusion)")'
curl -sS -o /dev/null -w '%{http_code}\n' https://yipyy.com/api/health
```

Read the JOBS, not just the conclusion: `image` and `deploy` are SKIPPED when an
earlier gate fails, so a run can be "failure" with the site still serving the
previous commit quite happily — which is the correct behaviour and looks
identical to a deploy that worked if you only read the top line.

**A second session pushing will CANCEL your run**, and yours will cancel
theirs — GitHub holds one per branch. A `cancelled` conclusion is not a failure
and not a green light; it means nothing ran. Watch the run for whichever commit
landed last, since yours is an ancestor of it.

The deploy job intermittently fails with `dial tcp ***:22: i/o timeout` at the
30-second action timeout — twice on 2026-08-30, both cleared by re-running the
job. Re-run before investigating the server; the site stays healthy throughout,
because the previous colour keeps serving.

**Rollback needs two things a new machine does not have.** `ssh root@<box>
/opt/yipyy/rollback.sh` is written with a placeholder because the host lives
only in the `VPS_HOST` GitHub secret and the key only in `VPS_SSH_KEY` — neither
is in this repo, by design. So carry the private key and the hostname across
with `.env.local`, and prove the hop works (`ssh root@<host> true`) while
nothing is on fire. Discovering you cannot reach the box is a bad thing to learn
during an incident.

Without SSH you are not stuck, only slower: re-running the `deploy` job from the
Actions UI against an earlier commit reaches the same script by the same path.
