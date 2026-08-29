import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The booking page's reviews.
//
// ── THIS AFFECTS ONE PAGE, AND IT IS OURS ─────────────────────────────────
//
// Nothing here changes anything on Google, Facebook or Yelp, and no product
// can. The shipped screen put platform badges next to "Hide" and "Display"
// buttons, which read as a claim it could — while a footnote quietly said the
// toggle only affected the booking page. The buttons now say "Show on booking
// page" and "Remove from booking page", and this route is named for what it
// governs.
//
// ── ELIGIBILITY IS A RULE, NOT A JUDGEMENT ────────────────────────────────
//
// A review may be shown when it has a written comment, a rating at or above the
// facility's `showcaseMin`, and the client's display consent. The shipped
// screen had a "Pending 0" count with no approve action anywhere and no stated
// rule — so nobody could say why a particular review was or was not on the
// booking page.
//
// The threshold is read from the REQUEST row, so a facility that lowers it does
// not retroactively publish reviews collected under the old one without
// somebody choosing to.
// ============================================================================

export const dynamic = "force-dynamic";

const moderationSchema = z.object({
  responseId: z.string().uuid(),
  state: z.enum(["approved", "live", "hidden", "rejected"]),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export async function GET(request: NextRequest) {
  const guard = await authorise();
  if ("response" in guard) return guard.response;
  const { supabase, facilityId, facilitySlug } = guard;

  const state = request.nextUrl.searchParams.get("state");

  let query = supabase
    .from("review_responses")
    .select(
      `id, rating, comment, submitted_at, moderation_state, showcase_sort_order,
       display_consent, approved_at,
       staff:staff(id, first_name, last_name),
       request:review_requests!inner(
         id, showcase_min, service_types,
         client:clients!inner(id, name)
       )`,
    )
    .eq("facility_id", facilityId)
    // A review with no words is not a testimonial. This is the eligibility rule
    // rather than a display preference, so it belongs in the query.
    .not("comment", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (state) query = query.eq("moderation_state", state);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    reviews: data ?? [],
    // The page these are published TO. A screen that says "these appear on
    // your public page" and cannot link to it is asking to be believed.
    publicPath: facilitySlug ? `/${facilitySlug}/reviews` : null,
  });
}

export async function PATCH(request: NextRequest) {
  const guard = await authorise();
  if ("response" in guard) return guard.response;
  const { supabase, userId } = guard;

  const parsed = moderationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "That is not a moderation decision.",
        detail: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const publishing = input.state === "approved" || input.state === "live";

  const { data, error } = await supabase
    .from("review_responses")
    .update({
      moderation_state: input.state,
      showcase_sort_order: input.sortOrder ?? null,
      // `review_responses_approved_says_who` pairs these two, so they are
      // written together or not at all. Un-publishing clears both: "approved by
      // Sam" on a hidden review is a fact about a decision that was reversed.
      approved_at: publishing ? new Date().toISOString() : null,
      approved_by: publishing ? userId : null,
    } as never)
    .eq("id", input.responseId)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "You do not have permission to publish reviews.",
      duplicate: "That review is already in that state.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You do not have permission to publish reviews.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

/**
 * Signed in, permitted, and with a facility.
 *
 * Returns the USER as well, because the caller needs it for `approved_by` and
 * calling `getCurrentUser()` a second time would be a second chance to forget
 * the null check — which is exactly what happened the first time this compiled.
 */
async function authorise(): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createServerClient>>;
      facilityId: string;
      facilitySlug: string;
      userId: string;
    }
  | { response: NextResponse }
> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  if (!holds(await myPermissions(), "marketing_manage_reviews")) {
    return {
      response: NextResponse.json(
        { error: "You do not have permission to publish reviews." },
        { status: 403 },
      ),
    };
  }
  const facility = await getFacilityContext().catch(() => null);
  if (!facility) {
    return {
      response: NextResponse.json(
        { error: "No facility in this session." },
        { status: 403 },
      ),
    };
  }
  return {
    supabase: await createServerClient(),
    facilityId: facility.facilityId,
    facilitySlug: facility.slug,
    userId: user.id,
  };
}
