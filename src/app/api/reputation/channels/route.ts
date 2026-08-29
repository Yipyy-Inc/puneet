import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Where a happy client is sent.
//
// ── YELP CANNOT BE MADE SOLICITABLE HERE, OR ANYWHERE ─────────────────────
//
// `review_channels_yelp_is_never_solicitable` refuses the row. Yelp's content
// guidelines prohibit asking for reviews at all, so it is a fact about the
// platform rather than a facility's choice — and putting the refusal in the
// table means the send path reads a column rather than trusting a screen to
// have remembered.
//
// This route does not special-case it. A caller who tries gets the constraint
// violation translated into a sentence, which is the right amount of code.
//
// ── THE PLACE ID IS THE DURABLE HANDLE ────────────────────────────────────
//
// A pasted `g.page/r/…` short link rots when a business profile changes, and
// the shipped "Optimize link" button had nothing durable to optimise against.
// `place_id` is extracted where one can be found; the pasted URL survives only
// as a display fallback, and `record_review_click` prefers the place id when
// building the write-review deep link.
// ============================================================================

export const dynamic = "force-dynamic";

const channelSchema = z.object({
  platform: z.enum(["google", "facebook", "yelp", "nextdoor", "tripadvisor"]),
  profileUrl: z.string().url().max(2000).optional().or(z.literal("")),
  placeId: z.string().max(200).optional().or(z.literal("")),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  weight: z.number().int().min(0).max(100).optional(),
  locationId: z.string().uuid().optional(),
});

/**
 * A Google Maps URL, reduced to the place id it contains.
 *
 * Returns null when there is not one, which is the common case for a pasted
 * `maps.app.goo.gl` short link — those resolve server-side at Google and this
 * route deliberately does not follow redirects to find out. The profile URL is
 * kept either way; a place id is an upgrade, not a requirement.
 */
function extractPlaceId(url: string): string | null {
  const patterns = [
    /[?&]place_?id=([A-Za-z0-9_-]+)/i,
    /\/place\/([A-Za-z0-9_-]{20,})/,
    /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function GET() {
  const guard = await authorise();
  if ("response" in guard) return guard.response;

  const { supabase, facilityId } = guard;
  const { data, error } = await supabase
    .from("review_channels")
    .select(
      "id, platform, place_id, profile_url, enabled, solicitable, priority, weight, public_rating, public_review_count, rating_source, rating_confirmed_at, location_id",
    )
    .eq("facility_id", facilityId)
    .order("priority", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channels: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await authorise();
  if ("response" in guard) return guard.response;
  const { supabase, facilityId } = guard;

  const parsed = channelSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a channel.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const url = input.profileUrl?.trim() || null;

  const { data, error } = await supabase
    .from("review_channels")
    .upsert(
      {
        facility_id: facilityId,
        location_id: input.locationId ?? null,
        platform: input.platform,
        profile_url: url,
        place_id: input.placeId?.trim() || (url ? extractPlaceId(url) : null),
        enabled: input.enabled ?? false,
        // Yelp arrives with this false or the CHECK refuses the row. Sending
        // the platform's own answer rather than the caller's is the point.
        solicitable: input.platform !== "yelp",
        priority: input.priority ?? 0,
        weight: input.weight ?? 0,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "facility_id,location_id,platform" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      denied: "You do not have permission to change review channels.",
      duplicate: "That channel is already set up.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "That channel was refused." },
      { status: 403 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const guard = await authorise();
  if ("response" in guard) return guard.response;
  const { supabase, facilityId } = guard;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which channel?" }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("review_channels")
    .delete()
    .eq("id", id)
    .eq("facility_id", facilityId)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "You do not have permission to change review channels.",
      duplicate: "That channel could not be removed.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You do not have permission to change review channels.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

/** Signed in, permitted, and with a facility — or the refusal to return. */
async function authorise(): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createServerClient>>;
      facilityId: string;
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
        { error: "You do not have permission to change review channels." },
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
  };
}
