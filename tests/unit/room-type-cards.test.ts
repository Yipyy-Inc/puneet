import { describe, expect, test } from "bun:test";

import type { BoardingService } from "@/lib/api/mappers/boarding-service";
import { roomTypeCards } from "@/lib/bookings/wizard/room-type-cards";
import type { Pet } from "@/types/pet";
import type { RoomCategory } from "@/types/rooms";

// The client's facility: four boarding services, each in one lodging type.
const category = (
  id: string,
  name: string,
  over: Partial<RoomCategory> = {},
): RoomCategory =>
  ({
    id,
    rowId: `uuid-${id}`,
    service: "boarding",
    name,
    color: "blue",
    sortOrder: 0,
    rules: [],
    defaultCapacity: 1,
    visibleToClients: true,
    active: true,
    locationPricing: [],
    ...over,
  }) as RoomCategory;

const service = (
  id: string,
  name: string,
  price: number,
  lodging: string,
  over: Partial<BoardingService> = {},
): BoardingService =>
  ({
    id,
    rowId: `svc-${id}`,
    categoryId: null,
    name,
    description: "",
    imageUrl: null,
    color: null,
    price,
    facilityPrice: price,
    unit: "night",
    taxable: true,
    lodgingTypeIds: [`uuid-${lodging}`],
    eligibleSpecies: [],
    eligibleBreeds: [],
    eligibleWeightTiers: [],
    eligiblePetTags: [],
    blockedPetTags: [],
    locationIds: [],
    requiresEvaluation: false,
    requiresEvaluationOnline: false,
    displayOrder: 0,
    isActive: true,
    locationPricing: [],
    defaultAddOns: [],
    ...over,
  }) as BoardingService;

const CATEGORIES = [
  category("condo", "Condos"),
  category("suite", "Suites", { defaultCapacity: 2 }),
];
const SERVICES = [
  service("condo", "Condos", 70, "condo", { eligibleWeightTiers: ["small"] }),
  service("suite", "Suites", 90, "suite"),
];
const mango = { id: 2, name: "Mango", type: "Dog", weight: 70 } as Pet;

describe("roomTypeCards", () => {
  test("a card per service, priced by the service", () => {
    const cards = roomTypeCards({
      services: SERVICES,
      categories: CATEGORIES,
      availability: [],
      pet: null,
      showCounts: false,
    });
    expect(cards.map((c) => [c.name, c.price, c.lodgingIds])).toEqual([
      ["Condos", 70, ["condo"]],
      ["Suites", 90, ["suite"]],
    ]);
    expect(cards.map((c) => c.shareable)).toEqual([false, true]);
  });

  test("a pet the service does not take is told so", () => {
    const cards = roomTypeCards({
      services: SERVICES,
      categories: CATEGORIES,
      availability: [],
      pet: mango,
      showCounts: false,
    });
    expect(cards.map((c) => c.blocked)).toEqual(["not-offered", null]);
  });

  test("staff see what is free; a full lodging is blocked", () => {
    const cards = roomTypeCards({
      services: SERVICES,
      categories: CATEGORIES,
      availability: [
        {
          categoryId: "condo",
          totalActive: 14,
          availableUnits: 8,
          eligible: true,
          eligibilityMessage: null,
        },
        {
          categoryId: "suite",
          totalActive: 6,
          availableUnits: 0,
          eligible: true,
          eligibilityMessage: null,
        },
      ],
      pet: null,
      showCounts: true,
    });
    expect(cards.map((c) => [c.free, c.total, c.blocked])).toEqual([
      [8, 14, null],
      [0, 6, "full"],
    ]);
  });

  test("a customer never sees counts, even when they are known", () => {
    const [card] = roomTypeCards({
      services: SERVICES,
      categories: CATEGORIES,
      availability: [
        {
          categoryId: "condo",
          totalActive: 14,
          availableUnits: 8,
          eligible: true,
          eligibilityMessage: null,
        },
      ],
      pet: null,
      showCounts: false,
    });
    expect(card!.free).toBeNull();
    expect(card!.total).toBeNull();
  });

  test("a lodging rule the pet fails carries the facility's words", () => {
    const [card] = roomTypeCards({
      services: [service("suite", "Suites", 90, "suite")],
      categories: CATEGORIES,
      availability: [
        {
          categoryId: "suite",
          totalActive: 6,
          availableUnits: 3,
          eligible: false,
          eligibilityMessage: "Pets up to 25 lb",
        },
      ],
      pet: mango,
      showCounts: true,
    });
    expect(card!.blocked).toBe("rule");
    expect(card!.ruleMessage).toBe("Pets up to 25 lb");
  });

  test("no menu: the lodging types, at their own rates", () => {
    const cards = roomTypeCards({
      services: [],
      categories: [category("condo", "Condos", { defaultBasePrice: 38 })],
      availability: [],
      pet: null,
      showCounts: false,
    });
    expect(cards.map((c) => [c.kind, c.name, c.price])).toEqual([
      ["lodging", "Condos", 38],
    ]);
  });
  test("staff read the size words, limit and chips from the lodging type", () => {
    const [card] = roomTypeCards({
      services: [service("condo", "Condos", 70, "condo")],
      categories: [
        category("condo", "Condos", {
          dimensionsLabel: "4 × 4 ft",
          features: ["Raised bed", "raised bed", " Climate control "],
          rules: [
            {
              id: "r",
              type: "max_weight",
              value: 25,
              clientMessage: "",
              enabled: true,
            },
          ],
        }),
      ],
      availability: [],
      pet: null,
      showCounts: true,
    });
    expect(card!.dimensions).toBe("4 × 4 ft");
    expect(card!.limits).toEqual({
      weight: { minLb: undefined, maxLb: 25 },
      species: null,
    });
    // Repeats folded, blanks trimmed — the chips as a manager meant them.
    expect(card!.features).toEqual(["Raised bed", "Climate control"]);
  });

  test("a customer reads the same facts from the menu, and may share a room", () => {
    const [card] = roomTypeCards({
      services: [
        service("suite", "Suites", 90, "suite", {
          additionalPetPrice: 45,
          lodging: [
            {
              id: "uuid-suite",
              name: "Suites",
              description: null,
              imageUrl: null,
              dimensions: "6 × 8 ft",
              features: ["Webcam"],
              holdsSeveral: true,
              rules: [],
            },
          ],
        }),
      ],
      // A customer reads no lodging types of their own.
      categories: [],
      availability: [],
      pet: null,
      showCounts: false,
    });
    expect(card!.dimensions).toBe("6 × 8 ft");
    expect(card!.features).toEqual(["Webcam"]);
    expect(card!.shareable).toBe(true);
    expect(card!.lodgingIds).toEqual(["uuid-suite"]);
    expect(card!.additionalPetPrice).toBe(45);
    expect(card!.free).toBeNull();
  });

  test("with no counts, the lodging rules still refuse a pet, in the facility's words", () => {
    const [card] = roomTypeCards({
      services: [
        service("condo", "Condos", 70, "condo", {
          lodging: [
            {
              id: "uuid-condo",
              name: "Condos",
              description: null,
              imageUrl: null,
              dimensions: null,
              features: [],
              holdsSeveral: false,
              rules: [
                {
                  id: "r",
                  type: "max_weight",
                  value: 20,
                  clientMessage: "Up to 20 lb",
                  enabled: true,
                },
              ],
            },
          ],
        }),
      ],
      categories: [],
      availability: [],
      pet: mango,
      showCounts: false,
    });
    expect(card!.blocked).toBe("rule");
    expect(card!.ruleMessage).toBe("Up to 20 lb");
  });
});
