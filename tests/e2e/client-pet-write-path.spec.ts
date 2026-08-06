import { test, expect, type APIResponse } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// POST and PATCH /api/clients and /api/pets — does the app tell the truth
// about what happened?
//
// The RULES live in the database (20260803090000), and
// supabase/tests/client-pet-write-integrity.sql proves them as the actual
// caller, which is the honest place to ask: PostgREST is reachable directly
// with the anon key and a session cookie, so these routes are a convenience and
// not a gate.
//
// THIS FILE ASKS THE OTHER HALF. The triggers silently revert fields a caller
// may not set, so a route that echoed the REQUEST back would report an edit the
// database threw away — a customer would see the balance they just "cleared".
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: return `input` instead of the stored
// row from PATCH. "an owner's edit reports what was stored" goes red.
// ============================================================================

const CUSTOMER_REF = 15; // Alice Johnson — the client record customer@yipyy.dev owns.

/** Stamped on the booking that arms the debt, so teardown can find it again. */
const MARKER = "[e2e client-pet-write-path]";
const DEBT = 125.5;

interface ClientBody {
  id: number;
  name: string;
  phone?: string;
  outstandingBalance: number;
  isBlocked: boolean;
  noShowCount: number;
  storeCredit?: { balance: number };
  error?: string;
}

interface PetBody {
  id: number;
  name: string;
  breed: string;
  weight: number;
  petStatus: string;
  evaluations?: unknown[];
  error?: string;
}

const body = async <T>(res: APIResponse): Promise<T> => (await res.json()) as T;

test.describe.configure({ mode: "serial" });

test.describe("client and pet write path", () => {
  // Everything below edits ONE seeded client and its pets, so put the fields
  // back however the run ends. The lesson is written up in
  // role-editor-writes.spec.ts: a spec that mutates shared rows and cleans up
  // only on the happy path sends later specs red about someone else's subject.
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      await page.request.patch(`/api/clients/${CUSTOMER_REF}`, {
        data: {
          name: "Alice Johnson",
          phone: null,
          isBlocked: false,
          blockedReason: null,
          noShowCount: 0,
          storeCredit: { balance: 0, transactions: [] },
        },
      });

      // The debt is a BOOKING now, so clearing it means cancelling that
      // booking — writing `outstandingBalance: 0` here would be teardown that
      // silently does nothing, and the next run would start with a client who
      // already owes money and a test that "passes" for the wrong reason.
      const bookings = (await (
        await page.request.get("/api/bookings")
      ).json()) as
        | { id: string; status?: string; specialRequests?: string }[]
        | null;
      for (const b of bookings ?? []) {
        if (!b.specialRequests?.includes(MARKER)) continue;
        if (b.status === "cancelled") continue;
        await page.request.patch(`/api/bookings/${b.id}`, {
          data: { status: "cancelled" },
        });
      }
    } catch {
      // Teardown must never turn a green run red.
    } finally {
      await context.close();
    }
  });

  test("an owner's edit reports what was stored", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const phone = `+1-555-${String(Date.now() % 10000).padStart(4, "0")}`;
    const res = await page.request.patch(`/api/clients/${CUSTOMER_REF}`, {
      data: { phone },
    });
    expect(res.status()).toBe(200);
    expect((await body<ClientBody>(res)).phone).toBe(phone);

    // And it survives a re-read, which is the part a route echoing its own
    // input would also pass.
    const after = await body<ClientBody[]>(
      await page.request.get("/api/clients"),
    );
    expect(after.find((c) => c.id === CUSTOMER_REF)?.phone).toBe(phone);
  });

  test("a customer cannot clear their own balance", async ({
    page,
    browser,
  }) => {
    // THE STATE HAS TO BE PUT THERE FIRST.
    //
    // The seeded customer owes nothing and is not blocked, so the obvious
    // version of this test — "try to zero it, assert it is still zero" — passes
    // whether or not the trigger exists. It asserted that an already-cleared
    // value stayed cleared, which is the fourth time in this codebase a test
    // has looked like coverage while checking nothing.
    //
    // So a staff caller puts a real debt and a block on the account, and only
    // then does the customer try to wipe it.
    //
    // THE DEBT IS A DELIVERED BOOKING, not a written figure.
    // `clients.outstanding_balance` stopped being a stored column in
    // 20260806780000 — what a client owes is now derived from bookings that
    // have been delivered and not settled. So PATCHing 125.5 wrote nothing and
    // the route correctly echoed the derived 0, and this test failed on its own
    // arming step rather than on the rule it exists to check.
    //
    // Deriving it also makes the customer's attack impossible by construction
    // rather than by trigger, which is stronger — but only if the balance is
    // genuinely non-zero when they try, hence a real booking.
    let owed = 0;
    const staff = await browser.newContext();
    const staffPage = await staff.newPage();
    try {
      await signIn(staffPage, ACCOUNTS.owner);

      const day = new Date(Date.now() - 3 * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const created = await staffPage.request.post("/api/bookings", {
        data: {
          clientId: CUSTOMER_REF,
          petId: 1,
          facilityId: 11,
          service: "daycare",
          startDate: day,
          endDate: day,
          checkInTime: "09:00",
          checkOutTime: "17:00",
          status: "completed",
          basePrice: DEBT,
          discount: 0,
          totalCost: DEBT,
          specialRequests: MARKER,
        },
      });
      expect(created.status(), await created.text()).toBe(201);

      const armed = await staffPage.request.patch(
        `/api/clients/${CUSTOMER_REF}`,
        {
          data: {
            isBlocked: true,
            blockedReason: "Test arrangement",
            noShowCount: 3,
          },
        },
      );
      expect(armed.status()).toBe(200);

      // Read as an ABSOLUTE only after arming, and carried into the assertion
      // below as a delta baseline: client 15 is a seeded account with its own
      // history, so "the balance is 125.5" would only hold on a fresh database.
      owed = Number((await body<ClientBody>(armed)).outstandingBalance ?? 0);
      expect(owed, "the delivered booking is owed").toBeGreaterThanOrEqual(
        DEBT,
      );
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.patch(`/api/clients/${CUSTOMER_REF}`, {
      data: { outstandingBalance: 0, isBlocked: false, noShowCount: 0 },
    });

    // 200, not 403 — and that is the design, not an oversight. The trigger
    // REVERTS rather than raises, because the app PATCHes the whole merged
    // object and erroring would make every legitimate profile edit fail. What
    // matters is that the response reports the STORED values, so the UI cannot
    // show a customer a balance the database refused to change.
    expect(res.status()).toBe(200);
    const stored = await body<ClientBody>(res);
    expect(Number(stored.outstandingBalance), "the debt is still owed").toBe(
      owed,
    );
    expect(stored.isBlocked, "still blocked").toBe(true);
    expect(stored.noShowCount, "no-shows still counted").toBe(3);
  });

  test("a customer cannot grant themselves store credit", async ({
    page,
    browser,
  }) => {
    // Armed by staff for the same reason as the test above: asserting the
    // credit is "unchanged" only means something once it is a value somebody
    // else chose.
    const staff = await browser.newContext();
    const staffPage = await staff.newPage();
    try {
      await signIn(staffPage, ACCOUNTS.owner);
      const armed = await staffPage.request.patch(
        `/api/clients/${CUSTOMER_REF}`,
        { data: { storeCredit: { balance: 12.5, transactions: [] } } },
      );
      expect(armed.status()).toBe(200);
      expect((await body<ClientBody>(armed)).storeCredit?.balance).toBe(12.5);
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.patch(`/api/clients/${CUSTOMER_REF}`, {
      data: { storeCredit: { balance: 9999, transactions: [] } },
    });
    expect(res.status()).toBe(200);

    expect(
      (await body<ClientBody>(res)).storeCredit?.balance,
      "store credit is the facility's to grant",
    ).toBe(12.5);
  });

  test("a customer may still edit their own name", async ({ page }) => {
    // The counterpart every refusal above needs: this is a scoping rule, not a
    // read-only account. Without it, a trigger that simply broke writing would
    // satisfy all three tests before this one.
    await signIn(page, ACCOUNTS.customer);

    const name = `Alice Johnson ${Date.now() % 1000}`;
    const res = await page.request.patch(`/api/clients/${CUSTOMER_REF}`, {
      data: { name },
    });
    expect(res.status()).toBe(200);
    expect((await body<ClientBody>(res)).name).toBe(name);
  });

  test("a customer's new pet arrives without a facility evaluation", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const res = await page.request.post("/api/pets", {
      data: {
        clientId: CUSTOMER_REF,
        name: `Probe ${Date.now() % 100000}`,
        type: "dog",
        breed: "Terrier",
        petStatus: "deceased", // not a state you register an animal in
        evaluations: [{ result: "self-certified: excellent with all dogs" }],
      },
    });

    expect(res.status()).toBe(201);
    const pet = await body<PetBody>(res);
    expect(pet.breed, "the descriptive fields are the owner's").toBe("Terrier");
    expect(pet.petStatus, "status is the facility's").toBe("active");
    expect(
      pet.evaluations ?? [],
      "an owner cannot attach their own evaluation",
    ).toHaveLength(0);

    // Remove the pet this test created — as STAFF, because an owner cannot
    // delete their own animal (pets_delete needs edit_pet_records) and renaming
    // it is not cleanup. Four of these accumulated in the seeded database
    // before this was written, one of them the "deceased, self-certified" pet
    // from a run with the triggers deliberately dropped.
    const staff = await browser.newContext();
    const staffPage = await staff.newPage();
    try {
      await signIn(staffPage, ACCOUNTS.owner);
      const removed = await staffPage.request.delete(`/api/pets/${pet.id}`);
      expect(removed.status(), "the test cleans up after itself").toBe(204);
    } finally {
      await staff.close();
    }
  });

  test("signed out cannot write at all", async ({ page }) => {
    const client = await page.request.patch(`/api/clients/${CUSTOMER_REF}`, {
      data: { name: "Anonymous" },
    });
    expect(client.status()).toBe(401);

    const pet = await page.request.post("/api/pets", {
      data: { clientId: CUSTOMER_REF, name: "Anonymous" },
    });
    expect(pet.status()).toBe(401);
  });
});
