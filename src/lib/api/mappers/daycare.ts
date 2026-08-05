import type { DaycareCheckIn, DaycareCheckInStatus } from "@/types/daycare";
import type { PetSize } from "@/types/base";

// ============================================================================
// A daycare visit, from the rows that make it up.
//
// `DaycareCheckIn` is what every daycare screen already renders, so the mapper
// produces exactly that shape rather than a new one — the board, the calendar,
// the reports and the workload planner all keep their types.
//
// ── WHAT IS NOT STORED, AND WHY IT STILL COMES BACK ───────────────────────
//
// petName, petBreed, petSize, ownerName, ownerPhone and photoUrl are absent
// from `daycare_attendance` (Decision 3 in 20260806880000): they belong to the
// pet and the client, and a copy taken at check-in is a phone number that stops
// being reachable the day it changes. They arrive through the join and are
// assembled here.
// ============================================================================

/** A row of the facility's weight→size policy. */
export interface PetSizeTier {
  id: string;
  label: string;
  maxWeightLbs?: number | null;
}

/**
 * The size band a weight falls in.
 *
 * The tiers come from `grooming_config.pet_size_tiers`, which is the FACILITY's
 * size policy despite the table it sits in — `create_booking` already prices a
 * groom with it. Daycare uses the same rows rather than a second list: a dog
 * that is "large" at the grooming till and "medium" on the daycare floor is two
 * answers to one question, and the per-size capacity ceilings would be counted
 * against the wrong band.
 *
 * An unknown weight is the LARGEST band, not the smallest. Guessing small would
 * quietly make room under a ceiling that exists to cap big dogs.
 */
export function sizeForWeight(
  weight: number | null,
  tiers: PetSizeTier[],
): PetSize {
  const ordered = [...tiers].sort(
    (a, b) => (a.maxWeightLbs ?? Infinity) - (b.maxWeightLbs ?? Infinity),
  );
  const unbounded = ordered[ordered.length - 1]?.id ?? "large";
  if (weight === null) return unbounded as PetSize;
  const match = ordered.find((t) =>
    t.maxWeightLbs === null || t.maxWeightLbs === undefined
      ? true
      : weight <= t.maxWeightLbs,
  );
  return (match?.id ?? unbounded) as PetSize;
}

export interface DaycareAttendanceRow {
  booking_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  status: string;
  rate_type: string | null;
  play_group: string | null;
  notes: string;
}

export interface DaycareBookingRow {
  id: string;
  ref: number;
  start_at: string;
  end_at: string;
  status: string;
  service_type: string | null;
  clients: { ref: number; name: string; phone: string | null } | null;
  booking_pets:
    | {
        pets: {
          ref: number;
          name: string;
          breed: string | null;
          weight: number | null;
          image_url: string | null;
        } | null;
      }[]
    | null;
  daycare_attendance: DaycareAttendanceRow | null;
}

export const DAYCARE_BOOKING_SELECT = `
  id, ref, start_at, end_at, status, service_type,
  clients ( ref, name, phone ),
  booking_pets ( pets ( ref, name, breed, weight, image_url ) ),
  daycare_attendance ( booking_id, checked_in_at, checked_out_at, status,
                       rate_type, play_group, notes )
` as const;

/**
 * One visit per BOOKING, using the first pet.
 *
 * `DaycareCheckIn` is single-pet — it has `petId`, not `petIds` — and every
 * screen reading it assumes that. A daycare booking covering two dogs is a real
 * thing and this returns the first of them; splitting one attendance row into
 * two cards would say two dogs were checked in separately when the record says
 * they arrived together.
 *
 * Recorded rather than silently dropped: see the debt map for 2026-08-06.
 */
export function rowToDaycareCheckIn(
  row: DaycareBookingRow,
  tiers: PetSizeTier[],
): DaycareCheckIn | null {
  const pet = (row.booking_pets ?? []).map((bp) => bp.pets).find(Boolean);
  if (!pet) return null;

  const attendance = row.daycare_attendance;
  return {
    // The BOOKING's reference, so anything acting on this visit has the id the
    // write path takes. The fixture's `dc-001` ids referred to nothing.
    id: String(row.ref),
    petId: pet.ref,
    petName: pet.name,
    petBreed: pet.breed ?? "",
    petSize: sizeForWeight(pet.weight, tiers),
    ownerId: row.clients?.ref ?? 0,
    ownerName: row.clients?.name ?? "",
    ownerPhone: row.clients?.phone ?? "",
    // Not yet arrived: the booking's start is when they are DUE, which is what
    // a scheduled row should show.
    checkInTime: attendance?.checked_in_at ?? row.start_at,
    checkOutTime: attendance?.checked_out_at ?? null,
    scheduledCheckOut: row.end_at,
    rateType: (attendance?.rate_type ??
      row.service_type ??
      "full-day") as DaycareCheckIn["rateType"],
    // Straight from the generated column. No row means booked and not arrived.
    status: (attendance?.status ?? "scheduled") as DaycareCheckInStatus,
    notes: attendance?.notes ?? "",
    playGroup: attendance?.play_group ?? null,
    ...(pet.image_url ? { photoUrl: pet.image_url } : {}),
  };
}
