import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// An estimate is a row, and every estimate action is a write.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
//
// Until 20260911113556 every estimate screen read seven rows from
// `@/data/estimates`: the wizard's "Send" stored nothing, the card's actions
// were empty callbacks followed by success toasts, and converting pushed a
// booking onto the bookings fixture. supabase/tests/estimates.sql holds the
// POLICY and the numbering; this holds the ROUTES and the SCREEN:
//
//   - a new estimate comes back numbered, with a total the SERVER computed
//   - send, accept on behalf, decline and delete are each a write, and a sent
//     estimate cannot be deleted
//   - converting creates a real booking and points the estimate at it
//   - the list screen shows what the route holds
//   - a caretaker, who has no view_estimates, reads none
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// A sent estimate is kept as the record, so no signed-in caller can delete
// it. afterAll removes this run's rows as service_role, matched by MARKER in
// the internal note, and cancels the booking a conversion made — the purge
// that runs after the suite removes cancelled, money-free e2e bookings.
// ============================================================================

const MARKER = "[e2e estimates]";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface ClientPayload {
  id: number;
  pets: { id: number }[];
}

interface EstimatePayload {
  id: string;
  estimateId: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  estimateToken?: string;
  convertedBookingId?: number;
  acceptedBy?: string;
  activityLog?: { type: string }[];
}

async function aClientWithAPet(page: Page): Promise<ClientPayload> {
  const res = await page.request.get("/api/clients");
  expect(res.ok()).toBe(true);
  const client = ((await res.json()) as ClientPayload[]).find(
    (c) => c.pets.length > 0,
  );
  expect(client, "a client with a pet").toBeTruthy();
  return client!;
}

async function createEstimate(
  page: Page,
  client: ClientPayload,
  send: boolean,
): Promise<EstimatePayload> {
  const res = await page.request.post("/api/estimates", {
    data: {
      clientRef: client.id,
      petRefs: [client.pets[0].id],
      service: "daycare",
      startDate: "2027-03-02",
      endDate: "2027-03-02",
      lineItems: [
        { label: "Daycare", amount: 38, quantity: 2 },
        { label: "Nail trim", amount: 12.5, quantity: 1 },
      ],
      discount: 5,
      taxRate: 0.05,
      // A client-sent total is ignored; the server computes its own.
      total: 1,
      internalNote: MARKER,
      send,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as EstimatePayload;
}

let bookingRef = 0;

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const db = admin();
  const { count } = await db
    .from("estimates")
    .delete({ count: "exact" })
    .eq("internal_note", MARKER);
  if (bookingRef) {
    await db
      .from("bookings")
      .update({ status: "cancelled", special_requests: MARKER })
      .eq("ref", bookingRef);
  }
  console.log(`cleanup: ${count ?? 0} estimate(s) deleted`);
});

test.describe("estimates", () => {
  test("signed out gets 401", async ({ request }) => {
    const res = await request.get("/api/estimates", {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });

  test("a draft comes back numbered, priced by the server, and can be deleted", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const draft = await createEstimate(page, client, false);

    expect(draft.status).toBe("draft");
    expect(draft.estimateId).toMatch(/^\S*\d+$/);
    // 38×2 + 12.50 = 88.50, less 5 = 83.50, 5 % tax = 4.18, total 87.68.
    expect(draft.subtotal).toBe(88.5);
    expect(draft.taxAmount).toBe(4.18);
    expect(draft.total).toBe(87.68);

    const listed = (await (
      await page.request.get(`/api/estimates?clientRef=${client.id}`)
    ).json()) as EstimatePayload[];
    expect(listed.some((e) => e.id === draft.id)).toBe(true);

    const gone = await page.request.delete(`/api/estimates/${draft.id}`);
    expect(gone.status()).toBe(204);
  });

  test("send, accept on behalf and decline are each written, and a sent one stays", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const sent = await createEstimate(page, client, true);
    expect(sent.status).toBe("sent");
    expect(sent.estimateToken, "a link token").toMatch(/^[0-9a-f]{64}$/);

    const refused = await page.request.delete(`/api/estimates/${sent.id}`, {
      failOnStatusCode: false,
    });
    expect(refused.status(), "a sent estimate is kept as the record").toBe(403);

    const accepted = await page.request.patch(`/api/estimates/${sent.id}`, {
      data: { action: "accept_on_behalf" },
    });
    expect(accepted.status(), await accepted.text()).toBe(200);
    const acceptedBody = (await accepted.json()) as EstimatePayload;
    expect(acceptedBody.status).toBe("accepted");
    expect(acceptedBody.acceptedBy, "stamped from the session").toBeTruthy();

    const declined = await page.request.patch(`/api/estimates/${sent.id}`, {
      data: { action: "decline", reason: "Changed plans" },
    });
    expect(declined.status()).toBe(200);
    const reread = (await (
      await page.request.get(`/api/estimates/${sent.id}`)
    ).json()) as EstimatePayload;
    expect(reread.status).toBe("declined");
    expect(reread.activityLog?.map((a) => a.type)).toEqual([
      "created",
      "sent",
      "accepted",
      "declined",
    ]);
  });

  test("converting makes a real booking and points the estimate at it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const sent = await createEstimate(page, client, true);

    const booking = await page.request.post("/api/bookings", {
      data: {
        clientId: client.id,
        petId: client.pets[0].id,
        facilityId: 11,
        service: "daycare",
        startDate: "2027-03-02",
        endDate: "2027-03-02",
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 83.5,
        discount: 0,
        totalCost: 87.68,
        specialRequests: MARKER,
      },
    });
    expect(booking.ok(), await booking.text()).toBe(true);
    bookingRef = ((await booking.json()) as { id: number }).id;

    const converted = await page.request.patch(`/api/estimates/${sent.id}`, {
      data: { action: "convert", bookingRef },
    });
    expect(converted.status(), await converted.text()).toBe(200);
    const body = (await converted.json()) as EstimatePayload;
    expect(body.status).toBe("converted");
    expect(body.convertedBookingId).toBe(bookingRef);
  });

  test("the list screen shows what the route holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const draft = await createEstimate(page, client, false);

    await page.goto("/facility/dashboard/estimates");
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByText(draft.estimateId).first()).toBeVisible();

    await page.request.delete(`/api/estimates/${draft.id}`);
  });

  test("a caretaker, who has no view_estimates, reads none", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.caretaker);
    const res = await page.request.get("/api/estimates");
    expect(res.status()).toBe(200);
    expect((await res.json()) as unknown[]).toHaveLength(0);
  });
});
