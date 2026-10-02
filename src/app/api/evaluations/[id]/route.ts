import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  EVALUATION_PHOTO_BUCKET,
  evaluationDetail,
} from "@/lib/evaluations/detail-server";
import { evaluationFailure } from "@/lib/evaluations/rpc-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// /api/evaluations/[id] — one evaluation (the client's mock, 2026-10-02).
//
// GET     everything the evaluator's dialog and the review dialog show
// PATCH   save answers as they are given (the dialog autosaves); in review,
//         the note to the owner only (public.save_evaluation decides)
// DELETE  throw away an evaluation still being answered, and its photo
//
// RLS decides who may read it; the database functions, who may change it.
// ============================================================================

export const dynamic = "force-dynamic";

const ID = z.string().uuid();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  if (!ID.safeParse(id).success) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createServerClient();
  const detail = await evaluationDetail(supabase, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json(detail);
}

const short = z.string().trim().min(1).max(80);
const patchSchema = z
  .object({
    answers: z.record(z.string().max(64), z.string().max(500)).optional(),
    strengths: z.array(short).max(20).optional(),
    watchFor: z.array(short).max(20).optional(),
    ownerNote: z.string().max(4000).optional(),
    internalNote: z.string().max(4000).optional(),
    approvedServices: z.array(short).max(20).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!ID.safeParse(id).success || !parsed.success) {
    return NextResponse.json(
      { error: "Those answers could not be read." },
      { status: 422 },
    );
  }
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("save_evaluation", {
    p_evaluation_id: id,
    p_patch: parsed.data,
  });
  if (error) return evaluationFailure(error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  if (!ID.safeParse(id).success) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createServerClient();
  // The photo first: once the row is gone, nothing says whose file it was,
  // and the storage policy cannot let anyone remove it.
  const { data: row } = await supabase
    .from("evaluations")
    .select("photo_path, status")
    .eq("id", id)
    .maybeSingle();
  const photo = (row as { photo_path: string | null; status: string } | null)
    ?.photo_path;
  if (photo && (row as { status: string }).status === "in_progress") {
    await supabase.storage.from(EVALUATION_PHOTO_BUCKET).remove([photo]);
  }
  const { error } = await supabase.rpc("discard_evaluation", {
    p_evaluation_id: id,
  });
  if (error) return evaluationFailure(error);
  return NextResponse.json({ ok: true });
}
