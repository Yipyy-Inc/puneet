import { test, expect, type Locator, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";
import {
  creditOff,
  formReady,
  methodCard,
  takePaymentDialog,
} from "./_take-payment";

// ============================================================================
// The facility's booking page, end to end, through the screen people use (the
// client's four Booking_Details mocks, 2026-10-03: "make it work end to end").
//
//   1. Boarding: check in; the journal logs a potty break, keeps it across a
//      reload, and takes it back; a belonging is added and handed back; a
//      note is written; the bill is paid with account credit first and the
//      rest in cash, with change.
//   2. Daycare: check in; the playgroup changes; a custom amount in cash
//      leaves it part-paid; an e-transfer marked pending records nothing and
//      makes a task; "Record arrival" pays it.
//   3. Grooming: check in, start, tick the groom done, mark ready, and
//      complete it through the till with a 15% tip; the pet's preferences
//      are saved and read back.
//   4. Training: check in and complete the session through the till.
//   5. A caretaker, who may not see booking money, sees no payment card.
//
// `booking-checkout-truth` (the gate) proves the money; this proves the
// screen joins up. Every booking carries MARKER in its special requests and
// is refunded and cancelled in afterAll; the credit it gives is taken back,
// the pet's preferences are put back, and the e-transfer task is closed.
// ============================================================================

const MARKER = "[e2e booking-details]";
// Bob Smith: no membership to discount the bill, and a pet of his own.
const CLIENT_REF = 16;
const PET_REF = 3;
const CREDIT = 10;

/** The facility's day — the demo facility keeps Montreal time. */
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
}).format(new Date());
const plusDays = (n: number) => {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

interface BookingPayload {
  id: number;
  clientId: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  amountDue?: number;
}

let creditGiven = false;
let originalPrefs: Record<string, string> | null = null;
const createdRefs: number[] = [];

test.describe.configure({ mode: "serial", timeout: 6 * 60 * 1000 });
test.use({ actionTimeout: 30_000 });

async function createBooking(
  page: Page,
  body: Record<string, unknown>,
): Promise<BookingPayload> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: CLIENT_REF,
      petId: PET_REF,
      discount: 0,
      status: "confirmed",
      specialRequests: MARKER,
      ...body,
    },
    failOnStatusCode: false,
  });
  expect(res.status(), await res.text()).toBe(201);
  const booking = (await res.json()) as BookingPayload;
  createdRefs.push(booking.id);
  return booking;
}

async function readBooking(page: Page, ref: number): Promise<BookingPayload> {
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  const list = (await res.json()) as unknown;
  const found = Array.isArray(list)
    ? (list as BookingPayload[]).find((b) => b.id === ref)
    : undefined;
  expect(found, `booking ${ref}`).toBeTruthy();
  return found!;
}

async function openPage(page: Page, booking: BookingPayload) {
  await page.goto(
    `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
  );
  await expect(page.getByRole("tab", { name: /^overview/i })).toBeVisible({
    timeout: 120_000,
  });
}

/** The header's one primary button, by its words; confirms what it asks. */
async function primary(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click();
  // A check-in with a vaccine gap asks first; anything else just runs.
  // (isVisible does not wait, whatever timeout it is given — waitFor does.)
  const confirm = page.getByRole("alertdialog");
  const asked = await confirm
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (asked) {
    await confirm.getByRole("button").last().click();
    await expect(confirm).toBeHidden();
  }
}

async function expectStatus(page: Page, words: RegExp) {
  await expect(page.locator("h1").locator("..").getByText(words)).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Take payment, from the payment card. Bob's own account credit is off unless
 * the test is about it: the dialog applies credit by default, and a demo
 * client can carry some another spec left behind.
 */
async function openTill(
  page: Page,
  { credit = "off" }: { credit?: "off" | "keep" } = {},
): Promise<Locator> {
  await page
    .getByRole("button", { name: /^take payment/i })
    .first()
    .click();
  return tillOpened(page, credit);
}

/** The dialog, opened by whatever opened it, with its form on screen. */
async function tillOpened(
  page: Page,
  credit: "off" | "keep" = "off",
): Promise<Locator> {
  const dialog = takePaymentDialog(page);
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  if (credit === "off") await creditOff(dialog);
  else await formReady(dialog);
  return dialog;
}

const method = methodCard;

/** A ChoicePill's radio is visually hidden: the pill, its label, takes the tap. */
const pill = (scope: Locator, name: RegExp) =>
  scope
    .locator("label")
    .filter({ has: scope.page().getByRole("radio", { name }) })
    .first();

async function finish(dialog: Locator, title: RegExp) {
  await expect(dialog.getByText(title)).toBeVisible({ timeout: 60_000 });
  await dialog.getByRole("button", { name: /^done$/i }).click();
  await expect(dialog).toBeHidden();
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  const left: string[] = [];
  try {
    await signIn(page, ACCOUNTS.owner);
    for (const booking of await bookingsMarked(MARKER)) {
      const current = await page.request.get(
        `/api/bookings?ref=${booking.ref}`,
      );
      const list = (await current.json().catch(() => null)) as unknown;
      const row = Array.isArray(list)
        ? (list as BookingPayload[]).find((b) => b.id === booking.ref)
        : undefined;
      const paid = Number(row?.amountPaid ?? 0);
      if (paid > 0) {
        const refund = await page.request.post("/api/payments", {
          data: {
            bookingRef: String(booking.ref),
            method: "cash",
            subtotal: -paid,
            tax: 0,
            tip: 0,
            storeCreditApplied: 0,
            packagePassApplied: 0,
            loyaltyDiscountApplied: 0,
            amountCharged: -paid,
            grandTotal: -paid,
            cashReceived: -paid,
            receiptChannels: [],
            creditNote: "e2e cleanup",
          },
          failOnStatusCode: false,
        });
        if (!refund.ok())
          left.push(`refund ${booking.ref}: ${refund.status()}`);
      }
      if (booking.status !== "cancelled") {
        // The boarder is still in the kennel "Find a kennel" gave it (paying
        // is not leaving), and a cancelled booking keeps its stay's hold:
        // release the room first, as boarding-arrival does.
        await page.request.put("/api/boarding/stays", {
          data: { bookingRef: booking.ref, roomId: null },
          failOnStatusCode: false,
        });
        await page.request.patch(`/api/bookings/${booking.ref}`, {
          data: { status: "cancelled" },
          failOnStatusCode: false,
        });
      }
      // The pending e-transfer's task, closed rather than left on the board.
      const tasks = await page.request.get(
        `/api/tasks?status=all&sourceRefPrefix=${encodeURIComponent(
          `etransfer:booking:${booking.ref}:`,
        )}`,
      );
      const body = (await tasks.json().catch(() => null)) as {
        tasks?: unknown;
      } | null;
      const open = Array.isArray(body?.tasks)
        ? (body.tasks as Array<{ id: string; status: string }>).filter(
            (task) =>
              task.status !== "completed" && task.status !== "cancelled",
          )
        : [];
      for (const task of open) {
        await page.request.patch(`/api/tasks/${task.id}`, {
          data: { status: "cancelled" },
          failOnStatusCode: false,
        });
      }
    }
    // The credit this run gave, taken back in full.
    if (creditGiven) {
      const credit = await page.request.get(
        `/api/store-credit?clientRef=${CLIENT_REF}`,
      );
      const body = (await credit.json().catch(() => null)) as {
        accounts?: unknown;
      } | null;
      const balance = Array.isArray(body?.accounts)
        ? Number(
            (
              body.accounts as Array<{ clientRef: number; balance: number }>
            ).find((a) => a.clientRef === CLIENT_REF)?.balance ?? 0,
          )
        : 0;
      const spent = Math.min(CREDIT, Math.max(0, balance));
      if (spent > 0) {
        await page.request.post("/api/store-credit", {
          data: {
            clientRef: CLIENT_REF,
            amount: -spent,
            reason: "adjustment",
            note: `${MARKER} cleanup`,
          },
          failOnStatusCode: false,
        });
      }
    }
    if (originalPrefs) {
      await page.request.put(`/api/pets/${PET_REF}/grooming-preferences`, {
        data: originalPrefs,
        failOnStatusCode: false,
      });
    }
  } finally {
    await page.close();
  }
  expect(left, "cleanup left paid bookings behind").toEqual([]);
});

test.describe("the booking page, end to end", () => {
  test("boarding: journal, belongings, a note, and credit then cash", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const booking = await createBooking(page, {
      service: "boarding",
      startDate: TODAY,
      endDate: plusDays(2),
      checkInTime: "08:00",
      checkOutTime: "18:00",
      basePrice: 50,
      totalCost: 100,
    });
    await openPage(page, booking);

    // A guest with no kennel cannot be checked in (boarding-arrival), so the
    // Stay card finds one first — the same choice confirmation makes.
    const found = page.waitForResponse(
      (r) =>
        r.url().includes("/api/boarding/stays/find") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /^find a kennel$/i }).click();
    const kennel = (await (await found).json()) as { kennel?: string | null };
    expect(kennel.kennel, "a kennel free for these nights").toBeTruthy();
    await expect(page.getByText(kennel.kennel!).first()).toBeVisible({
      timeout: 30_000,
    });

    await primary(page, /^check in /i);
    await expectStatus(page, /^checked in$/i);

    // The journal: a potty break logged by hand, kept across a reload, then
    // taken back. (The planned rows depend on the facility's routine; an
    // activity logged by hand is a row on every facility.)
    await page.getByRole("tab", { name: /guest journal/i }).click();
    await expect(
      page.getByRole("link", { name: /^send report card$/i }),
    ).toBeVisible({ timeout: 60_000 });
    const potty = `E2E potty ${Date.now() % 1000}`;
    await page.getByRole("button", { name: /^\+ log activity$/i }).click();
    const logDialog = page.getByRole("dialog");
    await pill(logDialog, /^potty break$/i).click();
    await pill(logDialog, /^pee$/i).click();
    await logDialog.getByLabel(/^note/i).fill(potty);
    const logged = page.waitForResponse(
      (r) =>
        r.url().includes("/api/care-log") && r.request().method() === "POST",
    );
    await logDialog
      .getByRole("button", { name: /^log the activity$/i })
      .click();
    expect((await logged).ok()).toBe(true);
    await expect(logDialog).toBeHidden();
    const entry = page.locator("li").filter({ hasText: potty });
    await expect(entry).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await page.getByRole("tab", { name: /guest journal/i }).click();
    await expect(entry.getByRole("radio", { name: /^pee$/i })).toBeChecked({
      timeout: 60_000,
    });
    const cleared = page.waitForResponse(
      (r) =>
        r.url().includes("/api/care-log") && r.request().method() === "DELETE",
    );
    await pill(entry, /^pee$/i).click();
    expect((await cleared).ok()).toBe(true);
    // Nothing planned it, so taking the log back takes the row with it.
    await expect(entry).toHaveCount(0);

    // Belongings: added, then handed back.
    await page.getByRole("tab", { name: /^overview/i }).click();
    const item = `E2E blanket ${Date.now() % 1000}`;
    await page.getByPlaceholder(/add an item/i).fill(item);
    await page.getByRole("button", { name: /^add$/i }).click();
    const row = page.locator("div").filter({ hasText: item }).last();
    await expect(page.getByText(item)).toBeVisible({ timeout: 30_000 });
    await row
      .getByRole("button", { name: /^mark returned$/i })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: /^returned ✓$/i }).first(),
    ).toBeVisible();

    // A note for staff.
    await page.getByRole("tab", { name: /notes & history/i }).click();
    const note = `E2E note ${Date.now() % 1000}`;
    await page.getByPlaceholder(/add a note for staff/i).fill(note);
    await page.getByRole("button", { name: /^add note$/i }).click();
    await expect(page.getByText(note)).toBeVisible({ timeout: 30_000 });

    // Account credit first, the rest in cash, with change.
    const given = await page.request.post("/api/store-credit", {
      data: {
        clientRef: CLIENT_REF,
        amount: CREDIT,
        reason: "added",
        note: MARKER,
      },
      failOnStatusCode: false,
    });
    expect(given.ok(), await given.text()).toBe(true);
    creditGiven = true;
    await page.reload();
    await expect(page.getByRole("tab", { name: /^overview/i })).toBeVisible({
      timeout: 60_000,
    });
    const dialog = await openTill(page, { credit: "keep" });
    await expect(dialog.getByText(/account credit/i).first()).toBeVisible();
    await method(dialog, /^cash/i).click();
    const due = await dialog
      .getByText(/to collect$/i)
      .first()
      .textContent();
    const owed = Number((due ?? "").replace(/[^0-9.]/g, ""));
    expect(owed).toBeGreaterThan(0);
    await dialog.getByLabel(/amount received/i).fill((owed + 5).toFixed(2));
    await expect(dialog.getByText(/change due/i)).toBeVisible();
    await dialog.getByText(/give the change back/i).click();
    await dialog.getByRole("button", { name: /^record .+ cash$/i }).click();
    await finish(dialog, /payment complete/i);

    await expect
      .poll(async () => (await readBooking(page, booking.id)).paymentStatus, {
        timeout: 30_000,
      })
      .toBe("paid");
    // Paid in full on the first night, and still in the kennel: the payment
    // card takes money, and only "Check Max out" is a departure.
    expect((await readBooking(page, booking.id)).status).toBe("checked_in");
    await expectStatus(page, /^checked in$/i);
  });

  test("daycare: a new playgroup, part in cash, then a pending e-transfer that arrives", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const booking = await createBooking(page, {
      service: "daycare",
      startDate: TODAY,
      endDate: TODAY,
      checkInTime: "08:00",
      checkOutTime: "17:00",
      basePrice: 40,
      totalCost: 40,
    });
    await openPage(page, booking);
    await primary(page, /^check in /i);
    await expectStatus(page, /^checked in$/i);

    const group = `E2E pups ${Date.now() % 1000}`;
    await page.getByRole("button", { name: /^change group$/i }).click();
    const groupDialog = page.getByRole("dialog");
    await groupDialog.getByLabel(/playgroup/i).fill(group);
    await groupDialog
      .getByRole("button", { name: /^save the playgroup$/i })
      .click();
    await expect(page.getByText(group)).toBeVisible({ timeout: 30_000 });

    // $10 now, in cash: part-paid.
    let dialog = await openTill(page);
    await dialog.getByText(/^custom amount$/i).click();
    await dialog.getByLabel(/amount to collect now/i).fill("10");
    await method(dialog, /^cash/i).click();
    await dialog.getByRole("button", { name: /^record .+ cash$/i }).click();
    await finish(dialog, /payment complete/i);
    await expect(page.getByText(/^partly paid$/i)).toBeVisible({
      timeout: 30_000,
    });

    // The rest by e-transfer, not here yet: nothing paid, a task to chase.
    dialog = await openTill(page);
    await method(dialog, /^e-transfer/i).click();
    await dialog
      .getByPlaceholder(/reference or sender name/i)
      .fill("E2E-REF-1");
    await expect(
      dialog.getByRole("checkbox", { name: /mark as pending/i }),
    ).toBeChecked();
    await dialog.getByRole("button", { name: /^record e-transfer$/i }).click();
    await finish(dialog, /recorded as pending/i);
    await expect(page.getByText(/e-transfer pending/i)).toBeVisible({
      timeout: 30_000,
    });
    expect((await readBooking(page, booking.id)).paymentStatus).not.toBe(
      "paid",
    );

    const tasks = await page.request.get(
      `/api/tasks?status=all&sourceRefPrefix=${encodeURIComponent(
        `etransfer:booking:${booking.id}:`,
      )}`,
    );
    const body = (await tasks.json()) as { tasks?: unknown };
    expect(Array.isArray(body.tasks) ? body.tasks.length : 0).toBe(1);

    // It arrives.
    dialog = await openTill(page);
    await method(dialog, /^e-transfer/i).click();
    await dialog.getByRole("button", { name: /^record arrival$/i }).click();
    await expect
      .poll(async () => (await readBooking(page, booking.id)).paymentStatus, {
        timeout: 30_000,
      })
      .toBe("paid");
  });

  test("grooming: start, tick, ready, and complete with a tip; preferences kept", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const services = (await (
      await page.request.get("/api/grooming/services")
    ).json()) as unknown;
    const service = Array.isArray(services)
      ? (services as Array<{ id: string; isActive?: boolean }>).find(
          (s) => s.isActive !== false,
        )
      : undefined;
    test.skip(!service, "the facility offers no grooming service");

    const prefs = await page.request.get(
      `/api/pets/${PET_REF}/grooming-preferences`,
    );
    const before = (await prefs.json()) as Record<string, string>;
    originalPrefs = {
      cut: before.cut ?? "",
      face: before.face ?? "",
      ears: before.ears ?? "",
      shampoo: before.shampoo ?? "",
      behavior: before.behavior ?? "",
    };

    const booking = await createBooking(page, {
      service: "grooming",
      serviceType: service!.id,
      startDate: TODAY,
      endDate: TODAY,
      checkInTime: "10:00",
      checkOutTime: "12:00",
      basePrice: 60,
      totalCost: 60,
    });
    await openPage(page, booking);

    // The preferences, saved and read back.
    const cut = `E2E teddy ${Date.now() % 1000}`;
    await page
      .getByRole("button", { name: /^edit$/i })
      .last()
      .click();
    const prefsDialog = page.getByRole("dialog");
    await prefsDialog.getByLabel(/^cut$/i).fill(cut);
    await prefsDialog
      .getByRole("button", { name: /^save the preferences$/i })
      .click();
    await page.reload();
    await expect(page.getByText(cut)).toBeVisible({ timeout: 60_000 });

    await primary(page, /^check in /i);
    // The facility's own rule takes a groom's check-in straight on to "In
    // grooming" — DEFAULT_BOOKING_STATUS_RULES ships it on. Without it, the
    // header offers Start grooming, as the mock draws it.
    //
    // WAIT for the rule before pressing anything: the page says "Checked in"
    // for the moment between the arrival and the rule's write, and a press in
    // that moment lands on the same button relabelled "Mark ready for pickup"
    // — which is how a run on 2026-10-03 found the groom already ready.
    const ruled = await page
      .locator("h1")
      .locator("..")
      .getByText(/^in grooming$/i)
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(
        () => true,
        () => false,
      );
    if (!ruled) {
      await expectStatus(page, /^checked in$/i);
      await primary(page, /^start grooming$/i);
      await expectStatus(page, /^in grooming$/i);
    }

    // The groom itself, ticked done — create_booking wrote its appointment,
    // so the checklist is live (session_progress), not decoration.
    const tick = page
      .getByRole("checkbox", { name: /^mark .+ done$/i })
      .first();
    await expect(tick).toBeEnabled({ timeout: 30_000 });
    const saved = page.waitForResponse(
      (r) =>
        r.url().includes("/api/grooming/appointments") &&
        r.request().method() === "PATCH",
    );
    await tick.click();
    expect((await saved).ok()).toBe(true);
    await expect(
      page.getByRole("checkbox", { name: /^mark .+ not done$/i }).first(),
    ).toBeChecked({ timeout: 30_000 });

    await primary(page, /^mark ready for pickup$/i);
    await expectStatus(page, /^ready for pickup$/i);

    // Complete the groom: the till, by e-transfer received now, with a tip at
    // the facility's own first tier (Settings › Tips — the demo facility's are
    // 12, 16 and 22%, so no percentage is assumed here).
    await primary(page, /^complete the groom$/i);
    const dialog = await tillOpened(page);
    await method(dialog, /^e-transfer/i).click();
    await dialog.getByRole("checkbox", { name: /mark as pending/i }).uncheck();
    const tips = dialog.getByRole("radiogroup", { name: /^tip$/i });
    // A facility that asks no tip at the desk still completes the groom.
    const tipOffered = await tips
      .waitFor({ state: "visible", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (tipOffered) {
      // "No tip" first, then the tiers: the second pill is the first tier.
      const tier = tips.locator("label").nth(1);
      await tier.click();
      await expect(tier.getByRole("radio")).toBeChecked();
    }
    await dialog.getByRole("button", { name: /^record e-transfer$/i }).click();
    await finish(dialog, /payment complete/i);

    await expect
      .poll(async () => (await readBooking(page, booking.id)).paymentStatus, {
        timeout: 30_000,
      })
      .toBe("paid");
    const payments = (await (
      await page.request.get(`/api/payments?bookingRef=${booking.id}`)
    ).json()) as unknown;
    expect(Array.isArray(payments), "the payments list").toBe(true);
    if (tipOffered) {
      expect(
        (payments as Array<{ tip: number }>).some((p) => Number(p.tip) > 0),
        "the tip was recorded with the payment",
      ).toBe(true);
    }
  });

  test("training: check in, then complete the session through the till", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const booking = await createBooking(page, {
      service: "training",
      startDate: TODAY,
      endDate: TODAY,
      checkInTime: "16:00",
      checkOutTime: "17:00",
      basePrice: 60,
      totalCost: 60,
    });
    await openPage(page, booking);
    await primary(page, /^check in /i);
    await expectStatus(page, /^checked in$/i);

    await primary(page, /^complete the session$/i);
    const dialog = await tillOpened(page);
    await method(dialog, /^cash/i).click();
    await dialog.getByRole("button", { name: /^record .+ cash$/i }).click();
    await finish(dialog, /payment complete/i);
    await expect
      .poll(async () => (await readBooking(page, booking.id)).paymentStatus, {
        timeout: 30_000,
      })
      .toBe("paid");
  });

  test("a caretaker, who may not see booking money, sees no payment card", async ({
    page,
  }) => {
    test.skip(createdRefs.length === 0, "no booking was made");
    await signIn(page, ACCOUNTS.caretaker);
    await page.goto(`/employee/bookings/${createdRefs[0]}`);
    await expect(page.getByRole("tab", { name: /^overview/i })).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByText(/^balance due$/i)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^take payment/i }),
    ).toHaveCount(0);
  });
});
