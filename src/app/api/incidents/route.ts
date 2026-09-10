import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import { hydrateIncidents } from "@/lib/api/incidents-server";
import {
  INCIDENT_SELECT_CUSTOMER,
  INCIDENT_SELECT_STAFF,
  incidentWriteSchema,
  type IncidentRow,
} from "@/lib/api/mappers/incident";

// ============================================================================
// A facility's incidents, and reporting a new one.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `incidentQueries` returned the `@/data/incidents` fixture, and the report
// form pushed onto that array — so an incident reported at 6pm was gone at
// 6:01 if anybody reloaded, and the list every facility saw was the same
// fourteen invented ones. `public.incidents` has existed since 20260829180000
// with nothing writing it.
//
// ── WHO READS WHAT ────────────────────────────────────────────────────────
//
// Staff with `ops_incidents_view` read the facility's incidents. An OWNER may
// read incidents about their own client record — RLS admits the row but cannot
// narrow its columns, so for a customer this route selects a list with no
// `internal_notes` in it. That column is what staff write for each other while
// on the phone to the owner; it does not leave this route for a customer.
//
// ── REPORTING IS A CARE ACT ───────────────────────────────────────────────
//
// Inserting takes `log_incidents`, which a caretaker holds: whoever saw it
// happen writes it down. The pets, booking and staff arrive as refs and ids
// and are resolved against THIS facility before anything is written.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  // Widened to `string` on purpose: two literal selects in one ternary is a
  // union the client's type parser cannot represent.
  const columns: string = scope
    ? INCIDENT_SELECT_STAFF
    : INCIDENT_SELECT_CUSTOMER;
  const { data, error } = await supabase
    .from("incidents")
    .select(columns)
    .match(inFacility(scope))
    .order("occurred_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    await hydrateIncidents(supabase, (data ?? []) as unknown as IncidentRow[]),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = incidentWriteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not an incident.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const write = parsed.data;

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }
  const supabase = await createServerClient();

  const { data: pets } = await supabase
    .from("pets")
    .select("id, ref, client_id")
    .in("ref", write.petRefs)
    .eq("facility_id", facility.facilityId);
  const found = (pets ?? []) as {
    id: string;
    ref: number;
    client_id: string;
  }[];
  if (found.length !== new Set(write.petRefs).size) {
    return NextResponse.json(
      { error: "One of those pets is not at this facility." },
      { status: 404 },
    );
  }

  let bookingId: string | null = null;
  if (write.bookingRef) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("ref", write.bookingRef)
      .eq("facility_id", facility.facilityId)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json(
        { error: "That booking is not at this facility." },
        { status: 404 },
      );
    }
    bookingId = booking.id;
  }

  // Staff arrive as whatever the staff list hands out — a legacy id or a uuid.
  let staffIds: string[] = [];
  if (write.staffIds.length > 0) {
    const uuids = write.staffIds.filter((s) => /^[0-9a-f-]{36}$/i.test(s));
    const legacy = write.staffIds.filter((s) => !uuids.includes(s));
    const [byId, byLegacy] = await Promise.all([
      uuids.length
        ? supabase
            .from("staff")
            .select("id")
            .in("id", uuids)
            .eq("facility_id", facility.facilityId)
        : Promise.resolve({ data: [] }),
      legacy.length
        ? supabase
            .from("staff")
            .select("id")
            .in("legacy_id", legacy)
            .eq("facility_id", facility.facilityId)
        : Promise.resolve({ data: [] }),
    ]);
    staffIds = [
      ...((byId.data ?? []) as { id: string }[]),
      ...((byLegacy.data ?? []) as { id: string }[]),
    ].map((s) => s.id);
  }

  const owners = new Set(found.map((p) => p.client_id));
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      facility_id: facility.facilityId,
      booking_id: bookingId,
      // One owner, or none: an incident across two households is about both,
      // and naming one would show it to that owner and not the other.
      client_id: owners.size === 1 ? [...owners][0] : null,
      kind: write.type,
      severity: write.severity,
      title: write.title,
      description: write.description,
      internal_notes: write.internalNotes,
      client_notes: write.clientFacingNotes,
      pet_ids: found.map((p) => p.id),
      staff_ids: staffIds,
      occurred_at: new Date(write.incidentDate).toISOString(),
      reported_by: user.id,
    })
    .select(INCIDENT_SELECT_STAFF)
    .single();

  if (error) {
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "An incident cannot be dated more than a day ahead." },
        { status: 422 },
      );
    }
    return writeFailure(error, {
      duplicate: "That incident already exists.",
      denied: "You do not have permission to report incidents here.",
    });
  }

  const [incident] = await hydrateIncidents(supabase, [
    data as unknown as IncidentRow,
  ]);
  return NextResponse.json(incident, { status: 201 });
}
