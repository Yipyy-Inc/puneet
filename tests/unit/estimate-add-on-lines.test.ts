import { describe, expect, test } from "bun:test";

import { estimateAddOnLines } from "@/lib/estimates/add-on-lines";
import {
  buildBookingDataFromEstimate,
  estimateAddOns,
  estimateFees,
  estimateFormPreselection,
} from "@/lib/estimates/convert-estimate";
import type { Estimate, EstimateLineItem } from "@/types/booking";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// An estimate's add-ons were one "Add-ons" line, and a booking made from it
// took their money into its own price — so they were on no bill line, with no
// tax of their own and nobody assigned. Now each add-on is an estimate line
// naming it, and converting sends those as the booking's add-ons. And the
// conversion no longer lets the facility's automatic fees in on top of the
// ones the estimate listed. The same for its fees: each is a line naming the
// rule that charged it, written onto the booking's bill as quoted. And "Edit"
// reopens it in the booking form with its pets and add-ons.

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
            taxable: true,
          },
          {
            ref: "addon-bath",
            rowId: BATH_ROW,
            name: "Bath",
            price: 25,
            taxable: true,
          },
        ],
      }),
    ).toEqual([
      { label: "Walk", amount: 8, quantity: 3, addOnRef: WALK, petRef: 1 },
      // Named by whatever the booking line named it by.
      { label: "Bath", amount: 25, quantity: 1, addOnRef: BATH_ROW, petRef: 2 },
    ]);
  });

  test("untaxed as the add-on is, and the share the stay brought with it", () => {
    expect(
      estimateAddOnLines({
        // Walk ×10 for Buddy: seven the boarding service attaches (one a
        // night), three chosen — the form merges them into one line.
        lines: [{ serviceId: WALK, quantity: 10, petId: 1 }],
        catalogue: [
          {
            ref: WALK,
            rowId: "22222222-2222-4222-8222-222222222222",
            name: "Walk",
            price: 8,
            taxable: false,
          },
        ],
        included: [{ serviceId: WALK, quantity: 7, petId: 1 }],
      }),
    ).toEqual([
      {
        label: "Walk",
        amount: 8,
        quantity: 10,
        addOnRef: WALK,
        petRef: 1,
        taxable: false,
        includedQuantity: 7,
      },
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
    // No fee line on it, so none is written; none is added on top either.
    expect(booking.serviceCharges).toBeUndefined();
    expect(booking.serviceChargesIncluded).toBe(true);
  });

  test("its fee lines are the booking's fee lines, and out of its price", () => {
    const booking = buildBookingDataFromEstimate(
      estimate(
        [
          line({ label: "Boarding", amount: 200, total: 200 }),
          line({
            label: "Cleaning fee",
            amount: 15,
            total: 15,
            feeId: "cleaning",
          }),
          line({
            label: "Towels",
            amount: 3,
            quantity: 2,
            total: 6,
            feeId: "towels",
            taxable: false,
          }),
          // A fee the facility set up as a discount.
          line({
            label: "Loyalty credit",
            amount: -10,
            total: -10,
            feeId: "loyalty",
          }),
          line({ label: "Other charges", amount: 12, total: 12 }),
        ],
        223,
      ),
    );
    expect(booking.serviceCharges).toEqual([
      {
        feeId: "cleaning",
        name: "Cleaning fee",
        unitPrice: 15,
        quantity: 1,
        taxable: true,
      },
      {
        feeId: "towels",
        name: "Towels",
        unitPrice: 3,
        quantity: 2,
        taxable: false,
      },
      {
        feeId: "loyalty",
        name: "Loyalty credit",
        unitPrice: -10,
        quantity: 1,
        taxable: true,
      },
    ]);
    // 223 − 15 − 6 + 10: the stay and the other charges, as a booking made in
    // the form keeps them.
    expect(booking.totalCost).toBe(212);
    expect(booking.serviceChargesIncluded).toBe(true);
  });

  test("a fee named twice, or in part, stays in the price", () => {
    const { serviceCharges, money } = estimateFees(
      estimate(
        [
          line({ label: "Cleaning", feeId: "cleaning", amount: 15, total: 15 }),
          line({ label: "Cleaning", feeId: "cleaning", amount: 15, total: 15 }),
          line({ label: "Half", feeId: "half", quantity: 0.5, total: 5 }),
        ],
        35,
      ),
    );
    expect(serviceCharges.map((c) => c.feeId)).toEqual(["cleaning"]);
    expect(money).toBe(15);
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

  test("Edit reopens it with every pet, and the add-ons the stay did not bring", () => {
    const boarding = estimate(
      [
        line({ label: "Boarding", amount: 200, total: 200 }),
        line({
          addOnRef: WALK,
          amount: 8,
          quantity: 10,
          total: 80,
          petRef: 2,
          includedQuantity: 7,
        }),
        // All of it came with the stay: the form will attach it again.
        line({
          addOnRef: "addon-bath",
          amount: 25,
          total: 25,
          includedQuantity: 1,
        }),
      ],
      305,
    );
    expect(estimateFormPreselection(boarding)).toEqual({
      petIds: [1, 2],
      extraServices: [{ serviceId: WALK, quantity: 3, petId: 2 }],
      groomingAddOnIds: [],
    });
  });

  test("a groom's add-ons reopen in the groom's own list", () => {
    expect(
      estimateFormPreselection({
        ...estimate(
          [
            line({ label: "Full groom", amount: 80, total: 80 }),
            line({ addOnRef: "ao-teeth", amount: 15, total: 15, petRef: 1 }),
            line({ addOnRef: "ao-teeth", amount: 15, total: 15, petRef: 2 }),
            line({ addOnRef: "ao-nails", amount: 10, total: 10 }),
          ],
          120,
        ),
        service: "grooming",
      }),
    ).toEqual({
      petIds: [1, 2],
      extraServices: [],
      groomingAddOnIds: ["ao-teeth", "ao-nails"],
    });
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
