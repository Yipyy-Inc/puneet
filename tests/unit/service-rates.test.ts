import { describe, expect, it } from "bun:test";

import { boardingPricing, boardingNightlyRate } from "@/lib/boarding-pricing";
import {
  daycareDayRate,
  daycareRateForHours,
  maxRateHours,
} from "@/lib/daycare-pricing";
import type { DaycareRate } from "@/types/daycare";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// A service with no rate is UNPRICED, not 45.
//
// Both modules used to fall back to `<service>_config.basePrice` — a fixture's
// number (boarding 45, daycare 35), the same for every facility in the
// product, that nobody at any facility had chosen. These tests pin the two
// things that replaced it: the facility's own rate is used, and its ABSENCE
// is reported rather than papered over.
// ============================================================================

function category(
  id: string,
  name: string,
  defaultBasePrice: number | undefined,
  locationPricing: Array<{ locationId: string; price: number }> = [],
): RoomCategory {
  return {
    id,
    facilityId: 11,
    service: "boarding",
    name,
    description: "",
    color: "slate",
    sortOrder: 1,
    active: true,
    rules: [],
    defaultCapacity: 1,
    defaultBasePrice,
    visibleToClients: true,
    locationPricing,
  } as RoomCategory;
}

function room(id: string, categoryId: string, name = id): FacilityRoom {
  return {
    id,
    categoryId,
    facilityId: 11,
    name,
    active: true,
    rules: [],
  } as FacilityRoom;
}

const SUITE = category("cat-suite", "Suite", 55);
const CONDO = category("cat-condo", "Condominium", 38);
const UNPRICED = category("cat-new", "Isolation Room", undefined);

const ROOMS = [
  room("suite-01", "cat-suite"),
  room("suite-02", "cat-suite"),
  room("condo-01", "cat-condo"),
  room("new-01", "cat-new"),
];
const CATEGORIES = [SUITE, CONDO, UNPRICED];

describe("boardingPricing", () => {
  it("prices a stay by the class each pet is in", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [
        { petId: 1, roomId: "suite-01" },
        { petId: 2, roomId: "condo-01" },
      ],
      nights: 3,
    });
    expect(result.perUnit).toBe(93);
    expect(result.total).toBe(279);
    expect(result.unpricedClasses).toEqual([]);
  });

  it("charges a shared room once, not once per pet", () => {
    const shared = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [
        { petId: 1, roomId: "suite-01" },
        { petId: 2, roomId: "suite-01" },
      ],
      nights: 2,
    });
    expect(shared.perUnit).toBe(55);
    expect(shared.total).toBe(110);
  });

  it("counts a same-day stay as one night", () => {
    const sameDay = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "condo-01" }],
      nights: 0,
    });
    expect(sameDay.total).toBe(38);
  });

  it("lets a branch's own price beat the class default", () => {
    const branch = category("cat-suite", "Suite", 55, [
      { locationId: "loc-west", price: 70 },
    ]);
    const result = boardingPricing({
      categories: [branch],
      rooms: [room("suite-01", "cat-suite")],
      roomAssignments: [{ petId: 1, roomId: "suite-01" }],
      nights: 1,
      locationId: "loc-west",
    });
    expect(result.total).toBe(70);
  });

  it("ignores a branch override for a different branch", () => {
    const branch = category("cat-suite", "Suite", 55, [
      { locationId: "loc-west", price: 70 },
    ]);
    const result = boardingPricing({
      categories: [branch],
      rooms: [room("suite-01", "cat-suite")],
      roomAssignments: [{ petId: 1, roomId: "suite-01" }],
      nights: 1,
      locationId: "loc-east",
    });
    expect(result.total).toBe(55);
  });

  // The whole point of the change: no invented number stands in.
  it("names a class with no rate instead of charging a default", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "new-01" }],
      nights: 4,
    });
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
    expect(result.perUnit).toBe(0);
    expect(result.total).toBe(0);
  });

  it("still prices the classes it can, and names only the one it cannot", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [
        { petId: 1, roomId: "condo-01" },
        { petId: 2, roomId: "new-01" },
      ],
      nights: 1,
    });
    expect(result.perUnit).toBe(38);
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
  });

  it("names an unpriced class once however many pets are in it", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: [...ROOMS, room("new-02", "cat-new")],
      roomAssignments: [
        { petId: 1, roomId: "new-01" },
        { petId: 2, roomId: "new-02" },
      ],
      nights: 1,
    });
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
  });

  it("reports nothing to price before a kennel is chosen", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [],
      nights: 2,
    });
    expect(result.total).toBe(0);
    expect(result.unpricedClasses).toEqual([]);
  });

  // The wizard assigns a room TYPE and the server picks the room, so an
  // assignment may name either. Only the room case resolved here, and a type
  // fell through to the flat service rate.
  it("prices an assignment that names a class rather than a room", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-suite" }],
      nights: 2,
    });
    expect(result.perUnit).toBe(55);
    expect(result.total).toBe(110);
    expect(result.unpricedClasses).toEqual([]);
  });

  it("names an unpriced class assigned by type", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-new" }],
      nights: 1,
    });
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
  });

  it("weighs one room for splitting a multi-pet stay", () => {
    expect(
      boardingNightlyRate({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: [{ petId: 1, roomId: "suite-02" }],
      }),
    ).toBe(55);
  });
});

/**
 * A rate as the screen saves one: a name the facility chose, a price, and how
 * many hours it runs to.
 */
function rate(
  name: string,
  basePrice: number,
  maxDurationHours: number,
  isActive = true,
): DaycareRate {
  return {
    id: `rate-${name}`,
    name,
    basePrice,
    description: "",
    durationHours: maxDurationHours,
    maxDurationHours,
    isActive,
    sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  } as DaycareRate;
}

/** A rate card saved BEFORE the screen could say how long a rate runs. */
function legacyRate(
  type: string,
  basePrice: number,
  durationHours?: number,
): DaycareRate {
  return {
    id: `legacy-${type}`,
    name: type,
    type,
    basePrice,
    description: "",
    ...(durationHours === undefined ? {} : { durationHours }),
    isActive: true,
    sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  } as unknown as DaycareRate;
}

// ============================================================================
// WHICH RATE PRICES A DAY.
//
// It used to be decided by a LABEL — a half day asked for a rate typed
// "half-day". Half a day is five hours at one business and three at another,
// and the type said neither, so a facility's own hours were ignored.
//
// The case that broke, and the first test below: Doggieville set ONE rate,
// "Daycare Half Day, $45, 5 hours". Every full-day booking asked for a
// "full-day" rate, found none, and the wizard told them they had "no daycare
// rate yet" — a facility that had saved a rate card minutes earlier.
// ============================================================================
// ============================================================================
// THE LEGACY PATH, AND IT IS ONLY THAT NOW.
//
// `daycareRateForHours` used to BE the daycare money path: every active rate
// whose ceiling covered the stay, cheapest wins. Since 2026-09-23 a booking
// PICKS a service (`daycare_services`, 20260924120000) and all four pricing
// call sites resolve that one row by id.
//
// These tests are kept, and they are not describing the intended model any
// more. They pin the FALLBACK: a booking made before the cutover carries no
// service id, and re-pricing it must still produce the number it was sold at.
// `resolveDaycareService` reaches this only when the id is absent — see
// tests/unit/daycare-service-choice.test.ts for what a new booking does.
// ============================================================================
describe("which daycare rate covers a stay", () => {
  it("prices the stay Doggieville's single rate actually covers", () => {
    // The real card: one rate, five hours, $45.
    const theirs = [rate("Daycare Half Day", 45, 5)];

    expect(daycareDayRate({ rates: theirs, hours: 4 })).toBe(45);
    expect(daycareDayRate({ rates: theirs, hours: 5 })).toBe(45);
  });

  it("refuses a stay longer than any rate covers, rather than stretching one", () => {
    // The honest answer, and a different sentence from "no rates at all": the
    // facility has rates, none of them covers nine hours.
    const theirs = [rate("Daycare Half Day", 45, 5)];
    expect(daycareDayRate({ rates: theirs, hours: 9 })).toBeNull();
    expect(daycareRateForHours(theirs, 9)).toBeNull();
  });

  it("takes the cheapest rate that covers the stay, not the first", () => {
    // Two rates both cover four hours. Charging the dearer because it was
    // listed first is not a rule anybody agreed to.
    const rates = [rate("Full day", 60, 10), rate("Half day", 35, 6)];
    expect(daycareDayRate({ rates, hours: 4 })).toBe(35);
    expect(daycareRateForHours(rates, 4)?.name).toBe("Half day");

    // And a stay only the longer one covers still prices.
    expect(daycareDayRate({ rates, hours: 8 })).toBe(60);
  });

  it("names the rate it chose, for the receipt", () => {
    const rates = [rate("School run", 22, 4), rate("Full day", 48, 10)];
    expect(daycareRateForHours(rates, 3)?.name).toBe("School run");
    expect(daycareRateForHours(rates, 7)?.name).toBe("Full day");
  });

  it("ignores a rate the facility has turned off", () => {
    expect(
      daycareDayRate({ rates: [rate("Full day", 38, 10, false)], hours: 4 }),
    ).toBeNull();
  });

  it("considers every active rate when the length is unknown", () => {
    const rates = [rate("Full day", 60, 10), rate("Half day", 35, 6)];
    expect(daycareDayRate({ rates })).toBe(35);
  });

  it("lets a branch's own price beat the rate card", () => {
    const rates = [rate("Full day", 38, 10)];
    expect(daycareDayRate({ branchPrice: 44, rates, hours: 4 })).toBe(44);
    // NOT halved for a short stay any more: one number cannot say what a
    // shorter day costs, and halving it was arithmetic nobody configured.
    expect(daycareDayRate({ branchPrice: 44, rates, hours: 2 })).toBe(44);
  });

  it("is null when the facility has set no daycare price at all", () => {
    expect(daycareDayRate({ rates: [], hours: 4 })).toBeNull();
    expect(daycareDayRate({ branchPrice: null, rates: [] })).toBeNull();
  });

  // Zero is a price a facility may genuinely set; null is the absence of one.
  it("keeps a free day distinct from an unpriced one", () => {
    expect(daycareDayRate({ rates: [rate("Free day", 0, 10)], hours: 4 })).toBe(
      0,
    );
    expect(daycareDayRate({ branchPrice: 0, rates: [] })).toBe(0);
  });
});

// ============================================================================
// A RATE CARD SAVED BEFORE ANY OF THIS STILL PRICES.
//
// `settingsFromRows` DROPS a settings domain whose stored value stops parsing,
// so a required new field would have deleted every facility's rate card on
// deploy, silently. Nothing is rewritten; the old fields are read instead.
// ============================================================================
describe("rate cards saved before hours were asked for", () => {
  it("believes the hours the facility typed over the type's guess", () => {
    // Doggieville's actual stored row: type half-day, durationHours 5.
    const stored = [legacyRate("half-day", 45, 5)];
    expect(maxRateHours(stored[0])).toBe(5);
    expect(daycareDayRate({ rates: stored, hours: 5 })).toBe(45);
  });

  // ── AN INFERRED CEILING SELECTS A RATE, IT NEVER WITHHOLDS ONE ──────────
  //
  // This asserted `null` for a stay longer than the only rate, and that
  // reintroduced the bug this module exists to fix, one field further along.
  // The New Booking form defaults a daycare day to the facility's whole open
  // window, so the e2e facility — open 07:00-19:00 with the stock "Full day
  // ... up to 10 hours" description — asked for twelve hours on EVERY default
  // booking, matched no rate, and left Create booking disabled. Four specs in
  // `booking-form-saves` found it.
  //
  // `durationHours` was prose until 2026-09-21. Prose does not get to block a
  // booking; an explicit `maxDurationHours` does.
  it("prices a longer day from the longest legacy rate rather than refusing", () => {
    const stored = [legacyRate("half-day", 45, 5)];
    expect(daycareDayRate({ rates: stored, hours: 6 })).toBe(45);
    expect(daycareDayRate({ rates: stored, hours: 12 })).toBe(45);
  });

  it("the facility's own stored card prices its own open day", () => {
    // Facility 11's actual rows, against its actual hours: open 07:00-19:00.
    const stored = [
      legacyRate("half-day", 24, 5),
      legacyRate("full-day", 38, 10),
    ];
    expect(daycareDayRate({ rates: stored, hours: 5 })).toBe(24);
    expect(daycareDayRate({ rates: stored, hours: 10 })).toBe(38);
    // Twelve hours: longer than either, priced at the longest rather than
    // refused. The overage is a late-pickup fee's job, not a booking blocker.
    expect(daycareDayRate({ rates: stored, hours: 12 })).toBe(38);
  });

  it("but a ceiling the facility actually SET is still a gap", () => {
    // `rate()` sets maxDurationHours, which is what the editor writes now.
    const priced = [rate("Full day", 38, 10)];
    expect(daycareDayRate({ rates: priced, hours: 10 })).toBe(38);
    expect(daycareDayRate({ rates: priced, hours: 12 })).toBeNull();
  });

  it("a set ceiling does not drag an unset one down with it", () => {
    // One rate says where it stops, the other never did. The stay exceeds
    // both: the explicit one is a gap, the legacy one still prices.
    const mixed = [rate("Full day", 60, 8), legacyRate("half-day", 45, 5)];
    expect(daycareDayRate({ rates: mixed, hours: 12 })).toBe(45);
  });

  it("falls back to what the type implied when no hours were saved", () => {
    expect(maxRateHours(legacyRate("hourly", 12))).toBe(1);
    expect(maxRateHours(legacyRate("half-day", 24))).toBe(5);
    expect(maxRateHours(legacyRate("full-day", 38))).toBe(10);
  });

  it("treats a rate that says nothing at all as covering anything", () => {
    // Mid-migration, an unknown length must not price NOTHING — that would
    // take a working facility's rates away on the deploy that added the field.
    const mystery = legacyRate("", 30);
    expect(maxRateHours(mystery)).toBe(0);
    expect(daycareDayRate({ rates: [mystery], hours: 99 })).toBe(30);
  });
});

// ============================================================================
// A RATE OFFERED TO SOME ANIMALS AND NOT OTHERS.
//
// `pets.species` is free text and already disagrees with itself — Pawradise
// holds one pet recorded "dog" and another "Dog" — so a rate set for Dogs must
// still match both, or it silently excludes half its animals.
// ============================================================================
describe("which animals a daycare rate is for", () => {
  const dogsOnly = { ...rate("Dog day", 30, 10), species: ["Dog"] };
  const catsOnly = { ...rate("Cat day", 20, 10), species: ["Cat"] };
  const anyAnimal = rate("Any day", 50, 10);

  it("offers a species-limited rate only to that species", () => {
    const rates = [dogsOnly, catsOnly];
    expect(daycareRateForHours(rates, 4, "Dog")?.name).toBe("Dog day");
    expect(daycareRateForHours(rates, 4, "Cat")?.name).toBe("Cat day");
  });

  it("matches however the pet's record spells it", () => {
    // The real data: one facility holds "dog" and "Dog".
    expect(daycareRateForHours([dogsOnly], 4, "dog")?.name).toBe("Dog day");
    expect(daycareRateForHours([dogsOnly], 4, " DOG ")?.name).toBe("Dog day");
  });

  it("refuses a rate that is not for this animal", () => {
    expect(daycareRateForHours([dogsOnly], 4, "Rabbit")).toBeNull();
    expect(
      daycareDayRate({ rates: [dogsOnly], hours: 4, species: "Cat" }),
    ).toBeNull();
  });

  it("treats a rate naming no species as being for every animal", () => {
    // The default, and the only safe one: a facility that never touches the
    // field keeps every rate working.
    expect(daycareRateForHours([anyAnimal], 4, "Rabbit")?.name).toBe("Any day");
    expect(
      daycareRateForHours([{ ...anyAnimal, species: [] }], 4, "Cat"),
    ).toBeTruthy();
  });

  it("considers every rate when the animal is unknown", () => {
    // A caller that does not know the species must not be told there is no
    // rate — that is a different answer from "none applies".
    expect(daycareRateForHours([dogsOnly, catsOnly], 4)?.name).toBe("Cat day");
  });

  it("still takes the cheapest of the rates that DO apply", () => {
    const rates = [anyAnimal, dogsOnly];
    // $50 is open to all and $30 is dogs-only; a dog pays 30, a rabbit 50.
    expect(daycareDayRate({ rates, hours: 4, species: "Dog" })).toBe(30);
    expect(daycareDayRate({ rates, hours: 4, species: "Rabbit" })).toBe(50);
  });
});
