import { describe, expect, test } from "bun:test";

import {
  bookingReceiptInput,
  type ReceiptPaymentRow,
} from "@/lib/payments/booking-receipt";
import { NO_TAX, type TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// A BOOKING'S RECEIPT ADDS UP TO WHAT WAS COLLECTED.
//
// The emailed receipt is built from the payment ledger, so these pin that its
// lines, tax and total agree with the payments — including a refund, a price
// changed after payment, and two payments — and that an unpaid booking gets
// no receipt at all.
// ============================================================================

const booking = {
  ref: 12345,
  serviceLabel: "Daycare",
  basePrice: 40,
  discount: 0,
  clientName: "Alice Johnson",
  petNames: ["Buddy"],
};
const facility = {
  name: "Paws & Co",
  address: "1 Main St, Montréal, QC",
  phone: null,
  email: null,
  website: null,
  logoUrl: null,
};
const pay = (patch: Partial<ReceiptPaymentRow>): ReceiptPaymentRow => ({
  method: "cash",
  subtotal: 0,
  tax: 0,
  tip: 0,
  grandTotal: 0,
  cardBrand: null,
  cardLast4: null,
  entryMethod: null,
  authCode: null,
  processorPaymentId: null,
  ...patch,
});
const quebec: TaxConfig = {
  ...NO_TAX,
  taxes: [
    {
      id: "gst",
      name: "GST",
      rate: 0.05,
      enabled: true,
      registrationNumber: "123",
      appliesTo: "all",
    },
    {
      id: "qst",
      name: "QST",
      rate: 0.09975,
      enabled: true,
      registrationNumber: "456",
      appliesTo: "all",
    },
  ],
} as TaxConfig;

const base = {
  booking,
  items: [],
  facility,
  taxConfig: NO_TAX,
  printedAt: "2026-09-19 10:00",
};

test("an unpaid booking has no receipt", () => {
  expect(bookingReceiptInput({ ...base, payments: [] })).toBe("nothing_paid");
});

test("a refunded booking has no receipt", () => {
  expect(
    bookingReceiptInput({
      ...base,
      payments: [
        pay({ subtotal: 40, grandTotal: 40 }),
        pay({ subtotal: -40, grandTotal: -40 }),
      ],
    }),
  ).toBe("nothing_paid");
});

describe("a paid booking", () => {
  test("its lines, tip and total are the ledger's", () => {
    const receipt = bookingReceiptInput({
      ...base,
      items: [{ name: "Nail trim", price: null, unitPrice: 10, quantity: 1 }],
      payments: [
        pay({
          method: "terminal",
          subtotal: 50,
          tip: 5,
          grandTotal: 55,
          cardLast4: "4242",
        }),
      ],
    });
    if (typeof receipt === "string") throw new Error(receipt);
    expect(receipt.lines.map((l) => l.amountCents)).toEqual([4000, 1000]);
    expect(receipt.subtotalCents).toBe(5000);
    expect(receipt.tipCents).toBe(500);
    expect(receipt.totalCents).toBe(5500);
    expect(receipt.paymentMethod).toBe("Card (terminal)");
    expect(receipt.cardLast4).toBe("4242");
  });

  test("a price changed after payment shows as its own line", () => {
    const receipt = bookingReceiptInput({
      ...base,
      booking: { ...booking, basePrice: 45 },
      payments: [pay({ subtotal: 40, grandTotal: 40 })],
    });
    if (typeof receipt === "string") throw new Error(receipt);
    const sum = receipt.lines.reduce((s, l) => s + l.amountCents, 0);
    expect(sum - receipt.discountCents).toBe(receipt.subtotalCents);
  });

  test("the tax splits by name when the rates reproduce it", () => {
    const receipt = bookingReceiptInput({
      ...base,
      taxConfig: quebec,
      payments: [pay({ subtotal: 40, tax: 5.99, grandTotal: 45.99 })],
    });
    if (typeof receipt === "string") throw new Error(receipt);
    expect(receipt.taxLines.map((t) => t.name)).toEqual(["GST", "QST"]);
    expect(receipt.taxLines.reduce((s, t) => s + t.amountCents, 0)).toBe(599);
    // The facility shows its registration numbers on paper (the default).
    expect(receipt.facility.taxRegistrations).toBe("GST: 123 · QST: 456");
  });

  test("a tax the rates do not reproduce is one line, not a wrong split", () => {
    const receipt = bookingReceiptInput({
      ...base,
      taxConfig: quebec,
      payments: [pay({ subtotal: 40, tax: 5, grandTotal: 45 })],
    });
    if (typeof receipt === "string") throw new Error(receipt);
    expect(receipt.taxLines).toHaveLength(1);
    expect(receipt.taxLines[0].amountCents).toBe(500);
  });

  test("two payments say so rather than naming one card", () => {
    const receipt = bookingReceiptInput({
      ...base,
      payments: [
        pay({ method: "cash", subtotal: 20, grandTotal: 20 }),
        pay({
          method: "new-card",
          subtotal: 20,
          grandTotal: 20,
          cardLast4: "1111",
        }),
      ],
    });
    if (typeof receipt === "string") throw new Error(receipt);
    expect(receipt.paymentMethod).toBe("Paid in 2 payments");
    expect(receipt.cardLast4).toBeNull();
    expect(receipt.totalCents).toBe(4000);
  });
});
