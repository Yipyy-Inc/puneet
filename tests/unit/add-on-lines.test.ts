import { describe, expect, test } from "bun:test";

import {
  addOnLinesFrom,
  computeAddOnsTotal,
  missingRequiredLine,
  normalizeExtraServices,
} from "@/lib/pricing/add-on-lines";
import type { ServiceAddOn } from "@/types/facility";

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

const catalogue = new Map<string, ServiceAddOn>([
  ["walk", { id: "walk", price: 8 } as ServiceAddOn],
  ["bath", { id: "bath", price: 25 } as ServiceAddOn],
  ["refund", { id: "refund", price: -5 } as ServiceAddOn],
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
