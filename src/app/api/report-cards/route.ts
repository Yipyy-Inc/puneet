import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  facilityContextForClient,
  getFacilityContext,
} from "@/lib/api/facility-context";
import {
  REPORT_CARD_SELECT,
  photoPathsIn,
  rowToReportCard,
  type ReportCardRow,
} from "@/lib/api/mappers/report-card";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newReportCardSchema } from "@/types/report-card";
import type { Json } from "@/types/database";

// ============================================================================
// Report cards.
//
// Scoped entirely by RLS: staff who hold `view_pet_records` see their
// facility's cards, an owner sees their own, and nobody passes a facility id
// for that to hold. The filters below narrow what you asked for; they are not
// what keeps you out. The POST is authorised by `report_cards_insert`, which
// gates on the SERVICE-specific send permission (20260822300000), not by this
// file.
// ============================================================================

export const dynamic = "force-dynamic";

/** An hour: long enough to read a card, short enough that a leaked link dies. */
const PHOTO_URL_TTL_SECONDS = 3600;

/**
 * Sign every photo path in one round trip.
 *
 * The bucket is private, so a path is not something a browser can render.
 * Signing is done HERE rather than in the mapper because only the route has a
 * Supabase client, and per-photo signing would be one network call per picture
 * on a page that shows many.
 *
 * A failure to sign yields no entry, so the photo arrives with `url: null` and
 * the card still renders — a missing picture must not take the day's write-up
 * down with it.
 */
async function signPhotoUrls(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  const unique = [...new Set(paths)];
  const { data, error } = await supabase.storage
    .from("report-card-photos")
    .createSignedUrls(unique, PHOTO_URL_TTL_SECONDS);

  if (error || !data) return urls;

  for (const entry of data) {
    if (entry.signedUrl && entry.path) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

export async function GET(request: NextRequest) {
  // 401 rather than an empty list — an unauthenticated caller getting `[]` is
  // indistinguishable from a facility with no cards.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("report_cards")
    .select(REPORT_CARD_SELECT)
    .order("visit_date", { ascending: false });

  const petRef = searchParams.get("petRef");
  if (petRef) query = query.eq("pets.ref", Number(petRef));

  const status = searchParams.get("status");
  if (status) query = query.eq("delivery_status", status);

  // The owner's portal asks for this. A draft is the facility's working copy
  // and must not appear in it — RLS admits the client to the ROW, because the
  // card is theirs, so "not yet sent" is a filter rather than a policy.
  if (searchParams.get("sentOnly") === "true") {
    query = query.eq("delivery_status", "sent");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ReportCardRow[];
  const signed = await signPhotoUrls(supabase, photoPathsIn(rows));

  return NextResponse.json(rows.map((row) => rowToReportCard(row, signed)));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = newReportCardSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a report card.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const supabase = await createServerClient();

  // The pet arrives as the app's numeric ref; the row needs the uuid. Resolved
  // through RLS, so a caller who cannot see a pet cannot write a card about it
  // — the lookup simply returns nothing.
  //
  // Resolved BEFORE the facility, and it carries the client with it: the card
  // records who it is FOR, and the pet's owner is the only honest source for
  // that.
  const { data: pet } = await supabase
    .from("pets")
    .select("id, client_id")
    .eq("ref", input.petRef)
    .maybeSingle();

  if (!pet) {
    return NextResponse.json(
      { error: `No pet ${input.petRef} you can write a report card for.` },
      { status: 422 },
    );
  }

  // ── WHICH FACILITY, AND WHY IT DEPENDS ON WHO IS ASKING ─────────────────
  //
  // Staff: their membership. A CUSTOMER: the facility of the pet's client row.
  // getFacilityContext() answers the DEMO facility for a caller with no
  // membership (its own header says so), so taking it unconditionally would
  // stamp a card against a business the pet has never visited.
  //
  // A customer cannot in fact create a card — `report_cards_insert` requires a
  // service send permission they do not hold — so this branch exists to make
  // the refusal come from the policy rather than from a wrong-facility write
  // that happens to fail for a different reason.
  //
  // The facility comes from the session or from a PARENT ROW already scoped by
  // RLS, which is what check:facility-from-session allows. Nothing here reads a
  // facility from the request.
  const viewer = await getViewer().catch(() => null);
  const facility =
    viewer && viewer.memberships.length > 0
      ? await getFacilityContext()
      : await facilityContextForClient(pet.client_id);

  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // The booking is optional and, when given, resolved the same way — through
  // RLS, by ref. A ref the caller cannot see attaches nothing rather than
  // refusing the card: a report card is about the day, and the booking is a
  // convenience link.
  let bookingId: string | null = null;
  if (input.bookingRef != null) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("ref", input.bookingRef)
      .maybeSingle();
    bookingId = booking?.id ?? null;
  }

  // `sent_at` is stamped HERE, not taken from the caller. A client that can
  // name its own delivery time can claim one that never happened, which is the
  // failure this whole table exists to end.
  const sentAt =
    input.deliveryStatus === "sent" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("report_cards")
    .insert({
      facility_id: facility.facilityId,
      pet_id: pet.id,
      client_id: pet.client_id,
      booking_id: bookingId,
      service_type: input.serviceType,
      visit_date: input.visitDate,
      theme: input.theme ?? null,
      // Cast, not `any`. The schema deliberately accepts an open bag because
      // the facility's custom questions are per-facility, and `unknown` values
      // do not structurally satisfy Supabase's recursive `Json`. Zod has
      // already parsed this, and the column is jsonb — the cast narrows a type,
      // it does not assert anything about the data.
      input: input.input as Json,
      generated: input.generated as unknown as Json,
      delivery_status: input.deliveryStatus,
      scheduled_for: input.scheduledFor ?? null,
      sent_at: sentAt,
      created_by: user.id,
    })
    // `.select()` so an RLS refusal is distinguishable from a no-op. Without it
    // PostgREST answers 201 for a write that inserted nothing, and the screen
    // would report a card that does not exist — see check:rls-writes.
    .select(REPORT_CARD_SELECT)
    .maybeSingle();

  if (error) {
    // 42501 is the policy refusing, which is a permission answer, not a fault.
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You do not have permission to send a report card for that service."
          : error.message,
      },
      { status: denied ? 403 : 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "That report card was refused." },
      { status: 403 },
    );
  }

  return NextResponse.json(rowToReportCard(data as unknown as ReportCardRow), {
    status: 201,
  });
}
