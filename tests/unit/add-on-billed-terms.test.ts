import { describe, expect, test } from "bun:test";

import { billedTermsChanged } from "@/lib/add-ons/billed-terms";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// After an add-on is edited the facility is asked whether the bookings not
// yet confirmed should take the new values. The question is only asked when
// the edit changed something a booking's line carries — its name, price, tax
// or minutes, at any location. Asked after every edit it is noise, and a
// prompt people learn to dismiss is one they dismiss when it matters.

const walk = {
  name: "Walk",
  price: 10,
  taxable: true,
  durationMin: 20,
  overrides: [
    { locationId: "north", price: 12, taxable: null, durationMin: null },
    { locationId: "south", price: null, taxable: false, durationMin: null },
  ],
};

describe("whether an edit changed what a booking's line carries", () => {
  test("the same terms are no change, in whatever order the locations come", () => {
    expect(billedTermsChanged(walk, { ...walk })).toBe(false);
    expect(
      billedTermsChanged(walk, {
        ...walk,
        name: " Walk ",
        overrides: [...walk.overrides].reverse(),
      }),
    ).toBe(false);
  });

  test("the name, the price, the tax and the minutes each are", () => {
    expect(billedTermsChanged(walk, { ...walk, name: "Long walk" })).toBe(true);
    expect(billedTermsChanged(walk, { ...walk, price: 11 })).toBe(true);
    expect(billedTermsChanged(walk, { ...walk, taxable: false })).toBe(true);
    expect(billedTermsChanged(walk, { ...walk, durationMin: 30 })).toBe(true);
  });

  test("so is one location's override, added, changed or taken away", () => {
    expect(
      billedTermsChanged(walk, {
        ...walk,
        overrides: [
          { locationId: "north", price: 13, taxable: null, durationMin: null },
          walk.overrides[1],
        ],
      }),
    ).toBe(true);
    expect(
      billedTermsChanged(walk, { ...walk, overrides: [walk.overrides[0]] }),
    ).toBe(true);
    expect(
      billedTermsChanged(
        { ...walk, overrides: [] },
        { ...walk, overrides: [walk.overrides[0]] },
      ),
    ).toBe(true);
  });
});
