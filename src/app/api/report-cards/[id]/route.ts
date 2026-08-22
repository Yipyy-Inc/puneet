import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The owner's four writes.
//
// One route, four actions, because the database models them as four SECURITY
// DEFINER functions rather than as an UPDATE. Postgres has no column-level
// RLS, so a policy permissive enough to let an owner reply to a card is
// permissive enough to let them rewrite the staff notes on it — the functions
// exist precisely so that no such policy has to (20260822300000).
//
// Every one of them refuses a card that is not the caller's, and refuses a
// card that has not been SENT: a draft the facility is still writing is not
// something an owner can rate.
//
// This route therefore does no authorisation of its own, and must not appear
// to. It dispatches and translates the error.
// ============================================================================

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("viewed") }),
  z.object({ action: z.literal("favourite"), favourite: z.boolean() }),
  z.object({ action: z.literal("reply"), message: z.string().min(1) }),
  z.object({
    action: z.literal("rate"),
    stars: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not something you can do to a report card." },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const supabase = await createServerClient();

  const call = async () => {
    switch (body.action) {
      case "viewed":
        return supabase.rpc("mark_report_card_viewed", { p_card_id: id });
      case "favourite":
        return supabase.rpc("set_report_card_favourite", {
          p_card_id: id,
          p_favourite: body.favourite,
        });
      case "reply":
        return supabase.rpc("reply_to_report_card", {
          p_card_id: id,
          p_message: body.message,
        });
      case "rate":
        return supabase.rpc("rate_report_card", {
          p_card_id: id,
          p_stars: body.stars,
          p_comment: body.comment,
        });
    }
  };

  const { data, error } = await call();

  if (error) {
    // 42501 is the function refusing: not your card, not sent yet, or — for a
    // rating — already rated. Deliberately one answer for all of those, because
    // distinguishing them would tell an unauthorised caller which cards exist.
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: denied ? error.message : "That could not be saved." },
      { status: denied ? 403 : 500 },
    );
  }

  return NextResponse.json({ ok: true, card: data });
}
