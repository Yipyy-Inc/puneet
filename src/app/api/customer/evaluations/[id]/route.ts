import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { OwnerCard } from "@/lib/evaluations/owner-card-types";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/customer/evaluations/[id] — the owner's evaluation report card
// (the client's mock, 2026-10-02). Through the owner's own session and
// public.evaluation_card_for_owner(), which answers only for a SENT card of
// their own pet and leaves out everything staff kept to themselves. Reading
// it marks it opened — "Opened" on the facility's list.
//
// The photo is signed by the same session: the storage policy lets an owner
// read that one file once the card has gone out with it.
// ============================================================================

export const dynamic = "force-dynamic";

const BUCKET = "evaluation-photos";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("evaluation_card_for_owner", {
    p_evaluation_id: id,
  });
  const card = data as
    | (Omit<OwnerCard, "photoUrl"> & {
        hasPhoto?: boolean;
        photoPath?: string | null;
      })
    | null;
  if (!card) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { photoPath, hasPhoto, ...rest } = card;
  const photoUrl =
    hasPhoto && photoPath
      ? ((await supabase.storage.from(BUCKET).createSignedUrl(photoPath, 300))
          .data?.signedUrl ?? null)
      : null;

  // Best effort: a card that could not be marked is still the owner's card.
  if (!card.openedAt) {
    await supabase.rpc("mark_evaluation_card_opened", { p_evaluation_id: id });
  }
  return NextResponse.json({ ...rest, photoUrl } satisfies OwnerCard);
}
