import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Yipyy Pay: who may see it, what it discloses, and what it refuses to claim.
//
// ── WHAT IS WORTH ASSERTING HERE ──────────────────────────────────────────
//
// Not the visual design — that is a judgement, and a spec that pins a heading
// string becomes a chore that gets deleted the first time somebody reword it.
//
// Three things earn a test:
//
//   1. The GATE. This section shows a merchant id, a business address and what
//      a facility took last week. A groomer must not reach it, and must not
//      reach it by typing the URL either — the nav hiding a link is not a gate.
//
//   2. The SHAPE OF THE MONEY. The overview route reports payouts as estimates
//      derived from our own ledger. A regression that turned an estimate into
//      an assertion, or leaked a token alongside it, would be invisible on
//      screen and expensive in a dispute.
//
//   3. The WRITE. Naming a terminal is the first thing in this codebase ever to
//      write `facility_terminals`, and an RLS-refused upsert returns success
//      with zero rows. The refusal has to be a refusal.
//
// ── AND IT WRITES NOTHING ─────────────────────────────────────────────────
//
// There is one Postgres and CI writes to it. Every assertion below is a read or
// a refusal, and each refusal is answered before any statement reaches the
// database — so there is nothing to clean up and no `afterAll` pretending to.
//
// In particular it does NOT save the settings domain. Completing setup here
// would leave the shared facility permanently past the wizard, and every later
// run would be testing a screen the next reader could not reach.
// ============================================================================

const OVERVIEW = "/api/payments/yipyy-pay/overview";
const TERMINALS = "/api/payments/clover/terminals";
const SECTION = "/facility/dashboard/settings?section=yipyy-pay";

test.describe("Yipyy Pay — who may reach it", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    const response = await page.request.get(OVERVIEW);
    // 401 or 403 — the point is that no unauthenticated caller reads a
    // merchant id. Which of the two is an implementation detail of the
    // session layer and not worth pinning.
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThan(500);
  });

  test("refuses a groomer, who has no business seeing the takings", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.get(OVERVIEW);
    expect(response.status()).toBe(403);
  });

  test("does not offer a groomer the nav item", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/facility/dashboard/settings");
    await expect(
      page.getByRole("button", { name: "Yipyy Pay", exact: true }),
    ).toHaveCount(0);
  });

  test("a groomer who types the address still gets nothing", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto(SECTION);
    // The page falls back to a section they DO hold rather than rendering an
    // empty payments screen. Either way, no merchant detail reaches them.
    await expect(page.getByText(/merchant/i)).toHaveCount(0);
  });
});

test.describe("Yipyy Pay — what the overview reports", () => {
  test("answers an owner without ever returning a credential", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.get(OVERVIEW);
    expect(response.status()).toBe(200);

    const raw = await response.text();

    // ── THE ASSERTION THAT MATTERS MOST ────────────────────────────────
    //
    // Whatever this returns, it is not a token. `connectionStatus` selects
    // columns by name and the access token is not among them, but the route
    // ALSO reads a live token server-side to fetch the merchant profile — so
    // the one way this breaks is somebody spreading the wrong object into the
    // response and nobody noticing, because the screen looks identical.
    expect(raw).not.toMatch(/accessToken|access_token|refreshToken/i);
    expect(raw).not.toMatch(
      /"[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}\.[A-Za-z0-9]/,
    );

    const body = JSON.parse(raw) as {
      configured: boolean;
      facility?: { name: string };
      connection?: { connected: boolean; merchantId: string | null };
      config?: { feePayer: string; payoutSchedule: string };
      payouts?: { amountCents: number; expectedOn: string }[];
      activity?: { amountCents: number; status: string }[];
      ambiguous?: boolean;
    };

    if (body.ambiguous) {
      // A tester who administers two facilities on the apex. Legitimate, and
      // the screen asks which — there is nothing else to check.
      test.skip(true, "This account administers more than one facility.");
      return;
    }

    expect(body.facility?.name).toBeTruthy();
    expect(typeof body.configured).toBe("boolean");

    // ── THE DEFAULT ABSORBS THE FEE ────────────────────────────────────
    //
    // A default that changes what a customer is charged is not a default. If
    // this ever comes back "client" for a facility that never chose it, every
    // invoice at that facility gained a line nobody agreed to.
    expect(body.config?.feePayer).toBe("business");

    // ── PAYOUTS ARE ESTIMATES, AND ESTIMATES ARE NON-NEGATIVE ──────────
    //
    // `estimatePayouts` drops a day that nets to zero or below, because Clover
    // does not send a payout for one. A negative here means refunds were added
    // to takings instead of subtracted — the sign trap the client billing tab
    // hit, where a refund was multiplied by -1 and became income.
    for (const payout of body.payouts ?? []) {
      expect(payout.amountCents).toBeGreaterThan(0);
      expect(payout.expectedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // A refund keeps its negative sign in the activity list, so the screen can
    // show money returned rather than money taken.
    for (const row of body.activity ?? []) {
      if (row.status === "refunded") {
        expect(row.amountCents).toBeLessThanOrEqual(0);
      }
    }
  });

  test("the settings section renders for an owner", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(SECTION);
    // Either face is correct depending on whether this facility has finished
    // setup — the assertion is that the section resolves to Yipyy Pay at all,
    // not which of its three screens it chose.
    await expect(page.getByText(/Yipyy\s*Pay/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});

test.describe("Yipyy Pay — naming a terminal", () => {
  test("refuses a groomer, who is not an administrator", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.patch(TERMINALS, {
      data: { serial: "E2E-DOES-NOT-EXIST", label: "Should not save" },
    });

    // A groomer holds no admin ACCESS, so `activeAdminFacility()` refuses
    // before anything reaches Postgres — this pins the outer gate.
    //
    // The inner one is not exercised here and is worth naming so nobody
    // assumes it is: someone WITH admin access but without `manage_settings`
    // gets past this check and is stopped by RLS, and an upsert refused by a
    // `using` clause affects zero rows and answers SUCCESS. That is how a
    // screen reports "Renamed" over a terminal that still has its old name.
    // `deniedIfUntouched` in the route is what turns it back into a 403;
    // `bun run check:rls-writes` is what keeps it there.
    expect(response.status()).toBe(403);
  });

  test("refuses a request that names no terminal", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.patch(TERMINALS, {
      data: { label: "Front desk" },
    });
    expect(response.status()).toBe(422);
  });

  test("refuses a name the column could not hold", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.patch(TERMINALS, {
      data: { serial: "E2E-LABEL-CHECK", label: "x".repeat(61) },
    });
    // Caught in the route rather than by the CHECK constraint, so the person
    // gets a sentence instead of a Postgres error.
    expect(response.status()).toBe(422);
  });
});

// ============================================================================
// The merchant application: who may reach it, and what it refuses to hand back.
//
// Every assertion below is a read or a refusal. The refusals are answered
// before a statement reaches Postgres, and the one authenticated read is a GET
// — so this block writes nothing and has nothing to clean up.
//
// The last test is the one that matters. A national identity number and a bank
// account number go into Vault and only four digits ever come out. That is a
// property of the route, invisible on screen, and exactly the kind of thing a
// refactor breaks silently — so it is asserted against the response body rather
// than trusted to a code comment.
// ============================================================================

const APPLICATION = "/api/merchant-application/application";
const SECRET = "/api/merchant-application/secret";

test.describe("Yipyy Pay — the merchant application", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    const response = await page.request.get(APPLICATION);
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThan(500);
  });

  test("refuses a groomer, who may not read the owners' identity details", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.get(APPLICATION);
    expect(response.status()).toBe(403);
  });

  test("refuses a groomer starting one", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.post(APPLICATION);
    // Refused by `activeAdminFacility()` before any row is written, which is
    // why this test leaves nothing behind for an `afterAll` to remove.
    expect(response.status()).toBe(403);
  });

  test("refuses a groomer storing a number, and never echoes it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.post(SECRET, {
      data: { kind: "bank", value: "000123456789" },
    });
    expect(response.status()).toBe(403);
    // A refusal that quoted the value back would put it in a log, a proxy and
    // a browser devtools pane. The route authorises against the session BEFORE
    // it touches the admin client, and says nothing about what it was sent.
    expect(await response.text()).not.toContain("000123456789");
  });

  test("hands an owner four digits and never a whole number", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.get(APPLICATION);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      application: {
        banking?: { bankLast4?: string | null };
        principals?: { nationalIdLast4?: string | null }[];
      } | null;
    };

    // No application yet on this facility is a legitimate answer, and asserting
    // one exists would make this test depend on whatever the last run left.
    if (!body.application) return;

    const raw = JSON.stringify(body);
    // Nothing named like the secret itself may appear at all. These are the
    // names the columns would have if somebody ever added them to the row.
    for (const forbidden of [
      "national_id",
      "nationalId",
      "accountNumber",
      "account_number",
      "bank_account_number",
    ]) {
      expect(raw).not.toContain(forbidden);
    }

    const last4s = [
      body.application.banking?.bankLast4,
      ...(body.application.principals ?? []).map((p) => p.nationalIdLast4),
    ].filter((value): value is string => typeof value === "string");

    for (const last4 of last4s) {
      expect(last4).toMatch(/^[0-9]{4}$/);
    }
  });
});

// ============================================================================
// The review queue: a Yipyy-staff screen over other businesses' private data.
//
// This queue holds every applicant's owners — their dates of birth, their home
// addresses, and the last four of their identity numbers. The gate on it is not
// "an administrator"; it is "a Yipyy platform administrator", and the two are
// easy to confuse in a codebase where `owner@yipyy.dev` is called an owner and
// holds `settings_billing`.
//
// So the owner test below is the one that matters. A facility owner reading
// their OWN application is correct and covered above; a facility owner reading
// the QUEUE would be one business reading another's. `admin@yipyy.dev` is the
// positive control — without it, four passing refusals would be indis-
// tinguishable from a route that refuses everybody.
//
// Reads and refusals only. Nothing here writes.
// ============================================================================

const QUEUE = "/api/admin/merchant-applications";

test.describe("Yipyy Pay — the review queue", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    const response = await page.request.get(QUEUE);
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThan(500);
  });

  test("refuses a groomer", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.get(QUEUE);
    expect(response.status()).toBe(403);
  });

  test("refuses a facility owner — this queue is not theirs", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.get(QUEUE);
    // An owner administers their own facility and may read their own
    // application. The queue spans every facility, so holding the highest role
    // in one business must not open it.
    expect(response.status()).toBe(403);
  });

  test("refuses an owner's decision before it looks the application up", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.patch(
      `${QUEUE}/00000000-0000-0000-0000-000000000000`,
      { data: { status: "approved" } },
    );
    // 403 and not 404: the gate is checked before the row is read, so a caller
    // who may not review cannot use the difference between the two answers to
    // learn whether an application id exists.
    expect(response.status()).toBe(403);
  });

  test("runs the detail query for real, and 404s a stranger's id", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const response = await page.request.get(
      `${QUEUE}/00000000-0000-0000-0000-000000000000`,
    );

    // 404 is the interesting part, but not for the reason it looks. A
    // malformed PostgREST select string — a relation named wrongly, a column
    // that does not exist — fails at REQUEST time, not compile time, and would
    // surface here as a 400 or a 500. So an admin asking for an id that cannot
    // exist is the cheapest possible proof that the detail query, joins and
    // all, is one Postgres will actually run.
    //
    // It writes nothing, needs no application to exist, and is the only test
    // that covers the select at all: the shared facility may have no
    // application, so nothing else here can reach the happy path.
    expect(response.status()).toBe(404);
  });

  test("admits a platform administrator, and answers with a list", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const response = await page.request.get(QUEUE);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      scope: string;
      counts: { open: number; closed: number };
      applications: { id: string; status: string }[];
    };

    // The positive control. An empty list is a legitimate answer — the shared
    // facility may have no application — so the assertion is on the SHAPE,
    // which a refusal could not produce.
    expect(body.scope).toBe("open");
    expect(Array.isArray(body.applications)).toBe(true);
    expect(typeof body.counts.open).toBe("number");

    // A draft belongs to the facility and is nobody's work. It must never reach
    // the queue, whatever the scope.
    for (const row of body.applications) {
      expect(row.status).not.toBe("draft");
    }
  });
});
