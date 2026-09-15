import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A booking waits for the forms the facility requires before booking.
//
// The facility's `form_requirements` setting said which forms a service needs
// and nothing read it. `create_booking` asks the database now:
//
//   1. A customer missing a blocking form is refused, told which form, and
//      nothing is written.
//   2. Staff are asked why; with a reason the booking is made, and the reason
//      is never stored on the booking itself.
//   3. Once the customer has submitted the form, their own booking goes
//      through.
//
// The SQL behind it is proved in supabase/tests/booking-form-gate.sql and
// form-requirements.sql.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
//
// The requirement is set on the e2e facility for this file only: afterAll puts
// the facility's previous `form_requirements` back, archives the form made
// here, and cancels every booking carrying MARKER.
// ============================================================================

const MARKER = "[e2e form-requirements]";
const ALICE = { client: 15, pet: 1 }; // customer@yipyy.dev's client and Buddy
const REASON = `${MARKER} completing it at drop-off`;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

interface Refusal {
  error: string;
  code?: string;
  missing?: { form_id: string; form_slug: string; enforcement: string }[];
}

let formId = "";
let formSlug = "";
let previousRequirements: unknown = { services: [] };

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function daycare(overrides: Record<string, unknown> = {}) {
  const day = isoDaysAhead(420 + Math.floor(Math.random() * 60));
  return {
    clientId: ALICE.client,
    petId: ALICE.pet,
    facilityId: 0,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "08:00",
    checkOutTime: "17:00",
    basePrice: 0,
    discount: 0,
    totalCost: 0,
    specialRequests: MARKER,
    ...overrides,
  };
}

async function saveRequirements(page: Page, value: unknown) {
  const res = await page.request.patch("/api/facility/settings", {
    data: { domain: "form_requirements", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);

    const current = await page.request.get("/api/facility/settings");
    expect(current.ok(), await current.text()).toBe(true);
    const settings = (await current.json()) as Record<
      string,
      { value: unknown; configured: boolean }
    >;
    previousRequirements = settings.form_requirements?.value ?? {
      services: [],
    };

    const created = await page.request.post("/api/forms", {
      data: { name: `${MARKER} intake ${Date.now()}` },
    });
    expect(created.ok(), await created.text()).toBe(true);
    const form = (
      (await created.json()) as {
        form: { id: string; slug: string };
      }
    ).form;
    formId = form.id;
    formSlug = form.slug;

    const published = await page.request.patch(`/api/forms/${formId}`, {
      data: {
        status: "published",
        publish: true,
        schema: {
          questions: [
            {
              id: "f1",
              type: "yes_no",
              label: "Is your dog vaccinated?",
              required: true,
              sectionId: "s1",
            },
          ],
          sections: [{ id: "s1", title: "Health", order: 1 }],
          logicRules: [],
          fieldMapping: [],
        },
      },
    });
    expect(published.ok(), await published.text()).toBe(true);

    await saveRequirements(page, {
      services: [
        {
          serviceType: "daycare",
          serviceLabel: "Daycare",
          requirements: [
            {
              formId,
              formName: "Intake",
              enabled: true,
              gates: [{ stage: "before_booking", enforcement: "block" }],
            },
          ],
        },
      ],
    });
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await saveRequirements(page, previousRequirements);
    if (formId) {
      await page.request.patch(`/api/forms/${formId}`, {
        data: { status: "archived" },
      });
    }
    const res = await page.request.get("/api/bookings");
    const bookings = res.ok() ? ((await res.json()) as BookingPayload[]) : [];
    for (const b of bookings) {
      if (!b.specialRequests?.includes(MARKER) || b.status === "cancelled") {
        continue;
      }
      await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
    }
  } finally {
    await page.close();
  }
});

test.describe("a booking waits for the forms the facility requires", () => {
  test("a customer without the form is refused and told which form", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.post("/api/bookings", { data: daycare() });

    expect(res.status(), await res.text()).toBe(422);
    const refusal = (await res.json()) as Refusal;
    expect(refusal.code).toBe("form_required");
    expect(refusal.missing?.map((m) => m.form_slug)).toContain(formSlug);
  });

  test("staff are asked why, and with a reason the booking is made", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const refused = await page.request.post("/api/bookings", {
      data: daycare({ status: "confirmed" }),
    });
    expect(refused.status(), await refused.text()).toBe(422);
    expect(((await refused.json()) as Refusal).code).toBe(
      "form_override_reason_required",
    );

    const made = await page.request.post("/api/bookings", {
      data: daycare({ status: "confirmed", formOverrideReason: REASON }),
    });
    expect(made.status(), await made.text()).toBe(201);
    const booking = (await made.json()) as BookingPayload;

    // The reason is the override's, not the booking's: it must not have been
    // filed into the booking's details on the way through.
    const reread = await page.request.get(`/api/bookings?ref=${booking.id}`);
    expect(reread.ok(), await reread.text()).toBe(true);
    expect(JSON.stringify(await reread.json())).not.toContain(REASON);
  });

  test("once the customer has submitted the form, their booking goes through", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const filed = await page.request.post(`/api/forms/${formId}/submit`, {
      data: { answers: { f1: "yes" } },
    });
    expect(filed.status(), await filed.text()).toBe(201);

    const res = await page.request.post("/api/bookings", { data: daycare() });
    expect(res.status(), await res.text()).toBe(201);
    expect(((await res.json()) as BookingPayload).status).toBe(
      "request_submitted",
    );
  });
});
