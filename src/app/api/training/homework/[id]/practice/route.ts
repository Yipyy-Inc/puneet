import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TRAINING_HOMEWORK_SELECT,
  homeworkPracticeSchema,
  homeworkResponseSchema,
  rowToTrainingHomework,
  type TrainingHomeworkRow,
} from "@/lib/api/mappers/training-homework";

// ============================================================================
// /api/training/homework/[id]/practice — the days a piece of homework was
// practised.
//
// POST  log a day — the owner's "Mark as done", or staff — through
//       log_homework_practice(), which decides whether the caller may, keeps
//       one row per day, and moves the next due date. Nobody holds INSERT on
//       the practice table, so this is the only way a day is logged.
// PATCH the trainer's response to one day. Authorised by the practice table's
//       update policy (training_log_progress); an empty response clears it.
//
// Both answer with the homework as it now is, practice days included.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

async function homeworkAsItIs(supabase: Supabase, id: string) {
  const { data } = await supabase
    .from("training_homework")
    .select(TRAINING_HOMEWORK_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data
    ? rowToTrainingHomework(data as unknown as TrainingHomeworkRow)
    : null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "That homework does not exist." },
      { status: 404 },
    );
  }

  const parsed = homeworkPracticeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a day of practice.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("log_homework_practice", {
    p_homework_id: id,
    p_practice_date: parsed.data.date,
  });
  if (error) {
    // 42501: not yours, or no such homework — one answer for both, so a
    // stranger learns nothing. 22023: complete, or a day not yet come.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const homework = await homeworkAsItIs(supabase, id);
  return NextResponse.json(homework ?? { ok: true }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "That homework does not exist." },
      { status: 404 },
    );
  }

  const parsed = homeworkResponseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a response.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const { date, response } = parsed.data;

  const viewer = await getViewer().catch(() => null);
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("training_homework_practice")
    .update(
      response
        ? {
            trainer_response: response,
            trainer_responded_at: new Date().toISOString(),
            trainer_responded_by: viewer?.fullName ?? viewer?.email ?? null,
          }
        : {
            trainer_response: null,
            trainer_responded_at: null,
            trainer_responded_by: null,
          },
    )
    .eq("homework_id", id)
    .eq("practice_date", date)
    .select("homework_id");
  if (error) {
    return writeFailure(error, {
      duplicate: "That response could not be saved.",
      denied: "You do not have permission to respond to homework.",
    });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nothing was practised that day, or it is not yours to respond to.",
      },
      { status: 403 },
    );
  }

  const homework = await homeworkAsItIs(supabase, id);
  return NextResponse.json(homework ?? { ok: true });
}
