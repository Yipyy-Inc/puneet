import { describe, expect, test } from "bun:test";

import {
  addOnLinesFrom,
  computeAddOnsTotal,
  missingRequiredLine,
  normalizeExtraServices,
  requestAddOnLines,
  sameAddOnSelection,
} from "@/lib/pricing/add-on-lines";
import { editablePatch } from "@/components/bookings/use-save-booking-edit";
import type { Booking, NewBooking } from "@/types/booking";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// The add-on arithmetic the booking form and the server's re-price share. A
// difference of a cent between them is a customer's booking that silently
// stays a request, so the edges are the point: merging, junk in a stored
// booking, a missing default, and the pets listed in another order.

const line = (serviceId: string, quantity: number, petId = 1) => ({
  serviceId,
  quantity,
  petId,
});

const catalogue = new Map<string, { price: number }>([
  ["walk", { price: 8 }],
  ["bath", { price: 25 }],
  ["refund", { price: -5 }],
]);

describe("merging add-on lines", () => {
  test("one line per add-on per pet, whole quantities, nothing at zero", () => {
    expect(
      normalizeExtraServices([
        line("walk", 2),
        line("walk", 1.4),
        line("walk", 1, 2),
        line("bath", 0),
        line("bath", -1),
      ]),
    ).toEqual([line("walk", 3), line("walk", 1, 2)]);
  });

  test("a stored booking's lines are read as untrusted input", () => {
    expect(
      addOnLinesFrom([
        line("walk", 2),
        { serviceId: "bath", quantity: "1", petId: 1 },
        null,
        "walk",
        { serviceId: 7, quantity: 1, petId: 1 },
      ]),
    ).toEqual([line("walk", 2)]);
    expect(addOnLinesFrom({ serviceId: "walk" })).toEqual([]);
    expect(addOnLinesFrom(undefined)).toEqual([]);
  });
});

describe("pricing them", () => {
  test("catalogue price × quantity; unknown counts nothing, negative is not a refund", () => {
    expect(
      computeAddOnsTotal(
        [line("walk", 3), line("bath", 1), line("gone", 4), line("refund", 2)],
        catalogue,
      ),
    ).toBe(3 * 8 + 25);
  });
});

describe("a service's defaults are still on the booking", () => {
  test("all there, or more, passes", () => {
    expect(
      missingRequiredLine(
        [line("walk", 4), line("bath", 1)],
        [line("walk", 4)],
      ),
    ).toBeNull();
  });

  test("one taken off, or cut short, is named", () => {
    expect(missingRequiredLine([line("bath", 1)], [line("walk", 4)])).toBe(
      "walk",
    );
    expect(missingRequiredLine([line("walk", 3)], [line("walk", 4)])).toBe(
      "walk",
    );
  });

  test("a per-booking add-on on another pet than expected still counts", () => {
    // The form put the pick-up on Buddy, the server listed Daisy first.
    expect(
      missingRequiredLine([line("bath", 1, 1)], [line("bath", 1, 2)]),
    ).toBeNull();
  });
});

// ── THE LINES A REQUEST IS BILLED (2026-09-30) ────────────────────────────
//
// A booking's add-ons are bill lines the server writes from this list. What
// is on it is what is charged, so: nothing that is not a line, a groom's
// add-ons for the pet being groomed, and the staff member kept.

describe("the add-on lines a request is billed", () => {
  test("the chosen lines, merged, with their staff member", () => {
    expect(
      requestAddOnLines(
        {
          service: "daycare",
          extraServices: [
            { ...line("walk", 1), staffId: "staff-1" },
            line("walk", 2),
            "bath",
          ],
        },
        undefined,
      ),
    ).toEqual([{ ...line("walk", 3), staffId: "staff-1" }]);
  });

  test("a groom's add-ons are one line each for the pet being groomed", () => {
    expect(
      requestAddOnLines(
        { service: "grooming", groomingAddOns: ["nails", "teeth"] },
        7,
      ),
    ).toEqual([line("nails", 1, 7), line("teeth", 1, 7)]);
  });

  test("only a groom has them, and only with a pet to bill them to", () => {
    expect(
      requestAddOnLines({ service: "daycare", groomingAddOns: ["nails"] }, 7),
    ).toEqual([]);
    expect(
      requestAddOnLines(
        { service: "grooming", groomingAddOns: ["nails"] },
        undefined,
      ),
    ).toEqual([]);
  });
});

describe("whether an edit changed the add-ons", () => {
  test("the same add-ons in another order, or split over rows, are the same", () => {
    expect(
      sameAddOnSelection(
        [line("walk", 2), line("bath", 1, 2)],
        [line("bath", 1, 2), line("walk", 1), line("walk", 1)],
      ),
    ).toBe(true);
  });

  test("none is none, however it is written", () => {
    expect(sameAddOnSelection(undefined, [])).toBe(true);
    expect(sameAddOnSelection([], [line("walk", 0)])).toBe(true);
  });

  test("a quantity, a pet or a staff member is a change", () => {
    expect(sameAddOnSelection([line("walk", 1)], [line("walk", 2)])).toBe(
      false,
    );
    expect(sameAddOnSelection([line("walk", 1)], [line("walk", 1, 2)])).toBe(
      false,
    );
    expect(
      sameAddOnSelection(
        [line("walk", 1)],
        [{ ...line("walk", 1), staffId: "staff-1" }],
      ),
    ).toBe(false);
    expect(sameAddOnSelection([line("walk", 1)], undefined)).toBe(false);
  });
});

describe("what an edit sends about the add-ons", () => {
  const booking = (extraServices?: Booking["extraServices"]) =>
    ({ id: 1, totalCost: 40, extraServices }) as unknown as Booking;
  const edited = (extraServices?: NewBooking["extraServices"]) =>
    ({ totalCost: 40, extraServices }) as unknown as NewBooking;

  test("the last add-on taken off is sent as an empty list", () => {
    // The form omits an empty selection; read as "unchanged", the line stayed
    // on the bill.
    expect(
      editablePatch(booking([line("walk", 1)]), edited(undefined)),
    ).toEqual({ extraServices: [] });
  });

  test("the same selection is not sent at all", () => {
    expect(
      editablePatch(
        booking([line("walk", 1), line("bath", 1)]),
        edited([line("bath", 1), line("walk", 1)]),
      ),
    ).toEqual({});
    expect(editablePatch(booking(undefined), edited(undefined))).toEqual({});
  });

  test("a changed one is sent as the form holds it", () => {
    expect(
      editablePatch(booking([line("walk", 1)]), edited([line("walk", 2)])),
    ).toEqual({ extraServices: [line("walk", 2)] });
  });
});
