import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  WAITLIST_SELECT,
  rowToWaitlistEntry,
  staffLegacyMap,
  type WaitlistRow,
} from "@/lib/api/mappers/grooming-waitlist";

// ============================================================================
// The grooming waitlist.
//
// ── THE WRITE ACCEPTS A PREFERENCE, NOT ITS CONSEQUENCES ───────────────────
//
// A caller sends what the client asked for — a kind and its payload — and none
// of the things the database derives from it: not `anchor_date`, not
// `offered_at`, not `offered_until`. Those are stamped by trigger
// (20260806100000, Decisions 3 and 4), and accepting them here would hand the
// browser the two facts that decide where somebody appears on the calendar and
// how long they hold a slot.
//
// ── THE SHAPE IS VALIDATED HERE TOO, AND THAT IS NOT DUPLICATION ───────────
//
// The CHECK constraints are the guarantee; this is the error message. A caller
// that sends `kind: "range"` with no dates gets a 422 naming the missing field
// instead of a 500 carrying a constraint name, and the constraint is still what
// makes the bad row impossible if this code is ever wrong.
// ============================================================================

export const dynamic = "force-dynamic";

const DATE_KINDS = ["asap", "specific-date", "day-of-week", "range"] as const;
const TIME_KINDS = ["anytime", "period", "exact-time"] as const;
const SOURCES = [
  "manual",
  "calendar-plus",
  "moved-from-appointment",
  "online-booking",
  "intake-form",
] as const;

type ExpectedDateInput =
  | { kind: "asap" }
  | { kind: "specific-date"; date?: string }
  | { kind: "day-of-week"; daysOfWeek?: number[] }
  | { kind: "range"; startDate?: string; endDate?: string };

type ExpectedTimeInput =
  | { kind: "anytime" }
  | { kind: "period"; period?: string }
  | { kind: "exact-time"; time?: string };

interface WaitlistInput {
  clientId?: number;
  petId?: number;
  petName?: string;
  petBreed?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  serviceName?: string;
  expectedDate?: ExpectedDateInput;
  expectedTime?: ExpectedTimeInput;
  excludedDates?: string[];
  preferredStylistIds?: string[];
  validUntil?: string;
  postalCode?: string;
  source?: string;
  comment?: string;
}

/** uuid → staff legacy id. One query per request; see the mapper header for
 *  why the join cannot be embedded. */
async function readStaffLegacyMap(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<Map<string, string>> {
  const { data } = await supabase.from("staff").select("id, legacy_id");
  return staffLegacyMap(data);
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("grooming_waitlist_entries")
    .select(WAITLIST_SELECT)
    // `removed` is a status, not a delete (20260806100000), so the queue keeps
    // the row and the list drops it — the provider filtered these out too.
    .neq("status", "removed")
    // FIFO. The matcher re-sorts by the same key; ordering here means the
    // screens that just render the list are already first-come-first-served.
    .order("added_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const staff = await readStaffLegacyMap(supabase);
  return NextResponse.json(
    (data as unknown as WaitlistRow[]).map((row) =>
      rowToWaitlistEntry(row, staff),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request
    .json()
    .catch(() => null)) as WaitlistInput | null;

  if (!input?.petName?.trim() || !input.ownerName?.trim()) {
    return NextResponse.json(
      { error: "A pet name and an owner name are required." },
      { status: 422 },
    );
  }
  if (!input.serviceName?.trim()) {
    return NextResponse.json(
      { error: "Which service are they waiting for?" },
      { status: 422 },
    );
  }

  const expectedDate = input.expectedDate ?? { kind: "asap" as const };
  const expectedTime = input.expectedTime ?? { kind: "anytime" as const };

  if (!DATE_KINDS.includes(expectedDate.kind as (typeof DATE_KINDS)[number])) {
    return NextResponse.json(
      { error: "Unrecognised date preference." },
      { status: 422 },
    );
  }
  if (!TIME_KINDS.includes(expectedTime.kind as (typeof TIME_KINDS)[number])) {
    return NextResponse.json(
      { error: "Unrecognised time preference." },
      { status: 422 },
    );
  }

  // Each kind names exactly the columns it uses. Everything else stays null —
  // which is what the CHECK constraint demands, and what makes the stored row
  // unambiguous rather than "a range that also has a specific date".
  const dateColumns = {
    expected_date_kind: expectedDate.kind,
    expected_date:
      expectedDate.kind === "specific-date"
        ? (expectedDate.date ?? null)
        : null,
    expected_days_of_week:
      expectedDate.kind === "day-of-week"
        ? (expectedDate.daysOfWeek ?? null)
        : null,
    expected_start_date:
      expectedDate.kind === "range" ? (expectedDate.startDate ?? null) : null,
    expected_end_date:
      expectedDate.kind === "range" ? (expectedDate.endDate ?? null) : null,
  };

  if (expectedDate.kind === "specific-date" && !dateColumns.expected_date) {
    return NextResponse.json(
      { error: "Pick the date they are waiting for." },
      { status: 422 },
    );
  }
  if (
    expectedDate.kind === "day-of-week" &&
    !dateColumns.expected_days_of_week?.length
  ) {
    return NextResponse.json(
      { error: "Pick at least one weekday." },
      { status: 422 },
    );
  }
  if (
    expectedDate.kind === "range" &&
    (!dateColumns.expected_start_date || !dateColumns.expected_end_date)
  ) {
    return NextResponse.json(
      { error: "A range needs both a start and an end date." },
      { status: 422 },
    );
  }

  const timeColumns = {
    expected_time_kind: expectedTime.kind,
    expected_period:
      expectedTime.kind === "period" ? (expectedTime.period ?? null) : null,
    expected_time:
      expectedTime.kind === "exact-time" ? (expectedTime.time ?? null) : null,
  };

  if (expectedTime.kind === "period" && !timeColumns.expected_period) {
    return NextResponse.json({ error: "Pick a time of day." }, { status: 422 });
  }
  if (expectedTime.kind === "exact-time" && !timeColumns.expected_time) {
    return NextResponse.json({ error: "Pick a time." }, { status: 422 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  // The screens address clients, pets and staff by their legacy numbers/ids.
  // Resolved here rather than trusted: an id that does not belong to this
  // facility comes back empty and the entry is stored without it, and the
  // trigger refuses it outright if one is somehow smuggled through.
  const [clientRow, petRow] = await Promise.all([
    input.clientId != null
      ? supabase
          .from("clients")
          .select("id")
          .eq("ref", input.clientId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    input.petId != null
      ? supabase.from("pets").select("id").eq("ref", input.petId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let preferredStaffIds: string[] = [];
  if (input.preferredStylistIds?.length) {
    const { data: staffRows } = await supabase
      .from("staff")
      .select("id")
      .in("legacy_id", input.preferredStylistIds);
    preferredStaffIds = ((staffRows ?? []) as { id: string }[]).map(
      (s) => s.id,
    );
  }

  const { data: service } = await supabase
    .from("grooming_services")
    .select("id")
    .eq("facility_id", context.facilityId)
    .eq("name", input.serviceName)
    .maybeSingle();

  const { data, error } = await supabase
    .from("grooming_waitlist_entries")
    .insert({
      facility_id: context.facilityId,
      client_id: (clientRow.data as { id: string } | null)?.id ?? null,
      pet_id: (petRow.data as { id: string } | null)?.id ?? null,
      pet_name: input.petName.trim(),
      pet_breed: input.petBreed ?? "",
      owner_name: input.ownerName.trim(),
      owner_phone: input.ownerPhone ?? "",
      owner_email: input.ownerEmail ?? null,
      service_id: (service as { id: string } | null)?.id ?? null,
      service_name: input.serviceName.trim(),
      ...dateColumns,
      ...timeColumns,
      excluded_dates: input.excludedDates ?? [],
      preferred_staff_ids: preferredStaffIds,
      valid_until: input.validUntil ?? null,
      postal_code: input.postalCode ?? null,
      source: SOURCES.includes(input.source as (typeof SOURCES)[number])
        ? input.source
        : "manual",
      comment: input.comment ?? null,
      // `anchor_date`, `status`, `offered_*` are deliberately absent. See the
      // header: the database owns them.
    } as never)
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add to the waitlist at this facility.",
      duplicate: "That waitlist entry already exists.",
    });
  }

  const staff = await readStaffLegacyMap(supabase);
  return NextResponse.json(
    rowToWaitlistEntry(data as unknown as WaitlistRow, staff),
    { status: 201 },
  );
}
