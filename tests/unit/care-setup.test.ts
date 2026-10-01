import { describe, expect, test } from "bun:test";

import { optionLabel, optionValue } from "@/lib/feeding/labels";
import { packingList } from "@/lib/feeding/schedule";
import { blankPlan, type FeedingPlan } from "@/lib/feeding/plan";
import { providedCharge } from "@/lib/medications/charges";
import { controlledSubstance } from "@/lib/medications/controlled";
import { stayOf } from "@/lib/medications/schedule";
import {
  careStepUse,
  newRowId,
  offeredTimes,
  resetRows,
  rowsAreSound,
} from "@/lib/settings/care-setup";
import {
  feedingInstructionsSchema,
  SHIPPED_FEEDING_INSTRUCTIONS,
} from "@/lib/settings/feeding-instructions";
import {
  canSell,
  isCustomMethod,
  medicationInstructionsSchema,
  providedFor,
  SHIPPED_MEDICATION_INSTRUCTIONS,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import { shellText } from "@/lib/shell/text";
import type { MedicationItem } from "@/types/booking";

// Settings › Services › Feeding & medications (2026-10-01), pinned: where the
// steps appear, the rows a facility renames, adds and resets, the quick picks
// it adds as its own words, what it sells — and the defaults, which charge
// nothing until a facility says so.

const en = (key: string) => shellText("en", "booking", key);

const BOARDING = stayOf({
  overnight: true,
  start: "2026-03-17",
  end: "2026-03-21",
});

describe("where the steps appear", () => {
  test("per service, and nowhere the page does not name", () => {
    const feeding = SHIPPED_FEEDING_INSTRUCTIONS;
    const meds = SHIPPED_MEDICATION_INSTRUCTIONS;
    expect(careStepUse(feeding, "boarding")).toBe("optional");
    expect(careStepUse(feeding, "grooming")).toBe("disabled");
    expect(careStepUse(meds, "boarding")).toBe("required");
    expect(careStepUse(meds, "daycare")).toBe("optional");
    expect(careStepUse(meds, "training")).toBe("disabled");
    // A custom service, an evaluation, nothing: no care steps.
    expect(careStepUse(meds, "evaluation")).toBe("disabled");
    expect(careStepUse(meds, "custom-123")).toBe("disabled");
    expect(careStepUse(meds, undefined)).toBe("disabled");
  });
});

describe("rows the facility edits", () => {
  test("a row it adds has an id of its own, and needs a name", () => {
    expect(newRowId("meal")).toMatch(/^meal-[0-9a-f]{8}$/);
    expect(newRowId("dose")).not.toBe(newRowId("dose"));
    const builtIn = ["breakfast", "dinner"];
    expect(
      rowsAreSound(
        [{ id: "breakfast" }, { id: "meal-1a2b3c4d", label: "Second lunch" }],
        builtIn,
      ),
    ).toBe(true);
    expect(rowsAreSound([{ id: "meal-1a2b3c4d", label: " " }], builtIn)).toBe(
      false,
    );
    expect(rowsAreSound([{ id: "dinner" }, { id: "dinner" }], builtIn)).toBe(
      false,
    );
  });

  test("the times offered are the ones on, in the order of the day", () => {
    const rows = [
      { id: "dinner", time: "17:00", on: true, preselected: true },
      { id: "breakfast", time: "07:00", on: true, preselected: true },
      { id: "lunch", time: "12:00", on: false, preselected: false },
    ];
    expect(offeredTimes(rows).map((row) => row.id)).toEqual([
      "breakfast",
      "dinner",
    ]);
  });

  test("reset brings back the defaults and keeps what the facility added", () => {
    const defaults = [
      { id: "breakfast", time: "07:00", on: true, preselected: true },
    ];
    const current = [
      {
        id: "breakfast",
        label: "Brekkie",
        time: "06:00",
        on: false,
        preselected: false,
      },
      {
        id: "meal-1a2b3c4d",
        label: "Second lunch",
        time: "15:00",
        on: true,
        preselected: false,
      },
    ];
    expect(resetRows(defaults, current, ["breakfast"])).toEqual([
      { id: "breakfast", time: "07:00", on: true, preselected: true },
      current[1],
    ]);
  });
});

describe("the feeding quick picks", () => {
  test("the vocabulary's in the reader's words, the facility's as typed", () => {
    expect(optionLabel(en, "styles", { id: "slow_feeder" })).toBe(
      "Slow feeder bowl",
    );
    const own = { id: "custom-1a2b3c4d", label: "Sing to her", on: true };
    expect(optionLabel(en, "styles", own)).toBe("Sing to her");
    // What a booking stores: the vocabulary's id, or the facility's words.
    expect(optionValue("styles", { id: "slow_feeder" })).toBe("slow_feeder");
    expect(optionValue("styles", own)).toBe("Sing to her");
    // An allergy is stored as its word, which the step reads back.
    expect(optionValue("allergies", { id: "chicken" })).toBe("Chicken");
  });

  test("extra meals are packed beyond the stay", () => {
    const plan: FeedingPlan = blankPlan(
      { plan: "p", food: "f", meal: "m" },
      1,
      { settings: SHIPPED_FEEDING_INSTRUCTIONS, stay: BOARDING },
    );
    const [row] = packingList(plan, BOARDING, 2);
    // Breakfast and dinner, five days: 10 servings, and 2 for a late pickup.
    expect([row.servings, row.extra, row.total]).toEqual([
      10,
      2,
      12 * plan.foods[0].amount,
    ]);
    expect(packingList(plan, BOARDING)[0].extra).toBe(0);
  });
});

describe("what the facility sells to give a medication with", () => {
  const selling = (
    patch: Partial<MedicationInstructions["methods"][number]>,
    id = "pill_pocket",
  ): Pick<MedicationInstructions, "methods"> => ({
    methods: [
      ...SHIPPED_MEDICATION_INSTRUCTIONS.methods,
      {
        id: "method-1a2b3c4d",
        label: "Pill gun",
        on: true,
        sell: false,
        price: 0.5,
        per: "dose" as const,
      },
    ].map((row) => (row.id === id ? { ...row, ...patch } : row)),
  });

  test("only what can be supplied is sold, and only switched on at a price", () => {
    expect(canSell("pill_pocket")).toBe(true);
    expect(canSell("syringe")).toBe(false);
    expect(canSell("method-1a2b3c4d")).toBe(true);
    expect(isCustomMethod("method-1a2b3c4d")).toBe(true);
    expect(isCustomMethod("cheese")).toBe(false);
    expect(providedFor(SHIPPED_MEDICATION_INSTRUCTIONS, "pill_pocket")).toBe(
      undefined,
    );
    expect(providedFor(selling({ sell: true }), "pill_pocket")?.price).toBe(
      0.75,
    );
    expect(
      providedFor(selling({ sell: true, price: 0 }), "pill_pocket"),
    ).toBeUndefined();
    expect(
      providedFor(selling({ sell: true, on: false }), "pill_pocket"),
    ).toBeUndefined();
  });

  test("a way of giving the facility added is sold by its own name", () => {
    const item: MedicationItem = {
      id: "m1",
      petId: 1,
      name: "Apoquel",
      amount: "1 tablet",
      doseAmount: 1,
      doseUnit: "tablet",
      form: "tablet",
      frequency: "twice_daily",
      times: ["08:00", "18:00"],
      dayRule: "except_checkout",
      adminInstructions: [],
      givenWith: "method-1a2b3c4d",
      methodLabel: "Pill gun",
      facilityProvidesMedAid: true,
      facilityMedAidItem: "method-1a2b3c4d",
      notes: "",
    };
    expect(
      providedCharge(
        item,
        BOARDING,
        selling({ sell: true }, "method-1a2b3c4d"),
      ),
    ).toMatchObject({
      method: "method-1a2b3c4d",
      label: "Pill gun",
      quantity: 8,
      unitPrice: 0.5,
      amount: 4,
    });
  });

  test("a selling row for what cannot be supplied is refused", () => {
    expect(
      medicationInstructionsSchema.safeParse({
        ...SHIPPED_MEDICATION_INSTRUCTIONS,
        methods: SHIPPED_MEDICATION_INSTRUCTIONS.methods.map((row) =>
          row.id === "syringe" ? { ...row, sell: true, price: 1 } : row,
        ),
      }).success,
    ).toBe(false);
  });
});

describe("controlled substances", () => {
  test("by generic or brand name, in either language, wherever in the name", () => {
    expect(controlledSubstance("Gabapentin")).toBe("gabapentin");
    expect(controlledSubstance("gabapentine 100 mg")).toBe("gabapentin");
    expect(controlledSubstance("Neurontin")).toBe("gabapentin");
    expect(controlledSubstance("Trazodone 50mg")).toBe("trazodone");
    expect(controlledSubstance("Phénobarbital")).toBe("phenobarbital");
    expect(controlledSubstance("Apoquel")).toBeNull();
    // A word inside another word is not the drug.
    expect(controlledSubstance("Gabapentinoid-free chew")).toBeNull();
  });
});

describe("the page as it ships", () => {
  test("charges nothing, and every key has a default for an older row", () => {
    expect(SHIPPED_FEEDING_INSTRUCTIONS.house.on).toBe(false);
    expect(SHIPPED_MEDICATION_INSTRUCTIONS.fee.mode).toBe("none");
    expect(
      SHIPPED_MEDICATION_INSTRUCTIONS.methods.find(
        (row) => row.id === "pill_pocket",
      ),
    ).toMatchObject({ sell: false, price: 0.75, per: "dose" });
    expect(feedingInstructionsSchema.parse({})).toEqual(
      SHIPPED_FEEDING_INSTRUCTIONS,
    );
    expect(medicationInstructionsSchema.parse({})).toEqual(
      SHIPPED_MEDICATION_INSTRUCTIONS,
    );
  });

  test("the design's defaults: breakfast and dinner, morning, no homemade, no injections", () => {
    expect(
      SHIPPED_FEEDING_INSTRUCTIONS.meals
        .filter((row) => row.preselected)
        .map((row) => row.id),
    ).toEqual(["breakfast", "dinner"]);
    expect(
      SHIPPED_MEDICATION_INSTRUCTIONS.times
        .filter((row) => row.preselected)
        .map((row) => row.id),
    ).toEqual(["morning"]);
    expect(SHIPPED_FEEDING_INSTRUCTIONS.foodTypes).not.toContain("homemade");
    expect(SHIPPED_MEDICATION_INSTRUCTIONS.forms).not.toContain("injection");
    expect(SHIPPED_FEEDING_INSTRUCTIONS.extraMeals).toBe(2);
    expect(SHIPPED_MEDICATION_INSTRUCTIONS.rules).toEqual({
      label: true,
      vetContact: true,
      photo: false,
      controlled: false,
    });
  });
});
