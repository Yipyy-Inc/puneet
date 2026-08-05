import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The facility home page counts the same day the check-in boards do.
//
// ── THE DIVERGENCE THIS CLOSES ────────────────────────────────────────────
//
// `use-unified-bookings` held five module arrays in `useState`. That was
// uniformly wrong and therefore harmless — until boarding and daycare arrivals
// became real. Then /facility/dashboard counted arrivals from fixtures dated
// March 2024 while /services/*/check-in counted them from Postgres: same
// facility, same day, two answers, one click apart.
//
// So the assertions here are DELTAS AND AGREEMENTS, not absolutes. The demo
// facility has its own history and other suites run against it; a hardcoded
// "3 guests" would be a test about the seed, not about the wiring.
//
// ── TRAINING AND CUSTOM ARE STILL FIXTURES ────────────────────────────────
//
// Deliberately, and this suite does not pretend otherwise: it asserts on the
// boarding and daycare contribution to the tiles, never on the total.
// ============================================================================

const MARKER = "[e2e dashboard-board]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
  paymentStatus?: string;
  amountPaid?: number;
  amountDue?: number;
  totalCost?: number;
}

interface BoardingGuest {
  id: string;
  petNames: string[];
  roomId: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
}

/** One booking, read back off the list — there is no GET for a single one. */
async function readBooking(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<BookingPayload | undefined> {
  const all = (await (
    await page.request.get("/api/bookings")
  ).json()) as BookingPayload[];
  return all.find((b) => b.id === ref);
}

interface RoomsPayload {
  rooms: { id: string; name: string; active: boolean }[];
  occupied: { roomId: string }[];
}

function boardingBody(roomId: string) {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 2);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "boarding",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "confirmed",
    basePrice: 180,
    discount: 0,
    totalCost: 180,
    specialRequests: MARKER,
    unitAssignment: roomId,
  };
}

/**
 * A stay that ENDS today, so the guest lands on "Going Home Today".
 *
 * The Check Out button only exists on that tab — the board derives
 * `primaryAction` from the selected tile. The first version of the payment test
 * booked three more nights and then looked for a Check Out button that the card
 * correctly did not have.
 */
function departingTodayBody(roomId: string) {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  return {
    ...boardingBody(roomId),
    startDate: start.toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  };
}

async function createBooking(
  page: import("@playwright/test").Page,
  body: Record<string, unknown>,
): Promise<BookingPayload> {
  const res = await page.request.post("/api/bookings", { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as BookingPayload;
}

async function boardingGuests(
  page: import("@playwright/test").Page,
): Promise<BoardingGuest[]> {
  const res = await page.request.get("/api/boarding/attendance");
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { guests: BoardingGuest[] }).guests;
}

/**
 * A kennel free for the WHOLE window these bookings occupy.
 *
 * The rooms endpoint defaults to "right now", so asking it bare returned a
 * kennel that was free this instant and taken for the nights the new booking
 * wanted — the exclusion constraint then refused the creation with a 409, three
 * tests into the run. The window is passed explicitly, matching `boardingBody`.
 */
async function freeRoom(
  page: import("@playwright/test").Page,
): Promise<string> {
  const from = new Date();
  from.setDate(from.getDate() - 2);
  const to = new Date();
  to.setDate(to.getDate() + 3);
  const res = await page.request.get(
    `/api/boarding/rooms?from=${from.toISOString()}&to=${to.toISOString()}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const payload = (await res.json()) as RoomsPayload;
  const room = payload.rooms.find(
    (r) =>
      r.active &&
      !r.id.includes("e2e") &&
      !payload.occupied.some((o) => o.roomId === r.id),
  );
  expect(room, "a free kennel").toBeTruthy();
  return room!.id;
}

/**
 * Select one of the board's tabs by its KPI tile.
 *
 * WAITS FOR THE BOARD FIRST, and that is the whole point of the helper. A click
 * dispatched before hydration lands on nothing and reports success — which is
 * how the first version of this suite failed, looking for a checked-in guest on
 * the arrivals tab because the tile it "clicked" had never been wired up.
 *
 * RETRIES THE CLICK, because waiting for the heading is not waiting for
 * hydration. Playwright's actionability checks pass as soon as the element is
 * visible and stable — they cannot know whether React has attached the handler
 * yet, so the first click is silently swallowed and the board stays on the
 * arrivals tab. `toPass` re-clicks until the tile actually reports itself
 * active, which is the only observable proof the handler ran.
 */
async function selectTile(
  page: import("@playwright/test").Page,
  label: RegExp,
): Promise<void> {
  await expect(
    page.getByText(/live activity board|check-in \/ check-out/i).first(),
  ).toBeVisible({ timeout: 60_000 });

  const tile = page.getByRole("button", { name: label }).first();
  await expect(async () => {
    await tile.click();
    await expect(tile).toHaveAttribute("data-active", "true", {
      timeout: 2_000,
    });
  }).toPass({ timeout: 45_000 });
}

/**
 * The card for one booking.
 *
 * VIA THE BOARD'S SEARCH BOX, which matches the reservation id. Every booking
 * in this suite uses the same demo pet, so `filter({hasText: petName})` picked
 * whichever "Buddy" card came first — the test then checked in a different
 * booking and polled the one it had created, for ever. The card does not render
 * its reference anywhere, so the search is the only handle on a single one.
 */
async function cardFor(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<import("@playwright/test").Locator> {
  const search = page.getByPlaceholder(/search reservation id/i).first();
  await expect(search).toBeVisible({ timeout: 60_000 });
  await search.fill(String(ref));
  const card = page.locator("[data-status]").first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  return card;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    let cleared = 0;
    let cancelled = 0;
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled") continue;
      const clear = await page.request.put("/api/boarding/stays", {
        data: { bookingRef: b.id, roomId: null },
      });
      if (clear.ok()) cleared++;
      const cancel = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (cancel.ok()) cancelled++;
    }
    console.log(`cleanup: ${cleared} stay(s) cleared, ${cancelled} cancelled`);
  } finally {
    await page.close();
  }
});

test.describe("the facility home board", () => {
  test.slow();

  test("a guest booked through the API appears on the dashboard", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    const created = await createBooking(page, boardingBody(room));

    const guest = (await boardingGuests(page)).find(
      (g) => g.id === String(created.id),
    );
    expect(guest, "the API has them").toBeTruthy();
    expect(guest!.status).toBe("scheduled");

    // The dashboard is where the old fixture lived. A pet created a moment ago
    // through the real endpoint could not possibly have been in it.
    await page.goto("/facility/dashboard");
    await expect(
      page.getByText(guest!.petNames[0], { exact: false }).first(),
      "the new guest is on the home board",
    ).toBeVisible({ timeout: 60_000 });
  });

  test("checking in from the dashboard reaches the database", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Its own guest. The first version reused whatever the previous test had
    // left scheduled, which made the suite order-dependent and meant a failure
    // here could be caused by a booking this test never created.
    const room = await freeRoom(page);
    const created = await createBooking(page, boardingBody(room));
    const before = (await boardingGuests(page)).find(
      (g) => g.id === String(created.id),
    );
    expect(before, "a guest to check in").toBeTruthy();
    expect(before!.status).toBe("scheduled");

    await page.goto("/facility/dashboard");
    await expect(
      page.getByText(before!.petNames[0], { exact: false }).first(),
    ).toBeVisible({ timeout: 60_000 });

    // The Check In button only exists on the "Today's Arrivals" tab — the board
    // derives `primaryAction` from the selected tile.
    await selectTile(page, /today's arrivals/i);

    const card = await cardFor(page, created.id);
    await card
      .getByRole("button", { name: /check in/i })
      .first()
      .click();

    // Scoped to the dialog: the card's button carries the same label, and
    // `.last()` across the page found the wrong one.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole("button", { name: /^check in$/i }).click();

    await expect
      .poll(
        async () =>
          (await boardingGuests(page)).find((g) => g.id === before!.id)?.status,
        { timeout: 20_000, message: "the arrival reached Postgres" },
      )
      .toBe("checked-in");
  });

  test("the dashboard and the check-in board agree on who is on site", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    const created = await createBooking(page, boardingBody(room));
    const checkedIn = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    expect(checkedIn.status(), await checkedIn.text()).toBe(201);

    const onSite = (await boardingGuests(page)).filter(
      (g) => g.status === "checked-in" && g.id === String(created.id),
    );
    expect(onSite.length, "the guest this test put on site").toBe(1);

    // Both screens, one after the other, same names. This is the whole point of
    // the change: before it, the dashboard's list came from a March-2024
    // fixture and the check-in board's from this query.
    //
    // Both boards open on ARRIVALS, so a guest already on site is on a tab that
    // has to be selected — the first version of this test looked for them on the
    // landing tab and found nothing.
    await page.goto("/facility/dashboard/services/boarding/check-in");
    await selectTile(page, /on site/i);
    for (const guest of onSite) {
      await expect(
        page.getByText(guest.petNames[0], { exact: false }).first(),
        `${guest.petNames[0]} on the boarding board`,
      ).toBeVisible({ timeout: 60_000 });
    }

    await page.goto("/facility/dashboard");
    // "Current Guests" here, "On Site" on the boarding board — two names for one
    // tile, which is its own small debt and not this change's to settle.
    await selectTile(page, /current guests/i);
    for (const guest of onSite) {
      await expect(
        page.getByText(guest.petNames[0], { exact: false }).first(),
        `${guest.petNames[0]} on the home board`,
      ).toBeVisible({ timeout: 60_000 });
    }
  });

  test("checking out from the dashboard records the payment", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    const created = await createBooking(page, departingTodayBody(room));
    const arrived = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    expect(arrived.status(), await arrived.text()).toBe(201);

    const before = await readBooking(page, created.id);
    expect(before?.paymentStatus, "nothing paid yet").toBe("pending");
    expect(Number(before?.amountPaid ?? -1)).toBe(0);
    const due = Number(before?.amountDue ?? 0);
    expect(due, "the booking has a bill").toBeGreaterThan(0);

    await page.goto("/facility/dashboard");
    // Departures live on the Going Home tab, which is where Check Out is.
    await selectTile(page, /going home today/i);

    const card = await cardFor(page, created.id);
    await card
      .getByRole("button", { name: /check out/i })
      .first()
      .click();

    // Each dialog located by its OWN title, not by `getByRole("dialog")`. Two
    // of them open in sequence here, and a bare role lookup cannot say which
    // one it found — an earlier version clicked into the wrong one and the only
    // evidence was "element detached from the DOM".
    const checkOut = page.getByRole("dialog").filter({ hasText: /check out/i });
    await expect(checkOut).toBeVisible({ timeout: 15_000 });
    await checkOut.getByRole("button", { name: /^check out$/i }).click();

    // The payment modal. TERMINAL, not cash: the cash path keeps the confirm
    // button disabled until a tendered amount covering the balance is typed in,
    // and this test is about the ledger rather than about counting change.
    // `terminal` is a tender the books recognise — `checkoutTender` throws on
    // "custom", which is the whole reason that helper exists.
    const payment = page
      .getByRole("dialog")
      .filter({ hasText: /payment checkout/i });
    await expect(payment).toBeVisible({ timeout: 15_000 });
    await payment.getByRole("button", { name: /^terminal$/i }).click();

    // Two presses by design: "Checkout & Charge" arms it, "Confirm & Charge"
    // takes the money.
    await payment.getByRole("button", { name: /checkout & charge/i }).click();
    await payment.getByRole("button", { name: /confirm & charge/i }).click();

    // THE ASSERTION THAT WOULD HAVE FAILED BEFORE THIS CHANGE. The handler
    // toasted "Charged $X" and called no payment endpoint at all, so the
    // booking stayed pending for ever.
    await expect
      .poll(async () => (await readBooking(page, created.id))?.paymentStatus, {
        timeout: 30_000,
        message: "the payment reached the ledger",
      })
      .toBe("paid");

    const after = await readBooking(page, created.id);

    // THE LATE FEE IS ON THE BILL, not stapled to the payment row.
    //
    // This stay was booked out at 11:00 and collected in the afternoon, so the
    // card computes a late-pickup fee and adds it as a LINE ITEM first — which
    // raises the booking's `amount_due`. Charging it as a loose extra on the
    // payment instead would leave the booking owing a fee its own bill had no
    // record of.
    //
    // So the bill GREW, and the assertion is against the grown one. Comparing
    // to the figure read before the checkout is what the first version of this
    // did, and it failed by exactly the fee.
    expect(
      Number(after?.amountDue ?? 0),
      "the late fee joined the bill",
    ).toBeGreaterThan(due);
    expect(
      Number(after?.amountPaid ?? 0),
      "and the payment covered the whole of it",
    ).toBeCloseTo(Number(after?.amountDue ?? 0), 2);
  });

  test("a no-show is a booking transition, not a departure", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    const created = await createBooking(page, boardingBody(room));

    // The dialog used to send `checked-out` with a noShow flag. Under the real
    // write path that asks the database to record a guest LEAVING who never
    // arrived — boarding refuses it outright, so the button would have failed.
    const wrong = await page.request.patch(
      `/api/boarding/attendance/${created.id}`,
      { data: { checkOut: true } },
    );
    expect(wrong.status(), "checking out an unarrived guest is refused").toBe(
      422,
    );

    // What the button does now.
    const res = await page.request.patch(`/api/bookings/${created.id}`, {
      data: { status: "no_show" },
    });
    expect(res.ok(), await res.text()).toBe(true);

    // And the kennel is freed, because `sync_boarding_stay` releases on no_show
    // exactly as it does on a cancellation — a guest who is not coming should
    // not hold a room.
    const stillListed = (await boardingGuests(page)).find(
      (g) => g.id === String(created.id),
    );
    expect(
      stillListed,
      "a no-show drops off today's board, having never arrived",
    ).toBeFalsy();
  });
});
