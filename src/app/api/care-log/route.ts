import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// What was actually done for a booking: meals, doses, rounds.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Nothing on the server, which was the problem. `src/data/care-log-store.ts`
// held executions in a module-level array and the booking page's FEEDING and
// MEDICATIONS panels each kept their own `useState` copy. A reload lost the
// lot, and the panels' controls were hidden on 2026-08-19 rather than left to
// lose a dose record (PR #145).
//
// ── THE FACILITY IS NEVER SENT ────────────────────────────────────────────
//
// `care_log_set_facility` derives it from the booking, and the booking is
// resolved here through an RLS read the CALLER has to be able to make. So
// naming somebody else's booking returns nothing to write against rather than
// writing against it.
//
// ── UPSERT, BECAUSE CORRECTING A MEAL IS NOT A SECOND MEAL ────────────────
//
// One row per (booking, task, day), enforced by
// `care_log_one_per_task_per_day`. Logging the same slot again edits the
// record — which is what the mock store did, and what somebody who mis-taps
// "refused" instead of "ate all" needs.
// ============================================================================

export const dynamic = "force-dynamic";

const TASK_TYPES = [
  "feeding",
  "medication",
  "potty",
  "cleaning",
  "walk",
  "addon",
  "other",
] as const;

export interface CareLogEntry {
  id: string;
  bookingRef: number;
  petRef: number | null;
  taskKey: string;
  taskType: (typeof TASK_TYPES)[number];
  occurredOn: string;
  executedAt: string;
  servedAt: string | null;
  outcome: string;
  notes: string | null;
  recordedByName: string | null;
  createdAt: string;
}

const SELECT =
  "id, task_key, task_type, occurred_on, executed_at, served_at, outcome, notes, recorded_by_name, created_at, bookings!inner(ref), pets(ref)";

type Row = {
  id: string;
  task_key: string;
  task_type: CareLogEntry["taskType"];
  occurred_on: string;
  executed_at: string;
  served_at: string | null;
  outcome: string;
  notes: string | null;
  recorded_by_name: string | null;
  created_at: string;
  bookings: { ref: number } | null;
  pets: { ref: number } | null;
};

function toEntry(row: Row): CareLogEntry {
  return {
    id: row.id,
    bookingRef: row.bookings?.ref ?? 0,
    petRef: row.pets?.ref ?? null,
    taskKey: row.task_key,
    taskType: row.task_type,
    occurredOn: row.occurred_on,
    // Postgres `time` comes back as "08:00:00"; the panels render "HH:MM".
    executedAt: row.executed_at.slice(0, 5),
    servedAt: row.served_at ? row.served_at.slice(0, 5) : null,
    outcome: row.outcome,
    notes: row.notes,
    recordedByName: row.recorded_by_name,
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = Number(
    new URL(request.url).searchParams.get("bookingRef"),
  );
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json(
      { error: "bookingRef is required." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("care_log_entries")
    .select(SELECT)
    .eq("bookings.ref", bookingRef)
    .order("occurred_on", { ascending: true })
    .order("executed_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data as unknown as Row[]).map(toEntry));
}

interface LogInput {
  bookingRef?: number;
  petRef?: number | null;
  taskKey?: string;
  taskType?: string;
  occurredOn?: string;
  executedAt?: string;
  servedAt?: string | null;
  outcome?: string;
  notes?: string | null;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => ({}))) as LogInput;

  if (!input.bookingRef || !input.taskKey?.trim() || !input.outcome?.trim()) {
    return NextResponse.json(
      { error: "A booking, a task and an outcome are required." },
      { status: 422 },
    );
  }
  if (
    !input.taskType ||
    !TASK_TYPES.includes(input.taskType as CareLogEntry["taskType"])
  ) {
    return NextResponse.json(
      { error: `taskType must be one of: ${TASK_TYPES.join(", ")}.` },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // Through RLS as the caller. A booking they cannot see is a booking they
  // cannot log against, and it fails here with a sentence rather than as a
  // foreign-key violation further down.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", input.bookingRef)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: `No booking ${input.bookingRef} you can log against.` },
      { status: 404 },
    );
  }

  let petId: string | null = null;
  if (input.petRef != null) {
    const { data: pet } = await supabase
      .from("pets")
      .select("id")
      .eq("ref", input.petRef)
      .maybeSingle();
    if (!pet) {
      return NextResponse.json(
        { error: "That pet could not be found." },
        { status: 404 },
      );
    }
    petId = pet.id as string;
  }

  const { data, error } = await supabase
    .from("care_log_entries")
    .upsert(
      {
        booking_id: booking.id as string,
        pet_id: petId,
        task_key: input.taskKey.trim(),
        task_type: input.taskType,
        occurred_on: input.occurredOn ?? new Date().toISOString().slice(0, 10),
        executed_at: input.executedAt ?? new Date().toTimeString().slice(0, 5),
        served_at: input.servedAt ?? null,
        outcome: input.outcome.trim(),
        notes: input.notes?.trim() || null,
        recorded_by: viewer.userId,
        // Snapshotted, not joined: a journal that renames itself when somebody
        // leaves the business is not a journal.
        recorded_by_name: viewer.fullName ?? viewer.email ?? null,
      } as never,
      { onConflict: "booking_id,task_key,occurred_on" },
    )
    .select(SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "You are not allowed to log this kind of care at this facility.",
      duplicate: "That task is already logged for this day.",
    });
  }

  return NextResponse.json(toEntry(data as unknown as Row), { status: 201 });
}
