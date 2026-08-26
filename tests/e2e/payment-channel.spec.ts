import { expect, test } from "@playwright/test";

import {
  paymentChannel,
  type ChannelFacts,
  type PaymentChannel,
} from "@/lib/payments/channel";

// ============================================================================
// Was this taken at the counter or online?
//
// ── WHY THIS SPEC EXISTS ──────────────────────────────────────────────────
//
// A Yipyy payment is one object whether the card was tapped on a reader or
// typed into a browser, and the Payments screen reports the channel beside
// every row. That report is read by whoever reconciles the day's takings, and
// card-present and card-not-present are priced differently — so a row in the
// wrong column is not cosmetic.
//
// It cannot be reached through a browser: producing one real row of each kind
// needs a card, a reader, and a merchant. So the rule lives in
// `lib/payments/channel.ts` with no imports of its own and is asserted here —
// Playwright only as the runner this repo already has.
//
// Every case below was taken from the LEDGER on 2026-08-26, not invented.
// ============================================================================

const row = (facts: Partial<ChannelFacts>): ChannelFacts => ({
  processor: null,
  entry_method: null,
  method: null,
  ...facts,
});

const clover = (entry: string | null, method: string | null): ChannelFacts =>
  row({ processor: "clover", entry_method: entry, method });

test.describe("which channel took a payment", () => {
  test("a Clover ecommerce charge is online", async () => {
    // 19 rows in the ledger: 15 against bookings, 4 retail counter sales.
    expect(paymentChannel(clover("ecom", "new-card"))).toBe("online");
  });

  test("a card presented at a reader is in person", async () => {
    // swipe and contactless both appear in the ledger; chip and emv are the
    // other words Clover uses for the same thing.
    for (const entry of ["swipe", "contactless", "chip", "emv"]) {
      expect(paymentChannel(clover(entry, "terminal")), entry).toBe(
        "in_person",
      );
    }
  });

  test("a number keyed at the counter is card PRESENT, not online", async () => {
    // The card brands treat a keyed transaction at a terminal as card-present
    // and it is priced that way. Reporting it as online would misstate the fee.
    expect(paymentChannel(clover("keyed", "terminal"))).toBe("in_person");
  });

  test("a hand-recorded card payment does NOT claim to be online", async () => {
    // THE BUG THIS FILE EXISTS FOR. 206 rows — 180 `new-card` and 26
    // `card-on-file`, all with `processor IS NULL` — were reported as "Online"
    // by the old rule. None of them ever reached the Ecommerce API; a staff
    // member wrote down that a card was used. The tender is still shown in the
    // Card column, so nothing is lost by declining to guess the channel.
    expect(paymentChannel(row({ method: "new-card" }))).toBe("other");
    expect(paymentChannel(row({ method: "card-on-file" }))).toBe("other");
  });

  test("a recorded terminal payment is still in person", async () => {
    // 29 such rows. Unlike `new-card`, this method NAMES a channel: somebody is
    // saying they took it on a card reader. That is worth believing.
    expect(paymentChannel(row({ method: "terminal" }))).toBe("in_person");
  });

  test("cash and transfers are neither card channel", async () => {
    for (const method of ["cash", "e-transfer", "cheque", "store-credit"]) {
      expect(paymentChannel(row({ method })), method).toBe("other");
    }
  });

  test("an unreadable row falls back rather than throwing", async () => {
    // Rows predate columns here: `entry_method` was added after payments
    // existed, and `processor_device_serial` is null on every row in the
    // ledger including the contactless ones. Nothing may crash the screen.
    const answers: PaymentChannel[] = [
      paymentChannel(row({})),
      paymentChannel(row({ processor: "clover" })),
      paymentChannel(row({ entry_method: "  ECOM  ", processor: "clover" })),
      paymentChannel(row({ method: "TERMINAL" })),
    ];

    expect(answers[0]).toBe("other");
    // Processed, but it did not say how. Clover is an ecommerce charge unless
    // something says otherwise, and this is the only branch that guesses.
    expect(answers[1]).toBe("online");
    // Case and whitespace are normalised — `entry_method` is free text.
    expect(answers[2]).toBe("online");
    expect(answers[3]).toBe("in_person");
  });
});
