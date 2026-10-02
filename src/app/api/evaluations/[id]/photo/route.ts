import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { MAX_UPLOAD_BYTES, sniffImageContentType } from "@/lib/api/file-type";
import { EVALUATION_PHOTO_BUCKET } from "@/lib/evaluations/detail-server";
import { evaluationFailure } from "@/lib/evaluations/rpc-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// /api/evaluations/[id]/photo — "Add a photo from the evaluation" (the
// client's mock, 2026-10-02). One photo per evaluation; a new one replaces
// the old.
//
// POST    multipart: file. Into the private evaluation-photos bucket at
//         {facility}/{evaluation}/{uuid}-…, both read from the evaluation's
//         own row; the type is sniffed from the bytes. The storage policy
//         lets evaluators attach until the card is sent.
// DELETE  takes it off the evaluation, and removes the file.
// ============================================================================

export const dynamic = "force-dynamic";

const ID = z.string().uuid();

async function readEvaluation(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  id: string,
) {
  const { data } = await supabase
    .from("evaluations")
    .select("id, facility_id, photo_path")
    .eq("id", id)
    .maybeSingle();
  return data as {
    id: string;
    facility_id: string;
    photo_path: string | null;
  } | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!ID.safeParse(id).success || !(file instanceof File)) {
    return NextResponse.json(
      { error: "A photo is required." },
      { status: 422 },
    );
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Photos must be between 1 byte and ${MAX_UPLOAD_BYTES / 1048576} MB.`,
      },
      { status: 413 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffImageContentType(bytes);
  if (!contentType) {
    return NextResponse.json(
      { error: "That is not a photo. Upload a PNG, JPEG or HEIC." },
      { status: 415 },
    );
  }

  const supabase = await createServerClient();
  const evaluation = await readEvaluation(supabase, id);
  if (!evaluation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `${evaluation.facility_id}/${evaluation.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(EVALUATION_PHOTO_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: "This evaluation can no longer take a photo." },
      { status: 403 },
    );
  }

  const { error } = await supabase.rpc("save_evaluation", {
    p_evaluation_id: id,
    p_patch: { photoPath: path },
  });
  if (error) {
    // Not attached, so not kept.
    await supabase.storage.from(EVALUATION_PHOTO_BUCKET).remove([path]);
    return evaluationFailure(error);
  }
  if (evaluation.photo_path) {
    await supabase.storage
      .from(EVALUATION_PHOTO_BUCKET)
      .remove([evaluation.photo_path]);
  }
  const { data: signed } = await supabase.storage
    .from(EVALUATION_PHOTO_BUCKET)
    .createSignedUrl(path, 300);
  return NextResponse.json(
    { path, url: signed?.signedUrl ?? null },
    { status: 201 },
  );
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
  const evaluation = await readEvaluation(supabase, id);
  if (!evaluation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { error } = await supabase.rpc("save_evaluation", {
    p_evaluation_id: id,
    p_patch: { photoPath: null },
  });
  if (error) return evaluationFailure(error);
  if (evaluation.photo_path) {
    await supabase.storage
      .from(EVALUATION_PHOTO_BUCKET)
      .remove([evaluation.photo_path]);
  }
  return NextResponse.json({ ok: true });
}
