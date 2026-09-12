import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TRAINING_NOTE_SELECT,
  asUuid,
  rowToTrainerNote,
  trainingNoteCreateSchema,
  type TrainingNoteRow,
} from "@/lib/api/mappers/training-note";

// ============================================================================
// /api/training/notes — the trainers' notes, from `training_notes`.
//
// GET  the facility's notes, newest first; `?petRef=` narrows to one pet.
//      Read by the profile, its Overview alert, the calendar card and the
//      pre-session briefing, which is why it lists the facility rather than
//      one pet at a time.
// POST one note on one pet. The pet is resolved inside the session's
//      facility; the table's trigger takes the facility and the owner from it.
//
// They were the `trainerNotes` fixture, written with setQueryData.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  let query = supabase
    .from("training_notes")
    .select(TRAINING_NOTE_SELECT)
    .match(inFacility(scope))
    .order("created_at", { ascending: false })
    .limit(2000);

  const petRef = Number(request.nextUrl.searchParams.get("petRef"));
  if (Number.isInteger(petRef) && petRef > 0) {
    const { data: pet } = await supabase
      .from("pets")
      .select("id")
      .eq("ref", petRef)
      .match(inFacility(scope))
      .maybeSingle();
    if (!pet) return NextResponse.json([]);
    query = query.eq("pet_id", (pet as { id: string }).id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as TrainingNoteRow[]).map(rowToTrainerNote),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = trainingNoteCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a note.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const write = parsed.data;

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id")
    .eq("ref", write.petRef)
    .match(inFacility(facility.facilityId))
    .maybeSingle();
  if (!pet) {
    return NextResponse.json(
      { error: "That pet does not exist at this facility." },
      { status: 404 },
    );
  }
  const petId = (pet as { id: string }).id;

  // One pinned note per pet (a unique index says so): pinning this one
  // unpins the last, which is what the Overview card shows.
  if (write.isPinnedToProfile) {
    await supabase
      .from("training_notes")
      .update({ is_pinned: false, pinned_at: null })
      .eq("pet_id", petId)
      .eq("is_pinned", true)
      .select("id"); // rls-write-ok: clearing the previous pin; the insert below reports a refusal
  }

  const viewer = await getViewer().catch(() => null);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("training_notes")
    .insert({
      facility_id: facility.facilityId,
      pet_id: petId,
      category: write.category,
      body: write.note,
      is_private: write.isPrivate ?? true,
      is_active_alert: write.isActiveAlert ?? false,
      is_pinned: write.isPinnedToProfile ?? false,
      pinned_at: write.isPinnedToProfile ? now : null,
      enrollment_id: asUuid(write.enrollmentId),
      session_id: asUuid(write.sessionId),
      class_name: write.className ?? null,
      author_name: viewer?.fullName ?? viewer?.email ?? null,
    })
    .select(TRAINING_NOTE_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "Another note is already pinned for this pet.",
      denied: "You do not have permission to write training notes.",
    });
  }

  return NextResponse.json(
    rowToTrainerNote(data as unknown as TrainingNoteRow),
    { status: 201 },
  );
}
