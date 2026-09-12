import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TRAINING_HOMEWORK_SELECT,
  rowToTrainingHomework,
  trainingHomeworkAssignSchema,
  type TrainingHomeworkRow,
} from "@/lib/api/mappers/training-homework";

// ============================================================================
// /api/training/homework — training homework, from `training_homework`.
//
// GET  the homework the caller may see, each piece with the days it was
//      practised. Staff read their facility's; an owner reads their own
//      dogs' (RLS). `?enrollmentIds=a,b` narrows to those enrollments.
// POST assign one piece of homework, or several at once — a session assigns
//      each exercise to every dog that attended, in one insert, all or none.
//      Each enrollment is read through RLS first, so one the caller cannot see
//      is a 404; the table's trigger takes the facility, pet and owner from it
//      again regardless of what this route sends.
//
// It was `trainingHomeworkRecords`, a fixture, written with setQueryData.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  let query = supabase
    .from("training_homework")
    .select(TRAINING_HOMEWORK_SELECT)
    .match(inFacility(scope))
    .order("created_at", { ascending: false })
    .limit(2000);

  const narrowed = request.nextUrl.searchParams.get("enrollmentIds");
  if (narrowed !== null) {
    const ids = narrowed
      .split(",")
      .map((id) => id.trim())
      .filter((id) => UUID.test(id));
    // An id that is not a uuid names no real enrollment, so owns no homework.
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("enrollment_id", ids);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as TrainingHomeworkRow[]).map(
      rowToTrainingHomework,
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = trainingHomeworkAssignSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not homework.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const many = Array.isArray(parsed.data);
  const items = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

  const supabase = await createServerClient();
  const enrollmentIds = [...new Set(items.map((item) => item.enrollmentId))];
  const { data: enrollments, error: readError } = await supabase
    .from("training_series_enrollments")
    .select("id, facility_id, pet_id, client_id")
    .in("id", enrollmentIds);
  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  const byId = new Map((enrollments ?? []).map((row) => [row.id, row]));
  if (enrollmentIds.some((id) => !byId.has(id))) {
    return NextResponse.json(
      {
        error:
          "That enrollment does not exist, or is not one you can assign homework on.",
      },
      { status: 404 },
    );
  }

  const viewer = await getViewer().catch(() => null);
  const authorName = viewer?.fullName ?? viewer?.email ?? null;
  const rows = items.map((item) => {
    const enrollment = byId.get(item.enrollmentId)!;
    return {
      enrollment_id: enrollment.id,
      // The trigger takes these three from the enrollment again; they are
      // named because the columns are required, not because they are trusted.
      facility_id: enrollment.facility_id,
      pet_id: enrollment.pet_id,
      client_id: enrollment.client_id,
      session_number: item.sessionNumber ?? 1,
      session_date: item.sessionDate ?? null,
      title: item.title,
      description: item.description ?? "",
      instructions: item.instructions ?? [],
      resources: item.resources ?? [],
      frequency: item.frequency ?? null,
      next_due_date: item.nextDueDate ?? null,
      author_name: authorName,
    };
  });

  const { data, error } = await supabase
    .from("training_homework")
    .insert(rows)
    .select(TRAINING_HOMEWORK_SELECT);
  if (error) {
    return writeFailure(error, {
      duplicate: "That homework is already assigned.",
      denied: "You do not have permission to assign training homework.",
    });
  }

  const created = ((data ?? []) as unknown as TrainingHomeworkRow[]).map(
    rowToTrainingHomework,
  );
  // `.select()` so a refused insert is not a 201 for rows that do not exist.
  if (created.length !== rows.length) {
    return NextResponse.json(
      { error: "That homework was refused." },
      { status: 403 },
    );
  }
  return NextResponse.json(many ? created : created[0], { status: 201 });
}
