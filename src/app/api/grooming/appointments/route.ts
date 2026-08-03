import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  APPOINTMENT_SELECT,
  GROOMING_STATUS_TO_BOOKING,
  rowToGroomingAppointment,
  type AppointmentRow,
  type HistoryRow,
  type SizeTier,
} from "@/lib/api/mappers/grooming-appointment";

// ============================================================================
// Grooming appointments — the board's, the calendar's and the detail page's
// source.
//
// `service = 'grooming'` IS THE FILTER, and that was a correction. The obvious
// guess is `service_type = 'grooming'`; it returns zero rows. In this schema
// `service` holds the MODULE ('grooming', 'boarding', 'daycare', 'training')
// and `service_type` the variant within it ('full_groom', 'bath_brush',
// 'full_day', 'standard'). Checked against the data before this was written —
// `standard` and `deluxe` belong to boarding as room tiers, so filtering on
// service_type would have been wrong in both directions.
//
// THE PATCH IS A STATUS TRANSITION, not a general update. It writes
// `bookings.status`, which is what fires the lifecycle triggers from
// 20260805140000: check-in stamps the clock and derives the ready-ETA from the
// add-ons on the ticket, completion stamps check-out, reopening clears it. The
// route deliberately does NOT compute or send any of those — a timestamp the
// client chose is not a record of when something happened.
// ============================================================================

export const dynamic = "force-dynamic";

const DEFAULT_TIERS: SizeTier[] = [
  { id: "small", label: "Small", maxWeightLbs: 15 },
  { id: "medium", label: "Medium", maxWeightLbs: 35 },
  { id: "large", label: "Large", maxWeightLbs: 70 },
  { id: "giant", label: "Giant" },
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const context = await getFacilityContext();
  const timeZone = context?.timeZone ?? "UTC";

  // The facility's own weight tiers, for pets on bookings that predate the
  // extension table and therefore have no size snapshot.
  const { data: config } = await supabase
    .from("grooming_config")
    .select("pet_size_tiers")
    .maybeSingle();
  const tiers = ((config?.pet_size_tiers as SizeTier[] | null) ??
    DEFAULT_TIERS) as SizeTier[];

  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  let query = supabase
    .from("bookings")
    .select(APPOINTMENT_SELECT)
    .eq("service", "grooming")
    .order("start_at", { ascending: true });

  // Optional day filter. The board asks for today; the calendar asks for a
  // range it builds itself, so this stays a single day rather than guessing at
  // a window.
  if (date) {
    query = query
      .gte("start_at", `${date}T00:00:00`)
      .lt("start_at", `${date}T23:59:59.999`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = data as unknown as AppointmentRow[];

  // History cannot be embedded: the table holds `booking_id` as a plain
  // identifier with no foreign key, because an immutable table cannot
  // participate in cascades (20260806160000, Decision 2), and PostgREST embeds
  // relationships. One extra query for the page, grouped in memory — not one
  // per appointment.
  //
  // Scoped by the ids actually being returned rather than fetching the
  // facility's whole trail: this table only grows, and a board asking for today
  // has no business reading two years of it.
  const bookingIds = rows.map((r) => r.id).filter(Boolean);
  const historyByBooking = new Map<string, HistoryRow[]>();
  if (bookingIds.length > 0) {
    const { data: historyRows } = await supabase
      .from("grooming_appointment_history")
      .select(
        "id, booking_id, kind, description, field, before_value, after_value, author_name, created_at",
      )
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true });

    for (const entry of (historyRows ?? []) as unknown as (HistoryRow & {
      booking_id: string;
    })[]) {
      const list = historyByBooking.get(entry.booking_id) ?? [];
      list.push(entry);
      historyByBooking.set(entry.booking_id, list);
    }
  }

  return NextResponse.json(
    rows.map((row) =>
      rowToGroomingAppointment(row, {
        timeZone,
        tiers,
        history: historyByBooking.get(row.id) ?? [],
      }),
    ),
  );
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: string;
    stationId?: string | null;
    sessionProgress?: { step: string; done: boolean; at?: string }[];
  } | null;

  if (!body?.id) {
    return NextResponse.json(
      { error: "An appointment is required." },
      { status: 422 },
    );
  }

  const ref = Number(body.id);
  if (!Number.isFinite(ref)) {
    return NextResponse.json(
      { error: "That is not an appointment reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", ref)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "That appointment does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // The station is assigned on the EXTENSION row, and separately from the
  // status: a groomer can move a pet between tables without changing where it
  // is in the day.
  if (body.stationId !== undefined) {
    let stationUuid: string | null = null;
    if (body.stationId) {
      const { data: station } = await supabase
        .from("grooming_stations")
        .select("id")
        .eq("legacy_id", body.stationId)
        .maybeSingle();
      stationUuid = (station?.id as string | undefined) ?? null;
    }
    const { error: stationError } = await supabase
      .from("grooming_appointments")
      .update({ station_id: stationUuid } as never)
      .eq("booking_id", booking.id);
    if (stationError) {
      return writeFailure(stationError, {
        denied: "Not allowed to change this appointment.",
        duplicate: "That station is already assigned.",
      });
    }
  }

  // The in-progress step checklist. Replaced whole, because that is how the
  // panel edits it — every toggle rewrites the array (20260806140000,
  // Decision 4). Rejected here rather than trusted: the column's CHECK only
  // asserts it is an array, so a caller could otherwise store an array of
  // anything and the panel would render blank rows it cannot explain.
  if (body.sessionProgress !== undefined) {
    if (
      !Array.isArray(body.sessionProgress) ||
      body.sessionProgress.some(
        (s) => typeof s?.step !== "string" || typeof s?.done !== "boolean",
      )
    ) {
      return NextResponse.json(
        { error: "Each checklist step needs a name and a done flag." },
        { status: 422 },
      );
    }
    const { error: progressError } = await supabase
      .from("grooming_appointments")
      .update({ session_progress: body.sessionProgress } as never)
      .eq("booking_id", booking.id);
    if (progressError) {
      return writeFailure(progressError, {
        denied: "Not allowed to change this appointment.",
        duplicate: "That change conflicts with the current state.",
      });
    }
  }

  if (body.status !== undefined) {
    const bookingStatus = GROOMING_STATUS_TO_BOOKING[body.status];
    if (!bookingStatus) {
      return NextResponse.json(
        { error: `Unknown status: ${body.status}` },
        { status: 422 },
      );
    }

    // Status only. check_in_at, check_out_at and estimated_ready_at are the
    // trigger's to write — see the header.
    const { error: statusError } = await supabase
      .from("bookings")
      .update({ status: bookingStatus } as never)
      .eq("id", booking.id);

    if (statusError) {
      return writeFailure(statusError, {
        denied: "Not allowed to change this appointment.",
        duplicate: "That change conflicts with the current state.",
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}
