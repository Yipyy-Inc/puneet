import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FACILITY_ROOM_SELECT,
  ROOM_CATEGORY_SELECT,
  rowToFacilityRoom,
  rowToRoomCategory,
  type FacilityRoomRow,
  type RoomCategoryRow,
} from "@/lib/api/mappers/boarding";
import { kennelCandidates } from "@/lib/boarding/kennel-on-confirm";
import { isCountedInPets } from "@/lib/boarding/lodging-occupancy";

// ============================================================================
// A confirmed boarding request is given a kennel of the kind it was priced
// for. See kennel-on-confirm.ts for why it had none and which kennels qualify.
//
// ── WHO CALLS IT, AND AS WHOM ─────────────────────────────────────────────
//
// Staff approving a request (`/api/bookings/[ref]/decision`) or finding a
// kennel by hand (`/api/boarding/stays/find`), under their own session,
// through `assign_boarding_room` — the function every kennel board writes
// with — so row-level security judges it exactly as it judges a drag.
//
// And auto-confirm, under the service role it already uses to promote the
// booking: the customer's own session can confirm nothing, and cannot place
// a dog in a kennel either. That one INSERTS the stay itself.
//
// ── WHY THE SERVICE ROLE DOES NOT CALL `assign_boarding_room` ────────────
//
// It cannot. Measured 2026-09-26, locally: "permission denied for schema
// private". The function's override check names `private.has_permission`,
// PL/pgSQL plans the whole condition, and the service role has no USAGE on
// `private` — so it fails even with no override given. Every auto-confirmed
// stay was left with no kennel, silently, because this never throws; an e2e
// retry that passed hid it once. The insert is the function's own branch for
// a booking with no stay yet — same row, same range — and the triggers, the
// deferred tiling check and the exclusion constraint judge it as before
// (checked with `set constraints all immediate`).
//
// ── IT NEVER FAILS THE CONFIRMATION ───────────────────────────────────────
//
// The booking is confirmed before this runs. A kennel that cannot be found or
// written leaves it confirmed with none — which is where every confirmed
// request stood before this existed — and the caller is told, so staff can
// be, and can use "Find a kennel" later.
// ============================================================================

export interface KennelOnConfirm {
  ref: number;
  /** The kennel it was given, by name; null when none was free. */
  kennel: string | null;
}

interface ConfirmedRow {
  id: string;
  ref: number;
  facility_id: string;
  service: string | null;
  status: string;
  start_at: string | null;
  end_at: string | null;
  details: Record<string, unknown> | null;
  /**
   * `pets` is to-one (a link names one pet), so PostgREST sends an object —
   * but the untyped client's inference says an array, and reading a to-one
   * embed as an array is a mistake this repo has made before (an empty board,
   * no error). Both shapes are accepted; see `petOf`.
   */
  booking_pets: { pets: PetFacts | PetFacts[] | null }[] | null;
}

interface PetFacts {
  species: string | null;
  weight: number | null;
}

function petOf(link: { pets: PetFacts | PetFacts[] | null }): PetFacts | null {
  return Array.isArray(link.pets) ? (link.pets[0] ?? null) : link.pets;
}

/**
 * Every CONFIRMED boarding booking among `bookingIds` that holds no kennel,
 * given the first free one its rate allows. Bookings that are not boarding,
 * not confirmed, or already in a kennel are left alone and not reported.
 *
 * `clientsOnly` (the default) keeps to room types clients may book: a
 * customer's request was priced from those. Staff finding a kennel by hand
 * (`/api/boarding/stays/find`) may use any of the rate's types.
 *
 * `serviceRole`: `db` is the service-role client, which cannot call
 * `assign_boarding_room` (see the header), so the stay is inserted directly.
 */
export async function assignKennelsOnConfirm(
  db: SupabaseClient,
  bookingIds: readonly string[],
  {
    clientsOnly = true,
    serviceRole = false,
  }: { clientsOnly?: boolean; serviceRole?: boolean } = {},
): Promise<KennelOnConfirm[]> {
  if (bookingIds.length === 0) return [];
  try {
    const { data } = await db
      .from("bookings")
      .select(
        "id, ref, facility_id, service, status, start_at, end_at, details, booking_pets ( pets ( species, weight ) )",
      )
      .in("id", [...bookingIds]);
    const due = ((data ?? []) as unknown as ConfirmedRow[]).filter(
      (b) =>
        b.service === "boarding" &&
        b.status === "confirmed" &&
        b.start_at &&
        b.end_at,
    );
    if (due.length === 0) return [];

    const { data: held } = await db
      .from("boarding_stays")
      .select("booking_id")
      .in(
        "booking_id",
        due.map((b) => b.id),
      )
      .is("released_at", null);
    const inAKennel = new Set(
      ((held ?? []) as { booking_id: string }[]).map((s) => s.booking_id),
    );

    const outcomes: KennelOnConfirm[] = [];
    for (const booking of due) {
      if (inAKennel.has(booking.id)) continue;
      outcomes.push({
        ref: booking.ref,
        kennel: await firstFreeKennel(db, booking, clientsOnly, serviceRole),
      });
    }
    return outcomes;
  } catch {
    return [];
  }
}

async function firstFreeKennel(
  db: SupabaseClient,
  booking: ConfirmedRow,
  clientsOnly: boolean,
  serviceRole: boolean,
): Promise<string | null> {
  const [{ data: typeRows }, { data: kennelRows }] = await Promise.all([
    db
      .from("room_categories")
      .select(ROOM_CATEGORY_SELECT)
      .eq("facility_id", booking.facility_id)
      .eq("service", "boarding"),
    db
      .from("facility_rooms")
      .select(FACILITY_ROOM_SELECT)
      .eq("facility_id", booking.facility_id)
      .eq("active", true),
  ]);
  const typeRowsTyped = (typeRows ?? []) as RoomCategoryRow[];
  const kennelRowsTyped = (kennelRows ?? []) as FacilityRoomRow[];
  // The facility's numeric ref only labels the app types; nothing here reads it.
  const categories = typeRowsTyped.map((row) => rowToRoomCategory(row, 0));
  const appIdOfType = new Map(
    typeRowsTyped.map((row) => [row.id, row.legacy_id ?? row.id]),
  );
  const units = kennelRowsTyped.map((row) =>
    rowToFacilityRoom(row, 0, appIdOfType),
  );
  const uuidOfKennel = new Map(
    kennelRowsTyped.map((row) => [row.legacy_id ?? row.id, row.id]),
  );

  // The rate the customer picked, by the uuid the wizard saved.
  const rateId = booking.details?.["boardingServiceId"];
  let lodgingTypeIds: string[] | null = null;
  if (typeof rateId === "string" && rateId) {
    const { data: rate } = await db
      .from("boarding_services")
      .select("lodging_type_ids")
      .eq("id", rateId)
      .maybeSingle();
    lodgingTypeIds =
      (rate as { lodging_type_ids: string[] | null } | null)
        ?.lodging_type_ids ?? null;
  }

  const pets = (booking.booking_pets ?? []).flatMap((link) => {
    const pet = petOf(link);
    return pet
      ? [
          {
            type: pet.species ?? "",
            weight: pet.weight === null ? 0 : Number(pet.weight),
          },
        ]
      : [];
  });

  const candidates = kennelCandidates({
    categories,
    units,
    pets,
    lodgingTypeIds,
    clientsOnly,
  });
  if (candidates.length === 0) return null;

  // Kennels already held for these nights. A ROOM holds one booking, so those
  // are skipped without asking; an AREA counts pets, which the database's own
  // trigger judges, so it is always tried.
  const { data: busy } = await db
    .from("boarding_stays")
    .select("room_id")
    .eq("facility_id", booking.facility_id)
    .is("released_at", null)
    .overlaps("occupies", `[${booking.start_at},${booking.end_at})`);
  const taken = new Set(
    ((busy ?? []) as { room_id: string }[]).map((s) => s.room_id),
  );
  const typeOf = new Map(categories.map((c) => [c.id, c]));

  for (const kennel of candidates) {
    const type = typeOf.get(kennel.categoryId);
    const uuid = uuidOfKennel.get(kennel.id);
    // Every kennel read above has one; a kennel without is not one to write.
    if (!uuid) continue;
    if (type && !isCountedInPets(type) && taken.has(uuid)) continue;

    const { error } = serviceRole
      ? // `assign_boarding_room`'s own insert, for a booking with no stay.
        await db.from("boarding_stays").insert({
          booking_id: booking.id,
          facility_id: booking.facility_id,
          room_id: uuid,
          occupies: `[${booking.start_at},${booking.end_at})`,
        })
      : await db.rpc("assign_boarding_room", {
          p_booking_ref: booking.ref,
          p_room_id: kennel.id,
        });
    if (!error) return kennel.name;
    // Taken since it was looked at (23P01, the exclusion constraint), or an
    // area that filled up (23514, `area_full`): try the next one.
    if (error.code === "23P01" || error.code === "23514") continue;
    // Anything else — refused, or a fault — is left for staff to place.
    return null;
  }
  return null;
}
