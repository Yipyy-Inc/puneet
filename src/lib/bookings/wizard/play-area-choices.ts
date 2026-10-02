import { getDaycareAvailabilitySummary } from "@/lib/capacity-engine";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";
import type { DaycareSection } from "@/types/rooms";

/**
 * The play areas staff can put a daycare booking in, on Confirm. The client's
 * mock has no screen for them, and the old details screen's picker went with
 * that screen (2026-10-02) — but not its rules: every pet goes in the one
 * area, so an area one of them does not fit, or one with no room left on a
 * day picked, is listed with the reason and cannot be chosen.
 */
export interface PlayAreaChoice {
  id: string;
  name: string;
  disabled: boolean;
}

export function playAreaChoices({
  pets,
  days,
  sections,
  bookings,
  text,
}: {
  pets: readonly Pet[];
  /** ISO dates, local. */
  days: readonly string[];
  sections: readonly DaycareSection[];
  bookings: readonly Booking[];
  text: {
    spotsLeft: (left: number, capacity: number) => string;
    full: string;
    notFor: (petName: string) => string;
  };
}): PlayAreaChoice[] {
  const active = sections
    .filter((section) => section.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (pets.length === 0 || days.length === 0) {
    return active.map((section) => ({
      id: section.id,
      name: section.name,
      disabled: false,
    }));
  }
  const byPet = pets.map((pet) => ({
    pet,
    rows: new Map(
      getDaycareAvailabilitySummary(
        pet,
        [...days],
        [...sections],
        [...bookings],
      ).map((row) => [row.section.id, row]),
    ),
  }));
  return active.map((section) => {
    const misfit = byPet.find(
      ({ rows }) => rows.get(section.id)?.eligible === false,
    );
    if (misfit) {
      const reason =
        misfit.rows.get(section.id)?.eligibilityMessage ||
        text.notFor(misfit.pet.name);
      return {
        id: section.id,
        name: `${section.name} · ${reason}`,
        disabled: true,
      };
    }
    const left =
      byPet[0]?.rows.get(section.id)?.minRemaining ?? section.capacity;
    if (left <= 0) {
      return {
        id: section.id,
        name: `${section.name} · ${text.full}`,
        disabled: true,
      };
    }
    return {
      id: section.id,
      name: `${section.name} · ${text.spotsLeft(left, section.capacity)}`,
      disabled: false,
    };
  });
}
