import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { readAllPages, type RangeableQuery } from "@/lib/api/read-all-pages";
import {
  careGuestFromBooking,
  type BookingCareDetails,
  type CareGuest,
} from "@/lib/daily-care/care-guest";
import {
  INCIDENT_CARE_ITEM_SELECT,
  toIncidentCare,
  type IncidentCareItemRow,
} from "@/lib/api/mappers/incident-care";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";

// ============================================================================
// Who is in the building today, with what their owners asked for.
//
// ── WHAT THE BOARD USED INSTEAD ───────────────────────────────────────────
//
// `getCurrentGuests()` from `src/data/boarding.ts` — a fixture. The Daily Care
// board listed animals that were not in the building, with feeding schedules
// nobody had given and medications nobody had prescribed, and staff ticked them
// off. It is the screen the kennel actually stands at.
//
// ── WHY NOT /api/boarding/attendance ──────────────────────────────────────
//
// That read is proven and stays untouched. It answers "who is on site and what
// do they owe" for the arrivals board, and it does not carry the booking's
// `details` — where the feeding schedule and the medications live. Widening it
// would put a kilobyte of care instructions on every arrivals-board row for the
// benefit of one other screen.
//
// So this is a second read of the same rows with a different projection, which
// is what a purpose-built endpoint is for.
//
// ── THE FACILITY IS NEVER SENT ────────────────────────────────────────────
//
// RLS scopes `bookings` to the caller's own facilities, and `boarding_stays` is
// an inner join, so "on site today, where I work" is the only thing this can
// return. A facility parameter could only ever be wrong.
// ============================================================================

export const dynamic = "force-dynamic";

export interface DailyCarePayload {
  date: string;
  guests: CareGuest[];
}

/**
 * On site on the given day.
 *
 * `checked_in_at` is not null and `checked_out_at` is — the same definition the
 * arrivals board uses for "in the building". A guest who left this morning is
 * deliberately absent: the board is for animals somebody still has to feed.
 */
const SELECT = `
  ref, start_at, end_at, details,
  clients ( name, phone ),
  booking_pets ( pets ( id, ref, name ) ),
  boarding_stays!inner ( checked_in_at, checked_out_at,
                         facility_rooms ( name ) )
` as const;

interface Row {
  ref: number;
  start_at: string;
  end_at: string;
  details: BookingCareDetails | null;
  clients: { name: string; phone: string | null } | null;
  booking_pets:
    | { pets: { id: string; ref: number; name: string } | null }[]
    | null;
  /**
   * ONE stay, embedded as an object rather than a list.
   *
   * PostgREST embeds a to-one relation as an object, and reading it as an array
   * silently yields `undefined` for every row — so the board came back empty
   * with no error anywhere. `mappers/boarding-arrival.ts` had this right; this
   * route did not, and the spec caught it.
   */
  boarding_stays: {
    checked_in_at: string | null;
    checked_out_at: string | null;
    facility_rooms: { name: string } | null;
  } | null;
}

function nightsBetween(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86_400_000)) : 1;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const requested = new URL(request.url).searchParams.get("date");
  if (requested && !/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    return NextResponse.json(
      { error: "`date` must be YYYY-MM-DD." },
      { status: 400 },
    );
  }
  const date = requested ?? new Date().toISOString().slice(0, 10);

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  // The stay must have STARTED by the end of the requested day and not have
  // ended before it began — a range check rather than "today", because the
  // board's date arrows step backwards and forwards and a journal that only
  // works for today is not a journal.
  // Paged, though this one is already narrowed to a single day and is the least
  // likely of the three to reach a thousand. It is paged anyway because the
  // rule is about the READ, not about today's row count: an unbounded select
  // stops at 1000 without saying so, and a boarding board that silently omits
  // guests is the worst possible place to find that out.
  const { rows: data, error } = await readAllPages<Row>(
    supabase
      .from("bookings")
      .select(SELECT)
      .match(inFacility(scope))
      .eq("service", "boarding")
      .lte("start_at", `${date}T23:59:59Z`)
      .gte("end_at", `${date}T00:00:00Z`)
      .order("ref", { ascending: true }) as unknown as RangeableQuery<Row>,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const petIdsByGuest = new Map<string, string[]>();
  const guests = (data as unknown as Row[])
    .filter((row) => {
      const stay = row.boarding_stays;
      // Arrived, and not yet collected. A booking with a stay row but no
      // arrival is expected rather than present.
      return Boolean(stay?.checked_in_at) && !stay?.checked_out_at;
    })
    .map((row) => {
      const pets = (row.booking_pets ?? [])
        .map((link) => link.pets)
        .filter((pet): pet is { id: string; ref: number; name: string } =>
          Boolean(pet),
        );
      petIdsByGuest.set(
        String(row.ref),
        pets.map((pet) => pet.id),
      );

      return careGuestFromBooking(
        {
          id: String(row.ref),
          petId: pets[0]?.ref ?? 0,
          petNames: pets.map((pet) => pet.name),
          ownerName: row.clients?.name ?? "",
          ownerPhone: row.clients?.phone ?? null,
          roomName: row.boarding_stays?.facility_rooms?.name ?? null,
          scheduledArrival: row.start_at,
          scheduledDeparture: row.end_at,
          nights: nightsBetween(row.start_at, row.end_at),
        },
        row.details ?? {},
      );
    });

  // ── In-stay care from the guests' incidents ────────────────────────────
  //
  // Read from the care items themselves, by pet: the caretaker at the board
  // holds view_pet_records, which reads an item but not the incident behind
  // it, so the item carries its incident's pets (20260914 migrations). Only
  // active items: locking at checkout stops them all.
  const allPetIds = [...new Set([...petIdsByGuest.values()].flat())];
  if (allPetIds.length > 0) {
    const careSelect: string = `${INCIDENT_CARE_ITEM_SELECT}, pet_ids`;
    const { data: careRows } = await supabase
      .from("incident_care_items")
      .select(careSelect)
      .match(inFacility(scope))
      .eq("active", true)
      .overlaps("pet_ids", allPetIds)
      .order("created_at", { ascending: true });
    const items = (careRows ?? []) as unknown as (IncidentCareItemRow & {
      pet_ids: string[];
    })[];
    for (const guest of guests) {
      const mine = new Set(petIdsByGuest.get(guest.id) ?? []);
      const byIncident = new Map<string, IncidentCareItemRow[]>();
      for (const item of items) {
        if (!item.pet_ids.some((id) => mine.has(id))) continue;
        byIncident.set(item.incident_id, [
          ...(byIncident.get(item.incident_id) ?? []),
          item,
        ]);
      }
      if (byIncident.size === 0) continue;
      guest.incidentCare = [...byIncident].map(([incidentId, rows]) => {
        const care = toIncidentCare(incidentId, rows, []);
        return {
          id: incidentId,
          careActions: care.careActions,
          incidentMedications: care.incidentMedications,
        };
      });
    }
  }

  return NextResponse.json({ date, guests } satisfies DailyCarePayload);
}
