import { describe, expect, test } from "bun:test";

import { facilities } from "@/data/facilities";
import {
  customerCredits,
  giftCards,
  invoices,
  payments,
} from "@/data/payments";

// ============================================================================
// A REAL CUSTOMER MUST NOT MATCH A FIXTURE ROW.
//
// ── THE ACCIDENT THIS MAKES INTO A RULE ───────────────────────────────────
//
// The customer billing screens still read `src/data/payments`. They filter it
// with `row.clientId === customer.id && row.facilityId === selectedFacility.id`
// — and `customer.id` is the REAL client's ref, because /api/clients/me
// resolves the signed-in person. Real refs start at 15 and run straight
// through the fixture's own id range, so the CLIENT half of that filter
// matches constantly: fixture client 15 and real client 15 are the same number.
//
// The only thing keeping one customer's screen clear of another's invented
// money is the FACILITY half. `useCustomerFacility` defaults to the first
// active entry of `src/data/facilities` — id 1 — while the customer-facing
// fixture rows are supposed to carry facility 11. `11 === 1` is false for
// every row, so the screens render empty, which is the correct output for a
// screen that has not been converted yet.
//
// That was written down in `use-customer-facility.tsx` as "an accident, not a
// design, so it is written down rather than relied on quietly". It was relied
// on quietly: on 2026-09-21 `src/data/payments.ts` held FIVE rows carrying
// facility 1 — three invoices and a store credit for client 15, a credit for
// client 16. Signed in as the real Alice Johnson (ref 15), the billing page
// added $40 of store credit she does not have, listed invoice #10026 which
// does not exist, and her dashboard raised a PAYMENT OVERDUE alert from
// `inv-011`. The debt map said this could not happen because every row carried
// facility 11. It did not.
//
// So the invariant is measured here rather than believed. It is a fixture
// test, which is unusual, and it earns that: the fixtures are load-bearing for
// privacy until these screens read Postgres.
// ============================================================================

/** What `useCustomerFacility` falls back to with nothing stored. */
const DEFAULT_FIXTURE_FACILITY = facilities.find((f) => f.status === "active");

describe("customer-facing fixture money cannot reach a real customer", () => {
  test("the default fixture facility is still what the provider picks", () => {
    // If this ever changes, every assertion below is measuring the wrong id
    // and would pass while the screens leaked.
    expect(DEFAULT_FIXTURE_FACILITY, "no active fixture facility").toBeTruthy();
    expect(DEFAULT_FIXTURE_FACILITY!.id).toBe(1);
  });

  const rowsOn = <T extends { facilityId: number }>(rows: T[]) =>
    rows.filter((row) => row.facilityId === DEFAULT_FIXTURE_FACILITY!.id);

  test("no invoice sits on the facility a real customer is shown", () => {
    const offenders = rowsOn(invoices).map(
      (i) => `${i.id} (client ${i.clientId}, ${i.status})`,
    );
    expect(
      offenders,
      "these invoices would be listed to the real client of that ref",
    ).toEqual([]);
  });

  test("no store credit sits on it either", () => {
    const offenders = rowsOn(customerCredits).map(
      (c) => `${c.id} (client ${c.clientId}, $${c.remainingAmount})`,
    );
    expect(
      offenders,
      "this credit would be added to a real customer's balance",
    ).toEqual([]);
  });

  test("nor a gift card", () => {
    // Gift cards match on the customer's EMAIL as well as their id, so a row
    // on the default facility has two ways to reach the wrong person.
    const offenders = rowsOn(giftCards).map(
      (g) => `${g.id} ($${g.currentBalance})`,
    );
    expect(offenders).toEqual([]);
  });

  test("nor a payment — the dashboard raises an alert from these", () => {
    // Added after the negative control PASSED when it should have failed: the
    // first row flipped back to facility 1 was in `payments`, which this file
    // did not look at. The customer dashboard filters that array for a FAILED
    // payment and raises "Action needed" from it, so it is exactly as
    // load-bearing as the other three.
    const offenders = rowsOn(payments).map(
      (p) => `${p.id} (client ${p.clientId}, ${p.status})`,
    );
    expect(offenders).toEqual([]);
  });

  test("and the fixture ids really do overlap real client refs", () => {
    // The reason the facility half has to hold: if fixture client ids were
    // outside the real range this would all be moot, and somebody would be
    // right to delete these tests. They are not.
    const ids = new Set<number>([
      ...invoices.map((i) => i.clientId),
      ...customerCredits.map((c) => c.clientId),
    ]);
    // 15 is Alice Johnson, the account the demo customer signs in as.
    expect(ids.has(15), "fixture and real client refs no longer collide").toBe(
      true,
    );
  });
});
