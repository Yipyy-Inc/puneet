import { describe, expect, test } from "bun:test";

import { estimateAddOnLines } from "@/lib/estimates/add-on-lines";
import {
  buildBookingDataFromEstimate,
  estimateAddOns,
} from "@/lib/estimates/convert-estimate";
import type { Estimate, EstimateLineItem } from "@/types/booking";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// An estimate's add-ons were one "Add-ons" line, and a booking made from it
// took their money into its own price — so they were on no bill line, with no
// tax of their own and nobody assigned. Now each add-on is an estimate line
// naming it, and converting sends those as the booking's add-ons. And the
// conversion no longer lets the facility's automatic fees in on top of the
// ones the estimate listed.

const WALK = "addon-walk";
const BATH_ROW = "11111111-1111-4111-8111-111111111111";

describe("an estimate's add-on lines, from the booking form", () => {
  test("one line per add-on per pet, at the quoted price, named as a booking names it", () => {
    expect(
      estimateAddOnLines({
        lines: [
          { serviceId: WALK, quantity: 3, petId: 1 },
          { serviceId: BATH_ROW, quantity: 1, petId: 2 },
          // An add-on the price list no longer has: the quote left it out.
          { serviceId: "addon-gone", quantity: 1, petId: 1 },
        ],
        catalogue: [
          {
            ref: WALK,
            rowId: "22222222-2222-4222-8222-222222222222",
            name: "Walk",
            price: 8,
          },
          { ref: "addon-bath", rowId: BATH_ROW, name: "Bath", price: 25 },
        ],
      }),
    ).toEqual([
      { label: "Walk", amount: 8, quantity: 3, addOnRef: WALK, petRef: 1 },
      // Named by whatever the booking line named it by.
      { label: "Bath", amount: 25, quantity: 1, addOnRef: BATH_ROW, petRef: 2 },
    ]);
  });

  test("a groom's add-ons, on the pet being groomed", () => {
    expect(
      estimateAddOnLines({
        lines: [],
        catalogue: [],
        groom: {
          addOnIds: ["ao-teeth", "ao-unknown"],
          petRef: 4,
          offers: [{ id: "ao-teeth", name: "Teeth", price: 15 }],
        },
      }),
    ).toEqual([
      {
        label: "Teeth",
        amount: 15,
        quantity: 1,
        addOnRef: "ao-teeth",
        petRef: 4,
      },
    ]);
  });
});

const estimate = (
  lineItems: EstimateLineItem[],
  subtotal: number,
): Estimate => ({
  id: "e1",
  estimateId: "EST-0001",
  clientId: 15,
  clientName: "Alice",
  clientEmail: "alice@example.invalid",
  petIds: [1, 2],
  petNames: ["Buddy", "Max"],
  service: "boarding",
  startDate: "2026-10-10",
  endDate: "2026-10-12",
  lineItems,
  subtotal,
  discount: 5,
  taxRate: 0,
  taxAmount: 0,
  total: subtotal - 5,
  status: "accepted",
  createdAt: "2026-09-30T00:00:00Z",
  createdBy: "Staff",
});

const line = (patch: Partial<EstimateLineItem>): EstimateLineItem => ({
  label: "Line",
  amount: 10,
  quantity: 1,
  total: 10,
  ...patch,
});

describe("an estimate, as the booking it becomes", () => {
  test("its add-on lines are the booking's add-ons, and out of its price", () => {
    const booking = buildBookingDataFromEstimate(
      estimate(
        [
          line({ label: "Boarding", amount: 200, total: 200 }),
          line({
            label: "Walk",
            amount: 8,
            quantity: 3,
            total: 24,
            addOnRef: WALK,
            petRef: 2,
          }),
          // No pet named: the estimate's first.
          line({
            label: "Bath",
            amount: 25,
            total: 25,
            addOnRef: "addon-bath",
          }),
          line({ label: "Fees and adjustments", amount: 15, total: 15 }),
        ],
        264,
      ),
    );
    expect(booking.extraServices).toEqual([
      { serviceId: WALK, quantity: 3, petId: 2 },
      { serviceId: "addon-bath", quantity: 1, petId: 1 },
    ]);
    // 264 − 24 − 25: the service and the fees the estimate listed.
    expect(booking.totalCost).toBe(215);
    expect(booking.basePrice).toBe(215);
    expect(booking.discount).toBe(5);
    // The estimate's fees are inside that price; none are added on top.
    expect(booking.serviceChargesIncluded).toBe(true);
  });

  test("an estimate from before, with one Add-ons line, converts as it did", () => {
    const booking = buildBookingDataFromEstimate(
      estimate(
        [
          line({ label: "Boarding", amount: 200, total: 200 }),
          line({ label: "Add-ons", amount: 49, total: 49 }),
        ],
        249,
      ),
    );
    expect(booking.extraServices).toBeUndefined();
    expect(booking.totalCost).toBe(249);
    expect(booking.serviceChargesIncluded).toBe(true);
  });

  test("a line for a pet the estimate no longer has goes to its first", () => {
    // A revision took the pet off and left its add-on: still sold, still a
    // line — never one naming a pet the booking will not hold.
    expect(
      estimateAddOns(estimate([line({ addOnRef: WALK, petRef: 9 })], 10))
        .extraServices,
    ).toEqual([{ serviceId: WALK, quantity: 1, petId: 1 }]);
  });

  test("a line that cannot be an add-on line stays in the price", () => {
    const { extraServices, money } = estimateAddOns({
      ...estimate(
        [
          line({ addOnRef: WALK, quantity: 1.5, total: 15 }),
          line({ addOnRef: WALK, quantity: 0, total: 0 }),
        ],
        15,
      ),
    });
    expect(extraServices).toEqual([]);
    expect(money).toBe(0);
    // And with no pet at all, nothing to put an add-on on.
    expect(
      estimateAddOns({
        ...estimate([line({ addOnRef: WALK })], 10),
        petIds: [],
      }).extraServices,
    ).toEqual([]);
  });
});
