import { describe, expect, test } from "bun:test";

import { assembleQuote, type QuoteInput } from "@/lib/bookings/quote/assemble";
import { NO_CARE_FEES } from "@/lib/settings/care-fees";
import { SHIPPED_FEEDING_INSTRUCTIONS } from "@/lib/settings/feeding-instructions";
import { SHIPPED_MEDICATION_INSTRUCTIONS } from "@/lib/settings/medication-instructions";
import { NO_PRICING_RULES } from "@/lib/settings/pricing";
import { stayOf } from "@/lib/medications/schedule";
import type { Pet } from "@/types/pet";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// The booking wizard's quote, pinned (2026-10-01). It moved out of the
// wizard's memo into `lib/bookings/quote/assemble.ts` unchanged, ahead of the
// wizard's rebuild to the client's mock; these figures are what it answered
// before the move, so any later change to one of them is a decision someone
// made, not a side effect of moving screens around.
// ============================================================================

const t = (key: string) => key;

const pet = (over: Partial<Pet> = {}): Pet =>
  ({
    id: 1,
    name: "Bubu",
    type: "Dog",
    breed: "Bichon Frise",
    age: 2,
    weight: 10,
    coatType: "curly",
    evaluations: [],
    ...over,
  }) as unknown as Pet;

const category: RoomCategory = {
  id: "cat-condo",
  service: "boarding",
  name: "Condos",
  color: "blue",
  sortOrder: 0,
  rules: [],
  defaultCapacity: 1,
  defaultBasePrice: 70,
  visibleToClients: true,
  active: true,
  locationPricing: [],
};

const room: FacilityRoom = {
  id: "room-1",
  categoryId: "cat-condo",
  name: "Condo 1",
  active: true,
  rules: [],
};

function input(over: Partial<QuoteInput> = {}): QuoteInput {
  return {
    t,
    locale: "en",
    selectedService: "",
    serviceType: "",
    startDate: "",
    endDate: "",
    checkInTime: "08:00",
    checkOutTime: "17:00",
    boardingRangeStart: null,
    boardingRangeEnd: null,
    boardingNights: 0,
    daycareSelectedDates: [],
    daycareDateTimes: [],
    selectedClient: undefined,
    selectedPets: [pet()],
    pricingPets: [pet()] as unknown as QuoteInput["pricingPets"],
    pricingSelectedPetIds: [1],
    isNewCustomer: false,
    newPetIds: [],
    isEstimateMode: false,
    isGuestEstimate: false,
    daycareService: null,
    boardingService: null,
    roomCategories: [category],
    facilityRooms: [room],
    roomAssignments: [],
    locationId: null,
    groomingMenu: [],
    groomingPetPricingOverrides: [],
    groomingAddOnCatalog: [],
    groomingSelectedAddOnIds: [],
    groomingIsMobile: false,
    groomingTravelZones: [],
    facilityBasePostal: undefined,
    trainingLines: [],
    evaluation: { price: 0, internalName: null },
    includesEvaluation: false,
    customBasePrice: () => undefined,
    pricingRules: NO_PRICING_RULES,
    extraServices: [],
    defaultLines: [],
    addOnsCatalog: [],
    roomCategoryOf: (roomId) => (roomId === "room-1" ? "cat-condo" : undefined),
    careFees: NO_CARE_FEES,
    medicationSettings: SHIPPED_MEDICATION_INSTRUCTIONS,
    feedingSettings: SHIPPED_FEEDING_INSTRUCTIONS,
    careStay: stayOf({
      overnight: false,
      start: "2026-10-05",
      end: "2026-10-05",
    }),
    medications: [],
    feeding: [],
    redeemedPackageId: null,
    estimateTaxRate: 0,
    ...over,
  };
}

describe("daycare", () => {
  test("the chosen service's price, once per day", () => {
    const quote = assembleQuote(
      input({
        selectedService: "daycare",
        daycareService: { price: 55 },
        daycareSelectedDates: [
          new Date(2026, 9, 5),
          new Date(2026, 9, 7),
          new Date(2026, 9, 9),
        ],
      }),
    );
    expect(quote.basePrice).toBe(165);
    expect(quote.subtotal).toBe(165);
    expect(quote.total).toBe(165);
    expect(quote.serviceTotal).toBe(165);
    expect(quote.taxAmount).toBe(0);
    expect(quote.rateGap).toBeNull();
  });

  test("no service chosen is a rate gap, never a free day", () => {
    const quote = assembleQuote(
      input({
        selectedService: "daycare",
        daycareSelectedDates: [new Date(2026, 9, 5)],
      }),
    );
    expect(quote.rateGap).toEqual({ kind: "daycare" });
    expect(quote.basePrice).toBe(0);
  });
});

describe("boarding", () => {
  const stay = {
    selectedService: "boarding",
    boardingRangeStart: new Date(2026, 9, 1),
    boardingRangeEnd: new Date(2026, 9, 5),
    boardingNights: 4,
  };

  test("the menu item's rate per night, for each kennel assigned", () => {
    const quote = assembleQuote(
      input({
        ...stay,
        boardingService: { price: 70, unit: "night", name: "Condos" },
        roomAssignments: [{ petId: 1, roomId: "room-1" }],
      }),
    );
    expect(quote.basePrice).toBe(280);
    expect(quote.total).toBe(280);
  });

  test("the class's own rate when no menu item is chosen", () => {
    const quote = assembleQuote(
      input({ ...stay, roomAssignments: [{ petId: 1, roomId: "room-1" }] }),
    );
    expect(quote.basePrice).toBe(280);
  });

  test("no kennel assigned prices nothing (today's customer path — the Room type step fixes it)", () => {
    const quote = assembleQuote(
      input({
        ...stay,
        boardingService: { price: 70, unit: "night", name: "Condos" },
      }),
    );
    expect(quote.basePrice).toBe(0);
  });
});

describe("grooming", () => {
  const pkg = {
    id: "pkg-bath",
    name: "Bath",
    description: "",
    basePrice: 50,
    duration: 60,
    sizePricing: { small: 50, medium: 60, large: 75, giant: 90 },
    includes: [],
    isActive: true,
    purchaseCount: 0,
    createdAt: "2026-01-01",
  } as unknown as QuoteInput["groomingMenu"][number];

  test("each pet through the rate engine, add-ons as their own lines", () => {
    const quote = assembleQuote(
      input({
        selectedService: "grooming",
        serviceType: "pkg-bath",
        groomingMenu: [pkg],
        groomingAddOnCatalog: [
          { id: "teeth", name: "Teeth brushing", price: 12, duration: 15 },
        ],
        groomingSelectedAddOnIds: ["teeth"],
        selectedPets: [pet({ coatType: undefined })],
      }),
    );
    expect(quote.basePrice).toBe(50);
    expect(quote.groomingAddOnsTotal).toBe(12);
    expect(quote.total).toBe(62);
    // The add-on is a line the server writes, so it is not in total_cost.
    expect(quote.serviceTotal).toBe(50);
    expect(quote.serviceFeeItems).toEqual([
      { label: "Teeth brushing", amount: 12 },
    ]);
  });

  test("no package yet is a transient zero", () => {
    const quote = assembleQuote(input({ selectedService: "grooming" }));
    expect(quote.basePrice).toBe(0);
  });
});

describe("training", () => {
  test("one line per enrolled dog", () => {
    const quote = assembleQuote(
      input({
        selectedService: "training",
        trainingLines: [{ price: 280 }, { price: 280 }],
      }),
    );
    expect(quote.basePrice).toBe(560);
    expect(quote.total).toBe(560);
  });

  test("no class chosen is a rate gap", () => {
    const quote = assembleQuote(input({ selectedService: "training" }));
    expect(quote.rateGap).toEqual({ kind: "training" });
  });
});

describe("evaluation, custom services, passes and estimates", () => {
  test("an evaluation is its configured price", () => {
    const quote = assembleQuote(
      input({
        selectedService: "evaluation",
        evaluation: { price: 25, internalName: null },
      }),
    );
    expect(quote.basePrice).toBe(25);
  });

  test("an evaluation on the first day adds its fee per pet not yet evaluated", () => {
    const quote = assembleQuote(
      input({
        selectedService: "daycare",
        daycareService: { price: 55 },
        daycareSelectedDates: [new Date(2026, 9, 5)],
        evaluation: { price: 25, internalName: null },
        includesEvaluation: true,
      }),
    );
    expect(quote.evaluationFeeTotal).toBe(25);
    expect(quote.total).toBe(80);
  });

  test("a custom service is its module's base price", () => {
    const quote = assembleQuote(
      input({
        selectedService: "pool-time",
        customBasePrice: (slug) => (slug === "pool-time" ? 30 : undefined),
      }),
    );
    expect(quote.basePrice).toBe(30);
  });

  test("a redeemed pass comes off as a discount", () => {
    const quote = assembleQuote(
      input({
        selectedService: "daycare",
        daycareService: { price: 55 },
        daycareSelectedDates: [new Date(2026, 9, 5)],
        redeemedPackageId: "pkg-1",
      }),
    );
    expect(quote.subtotal).toBe(0);
    expect(
      quote.adjustments.some((a) => a.source === "package_redemption"),
    ).toBe(true);
  });

  test("only an estimate adds tax", () => {
    const base = {
      selectedService: "daycare",
      daycareService: { price: 100 },
      daycareSelectedDates: [new Date(2026, 9, 5)],
      estimateTaxRate: 0.14975,
    };
    expect(assembleQuote(input(base)).total).toBe(100);
    const estimate = assembleQuote(input({ ...base, isEstimateMode: true }));
    expect(estimate.taxAmount).toBeCloseTo(14.975, 6);
    expect(estimate.total).toBeCloseTo(114.975, 6);
  });
});

// ── The estimate's lines (2026-10-01): Confirm lists them, so they must add
// up to the subtotal, whatever the service.
describe("the estimate's lines", () => {
  const sum = (quote: ReturnType<typeof assembleQuote>) =>
    quote.lines.reduce((total, line) => total + line.amount, 0);

  test("daycare: one line for the days, priced per day", () => {
    const quote = assembleQuote(
      input({
        selectedService: "daycare",
        daycareService: { price: 55, name: "Full Day" },
        daycareSelectedDates: [new Date(2026, 9, 5), new Date(2026, 9, 7)],
      }),
    );
    expect(quote.lines).toEqual([
      {
        key: "daycare:1",
        label: "Full Day · Bubu",
        detail: "wizLineDaysOther",
        amount: 110,
      },
    ]);
    expect(sum(quote)).toBe(quote.subtotal);
  });

  test("boarding: one line per kennel, with its dogs", () => {
    const quote = assembleQuote(
      input({
        selectedService: "boarding",
        boardingRangeStart: new Date(2026, 9, 1),
        boardingRangeEnd: new Date(2026, 9, 5),
        boardingNights: 4,
        boardingService: { price: 70, unit: "night", name: "Condos" },
        roomAssignments: [{ petId: 1, roomId: "room-1" }],
      }),
    );
    expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
      ["Condos · Bubu", 280],
    ]);
    expect(sum(quote)).toBe(quote.subtotal);
  });

  test("grooming: the package per pet, then its add-ons", () => {
    const quote = assembleQuote(
      input({
        selectedService: "grooming",
        serviceType: "pkg-bath",
        groomingMenu: [
          {
            id: "pkg-bath",
            name: "Bath",
            description: "",
            basePrice: 50,
            duration: 60,
            sizePricing: { small: 50, medium: 60, large: 75, giant: 90 },
            includes: [],
            isActive: true,
            purchaseCount: 0,
            createdAt: "2026-01-01",
          } as unknown as QuoteInput["groomingMenu"][number],
        ],
        groomingAddOnCatalog: [
          { id: "teeth", name: "Teeth brushing", price: 12, duration: 15 },
        ],
        groomingSelectedAddOnIds: ["teeth"],
        selectedPets: [pet({ coatType: undefined })],
      }),
    );
    expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
      ["Bath · Bubu", 50],
      ["Teeth brushing", 12],
    ]);
    expect(sum(quote)).toBe(quote.subtotal);
  });

  test("a first-day evaluation and a pass are lines too", () => {
    const withEvaluation = assembleQuote(
      input({
        selectedService: "daycare",
        daycareService: { price: 55 },
        daycareSelectedDates: [new Date(2026, 9, 5)],
        evaluation: { price: 25, internalName: null },
        includesEvaluation: true,
      }),
    );
    expect(sum(withEvaluation)).toBe(withEvaluation.subtotal);
    const withPass = assembleQuote(
      input({
        selectedService: "daycare",
        daycareService: { price: 55 },
        daycareSelectedDates: [new Date(2026, 9, 5)],
        redeemedPackageId: "pkg-1",
      }),
    );
    expect(sum(withPass)).toBe(withPass.subtotal);
  });

  test("training and custom services", () => {
    const training = assembleQuote(
      input({
        selectedService: "training",
        trainingLines: [{ price: 280, label: "Puppy class", petName: "Bubu" }],
      }),
    );
    expect(training.lines.map((line) => line.label)).toEqual([
      "Puppy class · Bubu",
    ]);
    expect(sum(training)).toBe(training.subtotal);
    const custom = assembleQuote(
      input({
        selectedService: "pool-time",
        customBasePrice: () => 30,
        customName: () => "Pool time",
      }),
    );
    expect(custom.lines.map((line) => line.label)).toEqual([
      "Pool time · Bubu",
    ]);
    expect(sum(custom)).toBe(custom.subtotal);
  });
});

// Each dog is a day of daycare (2026-10-01): two dogs, two lines, twice the
// price. It was charged once whoever came.
test("daycare is priced per dog", () => {
  const quote = assembleQuote(
    input({
      selectedService: "daycare",
      daycareService: { price: 55, name: "Full Day" },
      daycareSelectedDates: [new Date(2026, 9, 5), new Date(2026, 9, 7)],
      selectedPets: [pet(), pet({ id: 2, name: "Mango" })],
      pricingSelectedPetIds: [1, 2],
    }),
  );
  expect(quote.basePrice).toBe(220);
  expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
    ["Full Day · Bubu", 110],
    ["Full Day · Mango", 110],
  ]);
});

// Each pet's room (the client's mock, 2026-10-01): a line per pet. Sharing
// makes the pets after the first "Shared · …" at the service's second-pet
// rate — free where the facility charges the room once.
describe("boarding, a room per pet", () => {
  const sum = (quote: ReturnType<typeof assembleQuote>) =>
    quote.lines.reduce((total, line) => total + line.amount, 0);
  const mango = pet({ id: 2, name: "Mango" });
  const suites = { price: 90, unit: "night" as const, name: "Suites" };
  const stay = {
    selectedService: "boarding",
    boardingRangeStart: new Date(2026, 9, 1),
    boardingRangeEnd: new Date(2026, 9, 5),
    boardingNights: 4,
    selectedPets: [pet(), mango],
    roomAssignments: [
      { petId: 1, roomId: "cat-suite" },
      { petId: 2, roomId: "cat-suite" },
    ],
  };

  test("two rooms: each pet at its own service", () => {
    const quote = assembleQuote(
      input({
        ...stay,
        boardingService: suites,
        boardingPetServices: {
          1: suites,
          2: { price: 70, unit: "night", name: "Condos" },
        },
        roomAssignments: [
          { petId: 1, roomId: "cat-suite" },
          { petId: 2, roomId: "cat-condo" },
        ],
      }),
    );
    expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
      ["Suites · Bubu", 360],
      ["Condos · Mango", 280],
    ]);
    expect(sum(quote)).toBe(quote.subtotal);
  });

  test("shared, at the second-pet rate", () => {
    const shared = { ...suites, additionalPetPrice: 45 };
    const quote = assembleQuote(
      input({
        ...stay,
        boardingService: shared,
        boardingPetServices: { 1: shared, 2: shared },
        boardingShare: true,
      }),
    );
    expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
      ["Suites · Bubu", 360],
      ["wizLineShared · Mango", 180],
    ]);
    expect(quote.basePrice).toBe(540);
    expect(sum(quote)).toBe(quote.subtotal);
  });

  // A room TYPE becomes a kennel per pet when the booking is saved, so two
  // pets in "Condos" are two kennels; a KENNEL is one room whoever is in it.
  test("a room type is a room per pet; a kennel is one room", () => {
    const pets = { selectedPets: [pet(), mango] };
    const byType = assembleQuote(
      input({
        ...stay,
        ...pets,
        roomAssignments: [
          { petId: 1, roomId: "cat-condo" },
          { petId: 2, roomId: "cat-condo" },
        ],
      }),
    );
    expect(byType.basePrice).toBe(2 * 280);
    const byKennel = assembleQuote(
      input({
        ...stay,
        ...pets,
        roomAssignments: [
          { petId: 1, roomId: "room-1" },
          { petId: 2, roomId: "room-1" },
        ],
      }),
    );
    expect(byKennel.basePrice).toBe(280);
    expect(byKennel.lines.map((line) => line.label)).toEqual([
      "Condo 1 · Bubu",
      "wizLineShared · Mango",
    ]);
  });

  test("shared, where the room is charged once", () => {
    const quote = assembleQuote(
      input({
        ...stay,
        boardingService: suites,
        boardingPetServices: { 1: suites, 2: suites },
        boardingShare: true,
      }),
    );
    expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
      ["Suites · Bubu", 360],
      ["wizLineShared · Mango", 0],
    ]);
    expect(sum(quote)).toBe(quote.subtotal);
  });
});

// Each pet its own groom (the client's mock, 2026-10-01): the facility's size
// bands, the coat, and matting when staff mark it.
describe("grooming, a package per pet", () => {
  const sum = (quote: ReturnType<typeof assembleQuote>) =>
    quote.lines.reduce((total, line) => total + line.amount, 0);
  const menu = [
    {
      id: "full",
      name: "Full Groom",
      description: "",
      basePrice: 75,
      duration: 90,
      sizePricing: { small: 75, medium: 90, large: 110, giant: 135 },
      coatAdjustments: { curly: 10, mode: "flat" },
      mattedSurchargeDefault: 20,
      includes: [],
      isActive: true,
      purchaseCount: 0,
      createdAt: "",
    },
    {
      id: "tidy",
      name: "Tidy Up",
      description: "",
      basePrice: 40,
      duration: 45,
      sizePricing: { small: 40, medium: 45, large: 55, giant: 65 },
      includes: [],
      isActive: true,
      purchaseCount: 0,
      createdAt: "",
    },
  ] as unknown as QuoteInput["groomingMenu"];

  test("each pet at its own package and the facility's size", () => {
    const quote = assembleQuote(
      input({
        selectedService: "grooming",
        serviceType: "full",
        groomingMenu: menu,
        groomingPetPackages: { 1: "full", 2: "tidy" },
        groomingMatted: { 2: true },
        groomingSizeTiers: [
          { id: "small", label: "Small", maxWeightLbs: 15 },
          { id: "medium", label: "Medium", maxWeightLbs: 35 },
          { id: "giant", label: "Giant" },
        ],
        selectedPets: [
          pet({ weight: 10, coatType: "curly" }),
          pet({ id: 2, name: "Mango", weight: 30, coatType: "short" }),
        ],
      }),
    );
    expect(quote.lines.map((line) => [line.label, line.amount])).toEqual([
      ["Full Groom · Bubu", 85],
      // Tidy Up for a Medium dog, but this package has no matting surcharge.
      ["Tidy Up · Mango", 45],
    ]);
    expect(sum(quote)).toBe(quote.subtotal);
  });
});
