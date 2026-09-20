import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A CUSTOMER BOOKS AT THEIR OWN FACILITY — NOT AT THE ONE THE APP FALLS BACK TO.
//
// ── WHY THIS FILE EXISTS WHEN customer-*.spec.ts ALREADY PASS ─────────────
//
// `customer@yipyy.dev` is a client of the DEMO facility, and the demo facility
// is exactly what `getFacilityContext()` answers for any caller holding no
// membership. So every customer spec that asks "did this resolve MY facility?"
// was reading the one answer that is correct under BOTH the right resolution
// and the broken one. customer-setting-reads.spec.ts was written FOR that
// defect and could not have failed on it.
//
// `customer2@yipyy.dev` is Geneviève Fortin, a client of PAWS & CO — DEMO, so
// the two answers differ and every assertion below has something to catch.
//
// ── THE CHAIN THE CLIENT ASKED ABOUT, IN ORDER ────────────────────────────
//
//   the portal knows which client they are, at which business
//   the wizard reads that business's OWN catalogue, not the demo one's
//   a service that business gates on a form is refused, by name
//   a service it does not gate books — as a REQUEST, priced at nothing
//   the request is theirs, at their facility, and they can withdraw it
//
// ── IT CLEANS UP AS THE CUSTOMER, BECAUSE NOBODY ELSE CAN ─────────────────
//
// The seeded staff identities are members of the demo facility only, so none
// of them can touch a Paws & Co booking — RLS refuses, correctly. The customer
// withdrawing their own request is the only cleanup available, and it is also
// the last link in the chain, so it is asserted rather than merely performed.
// ============================================================================

const APEX = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase() ?? "";
const HOST = () => `paws-co-demo.${APEX}`;
/** The facility this identity is NOT a client of — the fallback itself. */
const OTHER_HOST = () => `yipyy-demo-facility.${APEX}`;

const MARKER = "[e2e customer-books-their-own-facility]";
const CLIENT_REF = 92019485; // Geneviève Fortin
const PET_REF = 13685; // Caramel, her dog

/** Refs made here, withdrawn in afterAll whatever the tests did. */
const made: number[] = [];

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  // Not a skip: without the apex every Host below is nonsense and the
  // assertions would be measuring nothing.
  expect(APEX, "NEXT_PUBLIC_APP_DOMAIN must be set for this spec").not.toBe("");
});

test("the portal knows which client they are, and at which business", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customerPawsCo);

  const mine = await page.request.get("/api/clients/me", {
    headers: { Host: HOST() },
    failOnStatusCode: false,
  });
  expect(mine.status(), await mine.text()).toBe(200);
  const client = (await mine.json()) as { id: number; name: string };
  expect(client.id).toBe(CLIENT_REF);
  expect(client.name).toBe("Geneviève Fortin");

  // ── AND THE HOST IS WHAT DECIDED THAT ───────────────────────────────────
  //
  // Asked at the DEMO facility's address, the same session must come back as
  // a stranger. This is the control for the whole file: if Playwright were
  // dropping the Host header, this identity's only client record would be
  // returned here too and every assertion above would be proving nothing.
  const elsewhere = await page.request.get("/api/clients/me", {
    headers: { Host: OTHER_HOST() },
    failOnStatusCode: false,
  });
  expect(
    elsewhere.status(),
    "the demo facility answered for a customer who is not its client",
  ).toBe(404);
  expect((await elsewhere.json()) as { linked: boolean }).toMatchObject({
    linked: false,
  });
});

test("the wizard reads their facility's catalogue, not the fallback's", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customerPawsCo);

  const response = await page.request.get("/api/customer/settings", {
    headers: { Host: HOST() },
    failOnStatusCode: false,
  });
  expect(response.status(), await response.text()).toBe(200);
  const settings = (await response.json()) as Record<
    string,
    { value: unknown; configured: boolean }
  >;

  // Paws & Co sells training programs; the demo facility has no such row. A
  // resolution that fell back would hand back the unconfigured default here.
  const programs = settings.training_programs;
  expect(
    programs?.configured,
    "the customer read no training programs — their facility has three",
  ).toBe(true);
  const names = (
    (programs?.value as { programs?: Array<{ name: string }> }).programs ?? []
  ).map((p) => p.name);
  expect(names).toContain("Puppy Preschool — 6 weeks");

  // And the other direction, which is the one a fallback breaks: the demo
  // facility HAS booking_rules and Paws & Co does not, so a leak shows up as a
  // domain reading `configured` when this facility never set it.
  expect(
    settings.booking_rules?.configured,
    "another facility's booking rules reached a Paws & Co customer",
  ).toBe(false);
});

test("a service the facility gates on a form is refused, by name", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customerPawsCo);

  // Paws & Co requires "New client intake" before a daycare or boarding
  // booking, set to BLOCK. Geneviève has not submitted it. The refusal is
  // create_booking's, under the caller's own permissions — a customer holds no
  // create_bookings, so there is no override branch for them to reach.
  const refused = await page.request.post("/api/bookings", {
    headers: { Host: HOST() },
    data: {
      clientId: CLIENT_REF,
      petId: PET_REF,
      facilityId: 0,
      service: "daycare",
      startDate: day(14),
      endDate: day(14),
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "request_submitted",
      basePrice: 38,
      discount: 0,
      totalCost: 38,
      specialRequests: MARKER,
    },
    failOnStatusCode: false,
  });

  expect(refused.status(), await refused.text()).toBe(422);
  const body = (await refused.json()) as {
    error: string;
    code: string;
    missing: Array<{ form_name: string; form_slug: string }>;
  };
  expect(body.code).toBe("form_required");
  // Named, because the portal opens the first one for them.
  expect(body.missing.map((m) => m.form_name)).toContain("New client intake");
  expect(body.missing[0]?.form_slug).toBeTruthy();
});

test("a service it does not gate books — as a request, priced at nothing", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customerPawsCo);

  // Training carries no before_booking requirement at this facility, so this
  // is the path a customer actually completes. `status` and the prices are
  // sent the way the wizard sends them, and the database is expected to
  // overrule both: private.enforce_booking_integrity forces a customer's
  // insert to request_submitted with the money zeroed, whatever was asked for.
  const created = await page.request.post("/api/bookings", {
    headers: { Host: HOST() },
    data: {
      clientId: CLIENT_REF,
      petId: PET_REF,
      facilityId: 0,
      service: "training",
      startDate: day(15),
      endDate: day(15),
      checkInTime: "10:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: 210,
      discount: 0,
      totalCost: 210,
      specialRequests: MARKER,
    },
    failOnStatusCode: false,
  });
  expect(created.status(), await created.text()).toBe(201);
  const ref = ((await created.json()) as { id: number }).id;
  made.push(ref);

  const read = await page.request.get(`/api/bookings?ref=${ref}`, {
    headers: { Host: HOST() },
  });
  const [booking] = (await read.json()) as Array<{
    status: string;
    totalCost: number;
    basePrice: number;
    clientId: number;
  }>;
  expect(
    booking?.status,
    "a customer's booking was accepted as confirmed",
  ).toBe("request_submitted");
  expect(booking?.totalCost).toBe(0);
  expect(booking?.basePrice).toBe(0);
  expect(booking?.clientId).toBe(CLIENT_REF);
});

test("the request is at THEIR facility, and it is theirs to withdraw", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customerPawsCo);
  const ref = made[0];
  expect(ref, "no booking was created to withdraw").toBeTruthy();

  // The facility a booking was STAMPED with is the assertion CUJ-20 was
  // walked for: a customer's booking written against the demo facility is a
  // row in a business they have never heard of, and it looks identical from
  // here. `/api/customer/facility` names the facility from the client row.
  const mine = await page.request.get("/api/customer/facility", {
    headers: { Host: HOST() },
    failOnStatusCode: false,
  });
  expect(mine.status(), await mine.text()).toBe(200);
  expect(JSON.stringify(await mine.json())).toContain("Paws & Co");

  const terms = await page.request.get(`/api/customer/bookings/${ref}/cancel`, {
    headers: { Host: HOST() },
    failOnStatusCode: false,
  });
  expect(terms.status(), await terms.text()).toBe(200);
  expect((await terms.json()) as { withdrawal: boolean }).toMatchObject({
    // Never submitted for approval means never approved: withdrawn, not
    // "cancelled late", and no fee sentence.
    withdrawal: true,
    cancellable: true,
    started: false,
  });
});

test("on the apex, the portal still names a real business", async ({
  page,
}) => {
  // ── THE HALF OF CUJ-20 THAT WAS LEFT UNFIXED ────────────────────────────
  //
  // With no facility in the hostname the layout passed `null` branding, and
  // the shell's provider falls back to `src/data/facilities.ts[0]` — so a
  // customer who opened yipyy.com/customer rather than their own facility's
  // address read "Paws & Play Daycare" in the sidebar, the header, the
  // switcher and the welcome line, above their own real bookings.
  //
  // This spec runs at the base URL with NO Host override, which IS the apex,
  // so it is the one place in the suite that can see it.
  await signIn(page, ACCOUNTS.customerPawsCo);
  await page.goto("/customer/dashboard");

  await expect(
    page.getByRole("heading", { name: /Welcome back, Geneviève/ }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("body")).toContainText("Paws & Co — Demo");
  await expect(
    page.locator("body"),
    "a fixture business was named to a real customer",
  ).not.toContainText("Paws & Play Daycare");
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.customerPawsCo);
    const refused: string[] = [];
    for (const ref of made) {
      const res = await page.request.post(
        `/api/customer/bookings/${ref}/cancel`,
        {
          headers: { Host: HOST() },
          data: { reason: `${MARKER} cleanup` },
          failOnStatusCode: false,
        },
      );
      if (!res.ok()) refused.push(`${ref}: ${await res.text()}`);
    }
    expect(refused, "cleanup left requests open at a demo facility").toEqual(
      [],
    );
  } finally {
    await page.close();
  }
});
