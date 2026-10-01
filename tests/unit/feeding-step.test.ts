import { describe, expect, test } from "bun:test";

import { itemsForOtherPets } from "@/lib/bookings/care-pets";
import { houseFoodCharges } from "@/lib/feeding/charges";
import { describeFeeding, panelFoodWords } from "@/lib/feeding/describe";
import {
  blankPlan,
  copyPlan,
  feedingProfileAfterBooking,
  itemFromPlan,
  itemFromProfile,
  offeredFeedingDayRules,
  planFromItem,
  planProblem,
  profileEntryOf,
  startingFood,
  type FeedingPlan,
  type PlanContext,
  type PlanFood,
} from "@/lib/feeding/plan";
import { feedUnitOption, portionWords } from "@/lib/feeding/portion";
import {
  feedingRows,
  foodServings,
  packingList,
  planDays,
  totalMeals,
} from "@/lib/feeding/schedule";
import {
  ALLERGY_KEY,
  EATING_HABITS,
  FEED_UNITS,
  FEEDING_STYLES,
  FOOD,
  FOOD_TYPES,
  MEAL_SLOTS,
  PACKS,
  PORTION,
  PREP,
  SKIP_ACTIONS,
  STORAGE,
  TREATS,
} from "@/lib/feeding/vocabulary";
import {
  careChargeLines,
  careChargeTotal,
  houseFoodFeeId,
  MEALS_FEE_ID,
} from "@/lib/medications/charges";
import { stayOf, type MedStay } from "@/lib/medications/schedule";
import { NO_CARE_FEES, type CareFees } from "@/lib/settings/care-fees";
import {
  feedingInstructionsSchema,
  SHIPPED_FEEDING_INSTRUCTIONS,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import { SHIPPED_MEDICATION_INSTRUCTIONS } from "@/lib/settings/medication-instructions";
import { shellText } from "@/lib/shell/text";
import type { FeedingScheduleItem } from "@/types/booking";

// The client's design for the booking form's Feeding step, pinned: each
// unit's quick picks and steps, the plan's defaults, the meals and portions
// over the stay, the packing list, the panel's days — and the charge for the
// facility's house food, which the form shows and the server writes from the
// same function. Older rows, read from the real shapes stored today, keep
// their meal ids (the care log keys on them) and what the step does not ask.

const en = (key: string) => shellText("en", "booking", key);
const fr = (key: string) => shellText("fr", "booking", key);

/** The mock's stay: Tue Mar 17 to Sat Mar 21 — four nights, five days. */
const BOARDING: MedStay = stayOf({
  overnight: true,
  start: "2026-03-17",
  end: "2026-03-21",
});
const DAYCARE: MedStay = stayOf({
  overnight: false,
  dates: ["2026-03-17", "2026-03-19", "2026-03-23"],
});

/** The mock's three house foods, switched on and charged per meal. */
const HOUSE: FeedingInstructions = {
  ...SHIPPED_FEEDING_INSTRUCTIONS,
  house: {
    on: true,
    pricing: "meal",
    foods: [
      {
        id: "hf-std",
        name: "House kibble",
        description: "Adult, chicken & rice",
        type: "kibble",
        unit: "cup",
        pricePerMeal: 3.5,
        pricePerDay: 8,
        on: true,
      },
      {
        id: "hf-sens",
        name: "Sensitive-stomach kibble",
        description: "Grain-free, salmon",
        type: "kibble",
        unit: "cup",
        pricePerMeal: 4.5,
        pricePerDay: 10,
        on: true,
      },
      {
        id: "hf-wet",
        name: "Canned wet food",
        description: "Chicken pâté, 13 oz can",
        type: "wet",
        unit: "can",
        pricePerMeal: 2.5,
        pricePerDay: 6,
        on: true,
      },
    ],
  },
};

/** HOUSE with its house food changed. */
const withHouse = (
  patch: Partial<FeedingInstructions["house"]>,
): FeedingInstructions => ({ ...HOUSE, house: { ...HOUSE.house, ...patch } });

const CTX: PlanContext = { settings: HOUSE, stay: BOARDING };
const WORDS = { ...CTX, t: en, locale: "en" as const };
const IDS = { plan: "feed-bella", food: "food-1", meal: "custom-1" };

const ownFood = (patch: Partial<PlanFood>): PlanFood => ({
  ...startingFood("food-x", HOUSE),
  ...patch,
});

/** The mock's Bella: Orijen kibble every meal, a quarter can of wet at dinner. */
function bella(): FeedingPlan {
  return {
    ...blankPlan(IDS, 1, CTX),
    foods: [
      ownFood({ id: "food-1", brand: "Orijen Original", prep: ["serve_dry"] }),
      ownFood({
        id: "food-2",
        type: "wet",
        brand: "Hill’s Chicken Stew",
        unit: "can",
        amount: 0.25,
        servedAt: ["dinner"],
        prep: ["mix_into_kibble"],
        pack: "cans_or_pouches",
      }),
    ],
    styles: ["feed_alone", "slow_feeder"],
    habits: ["eats_fast"],
    allergies: ["Beef"],
  };
}

const houseKibble = (id = "food-3", patch: Partial<PlanFood> = {}): PlanFood =>
  ownFood({
    id,
    source: "house",
    houseFoodId: "hf-std",
    houseFoodName: "House kibble",
    ...patch,
  });

describe("the design's vocabulary", () => {
  test("every unit's quick picks, step and fractions, as the design's table", () => {
    expect(PORTION.cup).toEqual({
      presets: [0.25, 0.5, 0.75, 1, 1.5, 2],
      step: 0.25,
      fraction: true,
    });
    expect(PORTION.scoop).toEqual({
      presets: [0.5, 1, 1.5, 2],
      step: 0.25,
      fraction: true,
    });
    expect(PORTION.g).toEqual({
      presets: [50, 100, 150, 200, 300],
      step: 10,
      fraction: false,
    });
    expect(PORTION.oz).toEqual({
      presets: [2, 4, 6, 8],
      step: 1,
      fraction: false,
    });
    expect(PORTION.can).toEqual({
      presets: [0.25, 0.5, 1],
      step: 0.25,
      fraction: true,
    });
    expect(PORTION.tbsp).toEqual({
      presets: [1, 2, 3],
      step: 0.5,
      fraction: true,
    });
    expect(PORTION.lb).toEqual({
      presets: [0.25, 0.5, 1],
      step: 0.25,
      fraction: true,
    });
    expect(PORTION.patty).toEqual({
      presets: [0.5, 1, 2],
      step: 0.5,
      fraction: true,
    });
    expect(PORTION.nugget).toEqual({
      presets: [2, 4, 6, 8],
      step: 1,
      fraction: false,
    });
    expect(PORTION.pack).toEqual({
      presets: [0.5, 1],
      step: 0.5,
      fraction: true,
    });
    expect(PORTION.container).toEqual({
      presets: [0.5, 1],
      step: 0.5,
      fraction: true,
    });
    expect(PORTION.pouch).toEqual({
      presets: [0.5, 1],
      step: 0.5,
      fraction: true,
    });
    expect(PORTION.ml).toEqual({
      presets: [15, 30, 60, 120],
      step: 5,
      fraction: false,
    });
    expect(PORTION.custom).toEqual({
      presets: [0.5, 1, 2],
      step: 0.5,
      fraction: true,
    });
  });

  test("each kind of food: its units, where it is kept, how it is prepared", () => {
    expect(FOOD.kibble.units).toEqual(["cup", "scoop", "g", "oz"]);
    expect(FOOD.wet.units).toEqual(["can", "tbsp", "oz", "g"]);
    expect(FOOD.raw.units).toEqual(["g", "oz", "lb", "cup"]);
    expect(FOOD.patties.units).toEqual(["patty", "nugget", "g"]);
    expect(FOOD.freeze_dried.units).toEqual(["nugget", "cup", "g"]);
    expect(FOOD.dehydrated.units).toEqual(["cup", "scoop", "g"]);
    expect(FOOD.fresh.units).toEqual(["pack", "cup", "g"]);
    expect(FOOD.homemade.units).toEqual(["cup", "container", "g"]);
    expect(FOOD.prescription.units).toEqual(["cup", "can", "g"]);
    expect(FOOD.topper.units).toEqual(["tbsp", "pouch", "ml"]);
    expect(FOOD.other.units).toEqual(["custom"]);
    expect(FOOD.prescription.note).toBe("prescription");
    expect(FOOD.other.storage).toBeNull();
    expect(FOOD.other.prep).toEqual([]);
    expect(FOOD.kibble.prep).toEqual([
      "serve_dry",
      "soak_warm_water",
      "splash_of_water",
      "mix_with_wet_food",
    ]);
  });

  test("every word the step shows is in both catalogues", () => {
    const pascal = (id: string) =>
      id
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
    const keys = [
      ...FOOD_TYPES.map((v) => `feedType${pascal(v)}`),
      ...FOOD_TYPES.map((v) => `feedBrandPh${pascal(v)}`),
      ...STORAGE.map((v) => `feedStore${pascal(v)}`),
      ...PREP.map((v) => `feedPrep${pascal(v)}`),
      ...PACKS.map((v) => `feedPack${pascal(v)}`),
      ...MEAL_SLOTS.map((v) => `feedSlot${pascal(v)}`),
      ...FEEDING_STYLES.map((v) => `feedStyle${pascal(v)}`),
      ...EATING_HABITS.map((v) => `feedHabit${pascal(v)}`),
      ...SKIP_ACTIONS.map((v) => `feedSkip${pascal(v)}`),
      ...TREATS.map((v) => `feedTreats${pascal(v)}`),
      ...Object.values(ALLERGY_KEY),
    ];
    for (const key of keys) {
      expect(en(key)).not.toBe(key);
      expect(fr(key)).not.toBe(key);
    }
    for (const unit of FEED_UNITS) {
      expect(feedUnitOption(fr, unit)).not.toContain("feedUnit");
    }
  });
});

describe("one portion in words", () => {
  test("the design's portions, singular up to one in English", () => {
    expect(portionWords(en, { amount: 1, unit: "cup" }, "en")).toBe("1 cup");
    expect(portionWords(en, { amount: 0.5, unit: "cup" }, "en")).toBe("½ cup");
    expect(portionWords(en, { amount: 1.5, unit: "cup" }, "en")).toBe(
      "1½ cups",
    );
    expect(portionWords(en, { amount: 0.25, unit: "can" }, "en")).toBe("¼ can");
    expect(portionWords(en, { amount: 150, unit: "g" }, "en")).toBe("150 g");
    expect(portionWords(en, { amount: 2, unit: "nugget" }, "en")).toBe(
      "2 nuggets",
    );
  });

  test("a unit of the owner's own, or 'portion' when none is typed", () => {
    expect(
      portionWords(
        en,
        { amount: 2, unit: "custom", customUnit: "handful" },
        "en",
      ),
    ).toBe("2 handfuls");
    expect(portionWords(en, { amount: 1, unit: "custom" }, "en")).toBe(
      "1 portion",
    );
    expect(portionWords(en, { amount: 2, unit: "custom" }, "en")).toBe(
      "2 portions",
    );
  });

  test("French: singular below two, glyphs kept, its own words", () => {
    expect(portionWords(fr, { amount: 1.5, unit: "cup" }, "fr")).toBe(
      "1½ tasse",
    );
    expect(portionWords(fr, { amount: 2, unit: "cup" }, "fr")).toBe("2 tasses");
    expect(portionWords(fr, { amount: 0.25, unit: "can" }, "fr")).toBe(
      "¼ boîte",
    );
  });

  test("the unit choice says grams and Custom, as the design does", () => {
    expect(feedUnitOption(en, "g")).toBe("grams");
    expect(feedUnitOption(en, "custom")).toBe("Custom");
    expect(feedUnitOption(en, "cup")).toBe("cup");
  });
});

describe("a new plan", () => {
  test("starts as the design does", () => {
    const plan = blankPlan(IDS, 1, CTX);
    expect(plan.meals).toEqual([
      { id: "breakfast", slot: "breakfast", time: "07:00" },
      { id: "dinner", slot: "dinner", time: "17:00" },
    ]);
    expect(plan.dayRule).toBe("every_day");
    expect(plan.certainDays).toEqual(BOARDING.days);
    expect(plan.foods).toEqual([
      {
        id: "food-1",
        source: "own",
        type: "kibble",
        brand: "",
        houseFoodId: "",
        houseFoodName: "",
        unit: "cup",
        customUnit: "",
        amount: 1,
        servedAt: null,
        prep: [],
        pack: "pre_portioned",
      },
    ]);
    expect([plan.skip, plan.treats, plan.saveToProfile]).toEqual([
      "offer_again_30",
      "house",
      true,
    ]);
  });

  test("takes the first meal time offered, or a custom time, when breakfast and dinner are off", () => {
    const noBreakfast: FeedingInstructions = {
      ...HOUSE,
      meals: HOUSE.meals.map((slot) =>
        slot.id === "breakfast" || slot.id === "dinner"
          ? { ...slot, on: false }
          : slot,
      ),
    };
    expect(
      blankPlan(IDS, 1, { settings: noBreakfast, stay: BOARDING }).meals,
    ).toEqual([{ id: "lunch", slot: "lunch", time: "12:00" }]);
    const noSlots: FeedingInstructions = {
      ...HOUSE,
      meals: HOUSE.meals.map((slot) => ({ ...slot, on: false })),
    };
    expect(
      blankPlan(IDS, 1, { settings: noSlots, stay: BOARDING }).meals,
    ).toEqual([{ id: "custom-1", time: "15:00" }]);
  });

  test("offers the design's days in its order — and a daycare booking its own", () => {
    expect(offeredFeedingDayRules(HOUSE, BOARDING)).toEqual([
      "every_day",
      "except_checkout",
      "certain_dates",
    ]);
    expect(offeredFeedingDayRules(HOUSE, DAYCARE)).toEqual([
      "every_day",
      "certain_dates",
    ]);
  });
});

describe("meals over the stay", () => {
  test("2 meals × 5 days, and a food served at dinner only", () => {
    const plan = bella();
    expect(totalMeals(plan, BOARDING)).toBe(10);
    expect(foodServings(plan, plan.foods[1], BOARDING)).toBe(5);
    const notCheckout = { ...plan, dayRule: "except_checkout" as const };
    expect(planDays(notCheckout, BOARDING)).toHaveLength(4);
    expect(totalMeals(notCheckout, BOARDING)).toBe(8);
    const certain = {
      ...plan,
      dayRule: "certain_dates" as const,
      certainDays: ["2026-03-17", "2026-03-19"],
    };
    expect(totalMeals(certain, BOARDING)).toBe(4);
  });

  test("the packing list: portions for pre-portioned food, an amount otherwise", () => {
    const rows = packingList(bella(), BOARDING);
    expect(rows.map((row) => [row.food.id, row.servings, row.total])).toEqual([
      ["food-1", 10, 10],
      ["food-2", 5, 1.25],
    ]);
  });

  test("the panel's days: tags, meals by time, the foods at each", () => {
    const rows = feedingRows(bella(), BOARDING);
    expect(rows.map((row) => row.tag)).toEqual([
      "check_in",
      null,
      null,
      null,
      "checkout",
    ]);
    expect(rows[0].meals.map((m) => m.meal.id)).toEqual([
      "breakfast",
      "dinner",
    ]);
    expect(rows[0].meals[0].foods.map((f) => f.id)).toEqual(["food-1"]);
    expect(rows[0].meals[1].foods.map((f) => f.id)).toEqual([
      "food-1",
      "food-2",
    ]);
    const notCheckout = feedingRows(
      { ...bella(), dayRule: "except_checkout" },
      BOARDING,
    );
    expect(notCheckout[4].meals).toEqual([]);
    expect(
      feedingRows(null, BOARDING).every((row) => row.meals.length === 0),
    ).toBe(true);
  });

  test("the panel names a food by its kind in lower case, and a house food as the facility typed it", () => {
    const [kibble, wet] = bella().foods;
    expect(panelFoodWords(en, kibble, "en", HOUSE)).toBe("1 cup dry kibble");
    expect(panelFoodWords(en, wet, "en", HOUSE)).toBe("¼ can wet / canned");
    expect(panelFoodWords(en, houseKibble(), "en", HOUSE)).toBe(
      "1 cup House kibble",
    );
    // A brand is a name, not a word to fold.
    const branded = withHouse({
      foods: HOUSE.house.foods.map((food) =>
        food.id === "hf-std" ? { ...food, name: "Hill's Science Diet" } : food,
      ),
    });
    expect(panelFoodWords(en, houseKibble(), "en", branded)).toBe(
      "1 cup Hill's Science Diet",
    );
    // Only our own fallback, when the name is lost, is lower-cased.
    expect(
      panelFoodWords(
        en,
        houseKibble("food-9", { houseFoodId: "hf-gone", houseFoodName: "" }),
        "en",
        HOUSE,
      ),
    ).toBe("1 cup house food");
  });
});

describe("what the house food adds to the bill", () => {
  const plan = (patch: Partial<FeedingPlan> = {}): FeedingPlan => ({
    ...blankPlan(IDS, 1, CTX),
    foods: [houseKibble("food-1")],
    ...patch,
  });
  const charges = (p: FeedingPlan, settings: FeedingInstructions = HOUSE) =>
    houseFoodCharges(
      {
        meals: p.meals,
        days: planDays(p, BOARDING).length,
        foods: p.foods,
        waivedFoods: p.waivedFoods,
      },
      settings,
    );

  test("per meal: 2 meals × 5 days × $3.50", () => {
    expect(charges(plan())).toEqual([
      {
        houseFoodId: "hf-std",
        name: "House kibble",
        per: "meal",
        quantity: 10,
        unitPrice: 3.5,
        amount: 35,
        included: false,
        offered: true,
        waived: false,
      },
    ]);
  });

  test("per day: 5 days × $8.00", () => {
    const [charge] = charges(plan(), withHouse({ pricing: "day" }));
    expect([charge.quantity, charge.unitPrice, charge.amount]).toEqual([
      5, 8, 40,
    ]);
  });

  test("included in the price, or priced at nothing, charges nothing", () => {
    const included = charges(plan(), withHouse({ pricing: "included" }));
    expect([included[0].included, included[0].amount]).toEqual([true, 0]);
    const free = withHouse({
      foods: HOUSE.house.foods.map((food) => ({ ...food, pricePerMeal: 0 })),
    });
    expect(charges(plan(), free)[0].included).toBe(true);
  });

  test("house food switched off, or one food taken off the list, charges nothing", () => {
    const off = charges(plan(), withHouse({ on: false }))[0];
    expect([off.offered, off.included, off.amount]).toEqual([false, true, 0]);
    const kibbleOff = withHouse({
      foods: HOUSE.house.foods.map((food) =>
        food.id === "hf-std" ? { ...food, on: false } : food,
      ),
    });
    expect(charges(plan(), kibbleOff)[0].amount).toBe(0);
  });

  test("a waived food is marked and charges nothing", () => {
    const [charge] = charges(plan({ waivedFoods: ["food-1"] }));
    expect([charge.waived, charge.amount, charge.quantity]).toEqual([
      true,
      0,
      10,
    ]);
  });

  test("a house food the facility no longer offers is no charge", () => {
    expect(
      charges(
        plan({ foods: [houseKibble("food-1", { houseFoodId: "hf-gone" })] }),
      ),
    ).toEqual([]);
  });

  test("two foods of one house food: meals add up, a day counts once", () => {
    const two = plan({
      foods: [
        houseKibble("food-1"),
        houseKibble("food-2", { servedAt: ["dinner"] }),
      ],
    });
    expect(charges(two)[0].quantity).toBe(15);
    expect(charges(two, withHouse({ pricing: "day" }))[0].quantity).toBe(5);
  });
});

describe("care lines on the bill", () => {
  const FEES: CareFees = {
    ...NO_CARE_FEES,
    daycareFeeding: { enabled: true, amount: 3, scope: "per_meal" },
  };
  const item = (p: FeedingPlan, stay: MedStay = BOARDING) =>
    itemFromPlan(p, { ...WORDS, stay });
  const lines = (input: {
    parts: { stay: MedStay; feeding: FeedingScheduleItem[] }[];
    service?: string;
    fees?: CareFees;
    feeding?: FeedingInstructions;
  }) =>
    careChargeLines({
      fees: input.fees ?? NO_CARE_FEES,
      settings: SHIPPED_MEDICATION_INSTRUCTIONS,
      feedingSettings: input.feeding ?? HOUSE,
      service: input.service ?? "boarding",
      parts: input.parts.map((part) => ({ ...part, medications: [] })),
    });

  const housePlan = (): FeedingPlan => ({
    ...blankPlan(IDS, 1, CTX),
    foods: [houseKibble("food-1")],
  });

  test("one house-food line, as goods", () => {
    expect(
      lines({ parts: [{ stay: BOARDING, feeding: [item(housePlan())] }] })[0],
    ).toEqual([
      {
        feeId: houseFoodFeeId("hf-std"),
        kind: "house_food",
        houseFoodId: "hf-std",
        label: "House kibble",
        per: "meal",
        quantity: 10,
        unitPrice: 3.5,
        amount: 35,
        taxedAs: "goods",
      },
    ]);
  });

  test("no line when waived, included, or without the facility's settings", () => {
    const waived = { ...housePlan(), waivedFoods: ["food-1"] };
    expect(
      lines({ parts: [{ stay: BOARDING, feeding: [item(waived)] }] }).flat(),
    ).toEqual([]);
    expect(
      lines({
        parts: [{ stay: BOARDING, feeding: [item(housePlan())] }],
        feeding: withHouse({ pricing: "included" }),
      }).flat(),
    ).toEqual([]);
    expect(
      careChargeLines({
        fees: NO_CARE_FEES,
        settings: SHIPPED_MEDICATION_INSTRUCTIONS,
        service: "boarding",
        parts: [
          { stay: BOARDING, medications: [], feeding: [item(housePlan())] },
        ],
      }).flat(),
    ).toEqual([]);
  });

  test("a daycare request's bookings add up to what the form showed", () => {
    const plan: FeedingPlan = {
      ...blankPlan(IDS, 1, { settings: HOUSE, stay: DAYCARE }),
      foods: [houseKibble("food-1")],
    };
    const record = item(plan, DAYCARE);
    const whole = lines({
      service: "daycare",
      fees: FEES,
      parts: [{ stay: DAYCARE, feeding: [record] }],
    });
    const split = lines({
      service: "daycare",
      fees: FEES,
      parts: DAYCARE.days.map((day) => ({
        stay: { days: [day], overnight: false },
        feeding: [record],
      })),
    });
    expect(careChargeTotal(split)).toBe(careChargeTotal(whole));
    // The meals fee counts every meal served — 2 a day × 3 days — once.
    expect(whole[0].find((line) => line.feeId === MEALS_FEE_ID)?.quantity).toBe(
      6,
    );
    expect(split[0].find((line) => line.feeId === MEALS_FEE_ID)?.quantity).toBe(
      6,
    );
    expect(
      split
        .slice(1)
        .flat()
        .some((line) => line.feeId === MEALS_FEE_ID),
    ).toBe(false);
    expect(
      split.map(
        (part) => part.find((line) => line.kind === "house_food")?.quantity,
      ),
    ).toEqual([2, 2, 2]);
  });

  test("certain dates count only their days, for the fee and the food", () => {
    const plan: FeedingPlan = {
      ...blankPlan(IDS, 1, { settings: HOUSE, stay: DAYCARE }),
      dayRule: "certain_dates",
      certainDays: ["2026-03-17", "2026-03-23"],
      foods: [houseKibble("food-1")],
    };
    const [first] = lines({
      service: "daycare",
      fees: FEES,
      parts: [{ stay: DAYCARE, feeding: [item(plan, DAYCARE)] }],
    });
    expect(first.map((line) => [line.feeId, line.quantity])).toEqual([
      [MEALS_FEE_ID, 4],
      [houseFoodFeeId("hf-std"), 4],
    ]);
  });

  test("each booking prices its own pets' plans", () => {
    const own = item({ ...blankPlan(IDS, 1, CTX) });
    const house = item({
      ...blankPlan({ ...IDS, plan: "feed-max" }, 2, CTX),
      foods: [houseKibble("food-9")],
    });
    const byRoom = lines({
      parts: [
        { stay: BOARDING, feeding: [own] },
        { stay: BOARDING, feeding: [house] },
      ],
    });
    expect(byRoom[0]).toEqual([]);
    expect(byRoom[1].map((line) => [line.feeId, line.quantity])).toEqual([
      [houseFoodFeeId("hf-std"), 10],
    ]);
  });

  test("the meals fee per pet counts pets with a meal", () => {
    const perPet: CareFees = {
      ...FEES,
      daycareFeeding: { ...FEES.daycareFeeding, scope: "per_pet" },
    };
    const one = item(
      blankPlan(IDS, 1, { settings: HOUSE, stay: DAYCARE }),
      DAYCARE,
    );
    const two = item(
      blankPlan({ ...IDS, plan: "feed-max" }, 2, {
        settings: HOUSE,
        stay: DAYCARE,
      }),
      DAYCARE,
    );
    const [first] = lines({
      service: "daycare",
      fees: perPet,
      parts: [{ stay: DAYCARE, feeding: [one, two] }],
    });
    expect(first.find((line) => line.feeId === MEALS_FEE_ID)?.quantity).toBe(2);
  });
});

describe("the plan and the booking record", () => {
  /** Every field the step writes, in the order of the day. */
  function full(): FeedingPlan {
    return {
      ...bella(),
      meals: [
        { id: "breakfast", slot: "breakfast", time: "07:00" },
        { id: "custom-1", time: "15:00" },
        { id: "dinner", slot: "dinner", time: "17:00" },
      ],
      dayRule: "certain_dates",
      certainDays: ["2026-03-17", "2026-03-19"],
      foods: [
        ...bella().foods,
        houseKibble("food-3", { servedAt: ["breakfast", "custom-1"] }),
      ],
      skip: "tell_after_1",
      treats: "none",
      notes: "Picky eater.",
      saveToProfile: true,
      waivedFoods: ["food-3"],
    };
  }

  test("a plan written and read back is the same plan", () => {
    expect(planFromItem(itemFromPlan(full(), WORDS), CTX)).toEqual(full());
  });

  test("the record keeps the fields every older screen reads", () => {
    const record = itemFromPlan(full(), WORDS);
    expect(
      record.occasions.map((o) => [o.id, o.label, o.time, o.slot]),
    ).toEqual([
      ["breakfast", "Breakfast", "07:00", "breakfast"],
      ["custom-1", "3:00 PM", "15:00", undefined],
      ["dinner", "Dinner", "17:00", "dinner"],
    ]);
    expect(record.occasions[2].components).toEqual([
      {
        id: "food-1",
        type: "kibble",
        name: "Orijen Original",
        amount: "1",
        unit: "cups",
      },
      {
        id: "food-2",
        type: "wet_food",
        name: "Hill’s Chicken Stew",
        amount: "0.25",
        unit: "other",
      },
    ]);
    expect(record.occasions[0].components.map((c) => c.name)).toEqual([
      "Orijen Original",
      "House kibble",
    ]);
    expect([record.source, record.frequency, record.specificDays]).toEqual([
      "mix",
      "specific_days",
      ["2026-03-17", "2026-03-19"],
    ]);
    expect(record.allergies).toEqual(["Beef"]);
    expect(record.waivedFoods).toEqual(["food-3"]);
  });

  test("a part the facility hides stores nothing", () => {
    const hidden: FeedingInstructions = {
      ...HOUSE,
      show: { ...HOUSE.show, brand: false, notes: false },
    };
    const record = itemFromPlan(full(), { ...WORDS, settings: hidden });
    expect(record.foods?.[0].brand).toBeUndefined();
    expect(record.notes).toBe("");
  });

  test("a waiver on a food that is no longer house food is dropped", () => {
    const plan = { ...full(), waivedFoods: ["food-1"] };
    expect(itemFromPlan(plan, WORDS).waivedFoods).toBeUndefined();
  });

  test("what stops a plan being booked", () => {
    const plan = blankPlan(IDS, 1, CTX);
    expect(planProblem(plan, CTX)).toBeNull();
    expect(planProblem({ ...plan, meals: [] }, CTX)).toBe("meals");
    expect(
      planProblem(
        { ...plan, meals: [...plan.meals, { id: "c", time: "" }] },
        CTX,
      ),
    ).toBe("time");
    expect(
      planProblem(
        { ...plan, dayRule: "certain_dates", certainDays: ["2026-04-01"] },
        CTX,
      ),
    ).toBe("days");
    expect(
      planProblem({ ...plan, foods: [{ ...plan.foods[0], amount: 0 }] }, CTX),
    ).toBe("amount");
  });
});

describe("rows written before the step, as they are stored", () => {
  // Shapes taken from bookings in the database today.
  const JASPER = {
    id: "feed-jasper",
    notes: "",
    source: "parent_brings",
    allergies: [],
    frequency: "daily",
    ifRefuses: ["try_again_1hr", "skip_notify"],
    occasions: [
      {
        id: "am",
        time: "07:30",
        label: "Breakfast",
        components: [
          {
            id: "k",
            name: "Own kibble",
            type: "kibble",
            unit: "cups",
            amount: "2",
          },
        ],
      },
      {
        id: "pm",
        time: "17:30",
        label: "Dinner",
        components: [
          {
            id: "k",
            name: "Own kibble",
            type: "kibble",
            unit: "cups",
            amount: "2",
          },
        ],
      },
    ],
    prepInstructions: ["warm_water"],
  } as FeedingScheduleItem;

  const FS1 = {
    id: "fs-1",
    notes: "Slow feeder bowl please",
    petId: 1,
    source: "owner",
    allergies: ["chicken"],
    frequency: "daily",
    ifRefuses: ["notify_owner"],
    occasions: [
      {
        id: "occ-1",
        time: "08:00",
        label: "Breakfast",
        components: [
          {
            id: "mc-1",
            name: "Acana Large Breed",
            type: "kibble",
            unit: "cups",
            amount: "1.5",
          },
        ],
      },
      {
        id: "occ-2",
        time: "17:30",
        label: "Dinner",
        components: [
          {
            id: "mc-2",
            name: "Acana Large Breed",
            type: "kibble",
            unit: "cups",
            amount: "1.5",
          },
          {
            id: "mc-3",
            name: "Pumpkin puree",
            type: "topper",
            unit: "tbsp",
            amount: "1",
          },
        ],
      },
    ],
    prepNotes: "Add warm water and stir",
    refusalNotes: "Call before offering anything else",
    prepInstructions: ["add_warm_water"],
  } as unknown as FeedingScheduleItem;

  const OLD_FORM = {
    id: "f-1790458180541-5nek",
    notes: "",
    petId: 23258,
    source: "parent_brings",
    allergies: [],
    frequency: "daily",
    ifRefuses: [],
    occasions: [
      {
        id: "f-1790458207201-fsxl",
        time: "09:00",
        label: "AM",
        components: [
          {
            id: "f-1790458207201-g8sn",
            name: "Homemade",
            type: "kibble",
            unit: "cups",
            amount: "1",
          },
        ],
      },
      { id: "f-noon", time: "12:00", label: "Noon", components: [] },
    ],
    saveToProfile: true,
    prepInstructions: [],
    feedingInstruction: "Feed alone",
  } as FeedingScheduleItem;

  test("meals keep their ids and times; one food served at both", () => {
    const plan = planFromItem(JASPER, CTX);
    expect(plan.meals).toEqual([
      { id: "am", time: "07:30" },
      { id: "pm", time: "17:30" },
    ]);
    expect(plan.foods).toEqual([
      {
        id: "k",
        source: "own",
        type: "kibble",
        brand: "Own kibble",
        houseFoodId: "",
        houseFoodName: "",
        unit: "cup",
        customUnit: "",
        amount: 2,
        servedAt: null,
        prep: [],
        pack: "original_bag",
      },
    ]);
    const rewritten = itemFromPlan(plan, WORDS);
    expect(rewritten.occasions.map((o) => [o.id, o.time])).toEqual([
      ["am", "07:30"],
      ["pm", "17:30"],
    ]);
    expect(rewritten.ifRefuses).toEqual(["try_again_1hr", "skip_notify"]);
    expect(rewritten.prepInstructions).toEqual(["warm_water"]);
  });

  test("a different food at one meal is served at that meal; words outside the old lists still read", () => {
    const plan = planFromItem(FS1, CTX);
    expect(
      plan.foods.map((f) => [
        f.id,
        f.type,
        f.brand,
        f.unit,
        f.amount,
        f.servedAt,
      ]),
    ).toEqual([
      ["mc-1", "kibble", "Acana Large Breed", "cup", 1.5, null],
      ["mc-3", "topper", "Pumpkin puree", "tbsp", 1, ["occ-2"]],
    ]);
    // Words outside the old enums, as the row stores them.
    expect(plan.carry as unknown).toEqual({
      prepNotes: "Add warm water and stir",
      refusalNotes: "Call before offering anything else",
      ifRefuses: ["notify_owner"],
      prepInstructions: ["add_warm_water"],
    });
    const lines = describeFeeding(FS1, {
      t: en,
      locale: "en",
      stay: BOARDING,
      settings: HOUSE,
    });
    expect(lines.extras).toEqual([
      "Add warm water and stir",
      "If refused: Call before offering anything else",
      "Food allergies: Chicken",
      "Slow feeder bowl please",
    ]);
  });

  test("the old form's food-type word is the kind of food, its instruction a style", () => {
    const plan = planFromItem(OLD_FORM, CTX);
    expect(plan.foods.map((f) => [f.type, f.brand])).toEqual([
      ["homemade", ""],
    ]);
    expect(plan.styles).toEqual(["feed_alone"]);
    expect(plan.carry.feedingInstruction).toBeUndefined();
    expect(plan.saveToProfile).toBe(true);
    // A meal at a meal time's time is that meal time, under its old id.
    expect(plan.meals).toEqual([
      { id: "f-1790458207201-fsxl", time: "09:00" },
      { id: "f-noon", slot: "lunch", time: "12:00" },
    ]);
  });
});

describe("copying a plan to another pet", () => {
  test("new ids, links re-pointed, nothing staff granted", () => {
    let n = 0;
    const source: FeedingPlan = {
      ...bella(),
      meals: [
        { id: "breakfast", slot: "breakfast", time: "07:00" },
        { id: "custom-1", time: "15:00" },
      ],
      foods: [houseKibble("food-3", { servedAt: ["custom-1"] })],
      waivedFoods: ["food-3"],
      profileId: "pfeed-1",
    };
    const copy = copyPlan(source, 2, {
      plan: "feed-max",
      food: () => `food-new-${++n}`,
      meal: () => "custom-new",
    });
    expect([copy.id, copy.petId, copy.profileId]).toEqual([
      "feed-max",
      2,
      undefined,
    ]);
    expect(copy.meals.map((m) => m.id)).toEqual(["breakfast", "custom-new"]);
    expect(copy.foods.map((f) => [f.id, f.servedAt])).toEqual([
      ["food-new-1", ["custom-new"]],
    ]);
    expect(copy.waivedFoods).toEqual([]);
  });
});

describe("the pet's profile", () => {
  const booked = () => itemFromPlan({ ...bella(), saveToProfile: true }, WORDS);

  test("keeps the plan without the stay", () => {
    const entry = profileEntryOf(booked(), "pfeed-1");
    for (const field of [
      "id",
      "petId",
      "dayRule",
      "specificDays",
      "waivedFoods",
      "saveToProfile",
    ]) {
      expect(entry).not.toHaveProperty(field);
    }
    expect([entry.profileId, entry.frequency, entry.foods?.length]).toEqual([
      "pfeed-1",
      "daily",
      2,
    ]);
    const next = itemFromProfile(entry, 1, CTX);
    expect([next.id, next.petId, next.dayRule, next.saveToProfile]).toEqual([
      "feed-pfeed-1",
      1,
      "every_day",
      true,
    ]);
  });

  test("saved, unchanged, unticked", () => {
    const item = booked();
    const saved = feedingProfileAfterBooking(
      undefined,
      item,
      () => "pfeed-new",
    );
    expect(saved?.profileId).toBe("pfeed-new");
    const fromProfile = { ...item, profileId: "pfeed-new" };
    expect(feedingProfileAfterBooking(saved, fromProfile)).toBeUndefined();
    expect(
      feedingProfileAfterBooking(saved, {
        ...fromProfile,
        saveToProfile: false,
      }),
    ).toBeNull();
    expect(
      feedingProfileAfterBooking(saved, { ...item, saveToProfile: false }),
    ).toBeUndefined();
  });
});

describe("a plan in words", () => {
  const plan = (): FeedingPlan => ({
    ...bella(),
    foods: [...bella().foods, houseKibble("food-3")],
  });

  test("the confirm step's lines, in English", () => {
    const lines = describeFeeding(itemFromPlan(plan(), WORDS), {
      t: en,
      locale: "en",
      stay: BOARDING,
      settings: HOUSE,
      service: "boarding",
    });
    expect(lines.meals).toBe("2 meals a day · 7:00 AM, 5:00 PM · 5 days");
    expect(lines.foods).toEqual([
      "1 cup Orijen Original (dry kibble) · Serve dry",
      "¼ can Hill’s Chicken Stew (wet / canned) · Dinner · Mix into kibble",
      "1 cup House kibble · facility provides 10 meals ($35.00)",
    ]);
    expect(lines.extras).toEqual([
      "Feeding style: Feed alone and Slow feeder bowl",
      "Eating habits: Eats fast",
      "If a meal is skipped: Offer again in 30 min",
      "Treats: House treats OK",
      "Food allergies: Beef",
    ]);
  });

  test("and in French", () => {
    const lines = describeFeeding(
      itemFromPlan(plan(), { ...WORDS, t: fr, locale: "fr" }),
      {
        t: fr,
        locale: "fr",
        stay: BOARDING,
        settings: HOUSE,
        service: "boarding",
      },
    );
    expect(lines.meals).toBe("2 repas par jour · 7 h 00, 17 h 00 · 5 jours");
    expect(lines.extras).toContain("Allergies alimentaires : Bœuf");
  });
});

describe("the feeding setting", () => {
  test("ships the whole design and nothing to charge", () => {
    expect(
      feedingInstructionsSchema.safeParse(SHIPPED_FEEDING_INSTRUCTIONS).success,
    ).toBe(true);
    // House food ships switched off: its three foods are there, priced,
    // and charge nothing until the facility turns it on.
    expect(SHIPPED_FEEDING_INSTRUCTIONS.house.on).toBe(false);
    expect(SHIPPED_FEEDING_INSTRUCTIONS.house.foods.map((f) => f.id)).toEqual([
      "hf-house-kibble",
      "hf-sensitive-kibble",
      "hf-canned-wet",
    ]);
    expect(feedingInstructionsSchema.safeParse(HOUSE).success).toBe(true);
  });

  test("refuses a house food measured unlike its kind, a nameless one, or no food types", () => {
    const badUnit = withHouse({
      foods: [{ ...HOUSE.house.foods[0], unit: "can" }],
    });
    expect(feedingInstructionsSchema.safeParse(badUnit).success).toBe(false);
    const nameless = withHouse({
      foods: [{ ...HOUSE.house.foods[0], name: " " }],
    });
    expect(feedingInstructionsSchema.safeParse(nameless).success).toBe(false);
    expect(
      feedingInstructionsSchema.safeParse({ ...HOUSE, foodTypes: [] }).success,
    ).toBe(false);
    // Every quick-pick meal time off still leaves a custom time.
    expect(
      feedingInstructionsSchema.safeParse({
        ...HOUSE,
        meals: HOUSE.meals.map((slot) => ({ ...slot, on: false })),
      }).success,
    ).toBe(true);
  });

  test("a row saved before the page parses, its new keys defaulted", () => {
    const older = feedingInstructionsSchema.parse({
      foodTypes: ["kibble"],
    });
    expect(older.house.on).toBe(false);
    expect(older.extraMeals).toBe(2);
    expect(older.services.boarding).toBe("optional");
  });
});

describe("an edit keeps the pets it did not load", () => {
  test("another pet's items pass through; a petless one is the first pet's", () => {
    const stored = [{ id: "a", petId: 1 }, { id: "b", petId: 2 }, { id: "c" }];
    expect(itemsForOtherPets(stored, [1]).map((i) => i.id)).toEqual(["b"]);
    expect(itemsForOtherPets(stored, [1, 2])).toEqual([]);
    expect(itemsForOtherPets(stored, []).map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
