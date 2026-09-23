import { describe, expect, test } from "bun:test";

import {
  importedFeeId,
  isImported,
  planGroomingChargeImport,
} from "@/lib/pricing/import-grooming-charges";
import type { ServiceCharge } from "@/lib/settings/grooming-service-charges";
import type { CustomFee } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// This importer moves money rules from a domain that reaches no bill into one
// that does. Every failure here is a real charge: a fee that arrives twice, a
// fee that arrives switched on when the facility had switched it off, or a
// per-unit charge flattened into a single number nobody typed.
//
// The last describe block is the live facility's actual list. It is not a
// hypothetical — two of its three charges move and the third is refused.

function charge(overrides: Partial<ServiceCharge> = {}): ServiceCharge {
  return {
    id: "sc-1",
    name: "No-show fee",
    description: "Charged when a client does not arrive",
    amount: 30,
    type: "flat",
    isActive: true,
    ...overrides,
  };
}

function customFee(overrides: Partial<CustomFee> = {}): CustomFee {
  return {
    id: "cf-1",
    name: "Cleaning fee",
    amount: 10,
    feeType: "flat",
    scope: "per_booking",
    autoApply: "at_checkout",
    applicableServices: ["all"],
    isActive: true,
    ...overrides,
  };
}

describe("a charge that translates", () => {
  test("a flat charge becomes a manual grooming fee", () => {
    const plan = planGroomingChargeImport([charge()], []);
    expect(plan.refused).toEqual([]);
    expect(plan.skipped).toEqual([]);
    expect(plan.fees).toHaveLength(1);
    expect(plan.fees[0]).toEqual({
      id: "gsc-sc-1",
      name: "No-show fee",
      description: "Charged when a client does not arrive",
      amount: 30,
      feeType: "flat",
      scope: "per_booking",
      // The section it came from called these "charges staff can manually
      // add". `none` is that sentence, not a convenient default.
      autoApply: "none",
      applicableServices: ["grooming"],
      isActive: true,
    });
  });

  test("a percent charge becomes a percentage fee, same number", () => {
    const plan = planGroomingChargeImport(
      [charge({ id: "sc-2", name: "Handling", type: "percent", amount: 15 })],
      [],
    );
    expect(plan.fees[0].feeType).toBe("percentage");
    expect(plan.fees[0].amount).toBe(15);
  });

  test("a charge the facility switched off arrives switched off", () => {
    // Arriving active would be this importer deciding to charge somebody.
    const plan = planGroomingChargeImport([charge({ isActive: false })], []);
    expect(plan.fees[0].isActive).toBe(false);
  });

  test("an empty description does not become an empty string on the fee", () => {
    const plan = planGroomingChargeImport([charge({ description: "" })], []);
    expect(plan.fees[0].description).toBeUndefined();
  });

  test("an unpriced charge still moves rather than being silently dropped", () => {
    // $0 is a rule the facility started and did not finish. Refusing it would
    // be this importer inventing a policy; it moves and stays editable.
    const plan = planGroomingChargeImport([charge({ amount: 0 })], []);
    expect(plan.fees).toHaveLength(1);
    expect(plan.fees[0].amount).toBe(0);
  });
});

describe("a charge that does not translate is refused by name", () => {
  test("per-15min is refused, and says which type it was", () => {
    // A custom fee has no unit. Flattening $12/15min to "$12" invents a
    // number and undercharges every long de-matting it is used on.
    const matting = charge({
      id: "sc-mat",
      name: "Matting fee",
      type: "per-15min",
      amount: 12,
    });
    const plan = planGroomingChargeImport([matting], []);
    expect(plan.fees).toEqual([]);
    expect(plan.refused).toHaveLength(1);
    expect(plan.refused[0].reason).toBe("per-15min");
    expect(plan.refused[0].charge.name).toBe("Matting fee");
  });

  test("per-km is refused too", () => {
    const plan = planGroomingChargeImport(
      [charge({ id: "sc-km", name: "Travel", type: "per-km", amount: 2 })],
      [],
    );
    expect(plan.fees).toEqual([]);
    expect(plan.refused[0].reason).toBe("per-km");
  });

  test("a refusal does not stop the charges around it moving", () => {
    const plan = planGroomingChargeImport(
      [
        charge({ id: "a", name: "No-show" }),
        charge({ id: "b", name: "Matting", type: "per-15min" }),
        charge({ id: "c", name: "Handling" }),
      ],
      [],
    );
    expect(plan.fees.map((f) => f.name)).toEqual(["No-show", "Handling"]);
    expect(plan.refused.map((r) => r.charge.name)).toEqual(["Matting"]);
  });
});

describe("running it twice does nothing the second time", () => {
  test("an already-moved charge is skipped, not duplicated", () => {
    const first = planGroomingChargeImport([charge()], []);
    expect(first.fees).toHaveLength(1);

    const second = planGroomingChargeImport([charge()], first.fees);
    expect(second.fees).toEqual([]);
    expect(second.skipped).toHaveLength(1);
    expect(second.skipped[0].reason).toBe("already-imported");
  });

  test("it is recognised by id, so renaming the fee afterwards is safe", () => {
    // A facility that renames the imported fee has not created a new one.
    const moved = customFee({
      id: importedFeeId("sc-1"),
      name: "Missed appointment",
    });
    const plan = planGroomingChargeImport([charge()], [moved]);
    expect(plan.fees).toEqual([]);
    expect(plan.skipped[0].reason).toBe("already-imported");
  });

  test("`isImported` answers the same question for the read-only list", () => {
    expect(isImported(charge(), [customFee({ id: "gsc-sc-1" })])).toBe(true);
    expect(isImported(charge(), [])).toBe(false);
  });
});

describe("a name already in use is left alone", () => {
  test("a charge whose name an existing fee holds does not move", () => {
    // The picker lists fees by name. Two "No-show fee" rows at $30 and $25
    // are indistinguishable at the moment somebody is charging a card.
    const plan = planGroomingChargeImport(
      [charge()],
      [customFee({ id: "cf-existing", name: "No-show fee" })],
    );
    expect(plan.fees).toEqual([]);
    expect(plan.skipped[0].reason).toBe("name-taken");
  });

  test("the comparison ignores case and surrounding space", () => {
    const plan = planGroomingChargeImport(
      [charge({ name: "  no-show FEE " })],
      [customFee({ name: "No-show fee" })],
    );
    expect(plan.skipped[0].reason).toBe("name-taken");
  });

  test("two grooming charges with the same name: only the first moves", () => {
    // Collides with a fee THIS RUN is adding, which an existing-fees-only
    // check would have missed.
    const plan = planGroomingChargeImport(
      [
        charge({ id: "a", name: "No-show", amount: 30 }),
        charge({ id: "b", name: "No-show", amount: 25 }),
      ],
      [],
    );
    expect(plan.fees).toHaveLength(1);
    expect(plan.fees[0].amount).toBe(30);
    expect(plan.skipped[0].reason).toBe("name-taken");
  });
});

describe("nothing to move", () => {
  test("an empty list and an absent list both plan nothing", () => {
    const empty = planGroomingChargeImport([], []);
    expect(empty).toEqual({ fees: [], refused: [], skipped: [] });
    expect(planGroomingChargeImport(undefined, undefined)).toEqual({
      fees: [],
      refused: [],
      skipped: [],
    });
  });
});

describe("the live facility's actual list", () => {
  test("two of its three charges move and the matting fee is refused", () => {
    // Read off `facility_settings` on 2026-09-23 — Paws & Co's three active
    // charges, in this order, none of which has ever reached a bill. The
    // matting fee is the expensive one and it is the one that cannot move:
    // at $20 per 15 minutes, flattening it to "$20" would undercharge every
    // de-matting over a quarter of an hour. This is the first real run, not
    // a hypothetical branch.
    const plan = planGroomingChargeImport(
      [
        charge({
          id: "demo-sc-matting",
          name: "Matting fee",
          amount: 20,
          type: "per-15min",
        }),
        charge({ id: "demo-sc-noshow", name: "No-show fee", amount: 30 }),
        charge({ id: "demo-sc-handling", name: "Extra handling", amount: 15 }),
      ],
      [],
    );
    expect(plan.fees.map((f) => [f.name, f.amount])).toEqual([
      ["No-show fee", 30],
      ["Extra handling", 15],
    ]);
    expect(plan.fees.every((f) => f.applicableServices[0] === "grooming")).toBe(
      true,
    );
    expect(plan.refused.map((r) => r.charge.name)).toEqual(["Matting fee"]);
    expect(plan.skipped).toEqual([]);
  });
});
