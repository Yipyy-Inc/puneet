import { describe, expect, test } from "bun:test";

import { playAreaChoices } from "@/lib/bookings/wizard/play-area-choices";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";
import type { DaycareSection } from "@/types/rooms";

const pet = (id: number, name: string, weight: number): Pet =>
  ({ id, name, weight, type: "Dog" }) as unknown as Pet;

const section = (patch: Partial<DaycareSection>): DaycareSection => ({
  id: "small",
  playAreaId: "yard",
  name: "Small dogs",
  capacity: 2,
  isActive: true,
  sortOrder: 0,
  rules: [],
  color: "blue",
  ...patch,
});

const booking = (patch: Partial<Booking>): Booking =>
  ({
    id: 1,
    clientId: 1,
    petId: 1,
    facilityId: 0,
    service: "daycare",
    startDate: "2026-10-05",
    endDate: "2026-10-05",
    status: "confirmed",
    basePrice: 0,
    discount: 0,
    totalCost: 0,
    ...patch,
  }) as Booking;

const text = {
  spotsLeft: (left: number, capacity: number) => `${left} of ${capacity}`,
  full: "Full",
  notFor: (name: string) => `Not for ${name}`,
};

describe("playAreaChoices", () => {
  test("before any day is picked, the active areas by name, all open", () => {
    expect(
      playAreaChoices({
        pets: [pet(1, "Kofi", 20)],
        days: [],
        sections: [
          section({ id: "b", name: "Big dogs", sortOrder: 1 }),
          section({ id: "a", name: "Small dogs", sortOrder: 0 }),
          section({ id: "off", isActive: false }),
        ],
        bookings: [],
        text,
      }),
    ).toEqual([
      { id: "a", name: "Small dogs", disabled: false },
      { id: "b", name: "Big dogs", disabled: false },
    ]);
  });

  test("the room left is the worst day's, and a full area cannot be chosen", () => {
    const choices = playAreaChoices({
      pets: [pet(1, "Kofi", 20)],
      days: ["2026-10-05", "2026-10-06"],
      sections: [section({ id: "small", capacity: 2 })],
      bookings: [
        booking({
          sectionId: "small",
          startDate: "2026-10-06",
          endDate: "2026-10-06",
        }),
      ],
      text,
    });
    expect(choices).toEqual([
      { id: "small", name: "Small dogs · 1 of 2", disabled: false },
    ]);
    expect(
      playAreaChoices({
        pets: [pet(1, "Kofi", 20)],
        days: ["2026-10-06"],
        sections: [section({ id: "small", capacity: 1 })],
        bookings: [
          booking({
            sectionId: "small",
            startDate: "2026-10-06",
            endDate: "2026-10-06",
          }),
        ],
        text,
      }),
    ).toEqual([{ id: "small", name: "Small dogs · Full", disabled: true }]);
  });

  test("an area one pet does not fit says why, in the facility's words when it has them", () => {
    const rules = [
      {
        id: "r1",
        type: "max_weight" as const,
        value: 25,
        clientMessage: "Under 25 lb only",
        enabled: true,
      },
    ];
    expect(
      playAreaChoices({
        pets: [pet(1, "Kofi", 20), pet(2, "Mango", 70)],
        days: ["2026-10-05"],
        sections: [section({ rules })],
        bookings: [],
        text,
      }),
    ).toEqual([
      { id: "small", name: "Small dogs · Under 25 lb only", disabled: true },
    ]);
    expect(
      playAreaChoices({
        pets: [pet(2, "Mango", 70)],
        days: ["2026-10-05"],
        sections: [section({ rules: [{ ...rules[0], clientMessage: "" }] })],
        bookings: [],
        text,
      }),
    ).toEqual([
      { id: "small", name: "Small dogs · Not for Mango", disabled: true },
    ]);
  });
});
