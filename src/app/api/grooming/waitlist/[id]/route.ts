import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  WAITLIST_SELECT,
  rowToWaitlistEntry,
  staffLegacyMap,
  type WaitlistRow,
} from "@/lib/api/mappers/grooming-waitlist";

// ============================================================================
// One waitlist entry: move it through the queue.
//
// ADDRESSED BY THE APP ID — `legacy_id` when the row has one, the uuid
// otherwise — the same rule the mapper applies on the way out, so an entry
// created through the POST is addressable immediately.
//
// ── ONLY FOUR FIELDS ARE WRITABLE, AND THEY ARE ALL ONE DECISION ───────────
//
//   status         waiting → offered → confirmed / expired / removed
//   offered_slot   the window being offered, as text for the card
//   offer_window_minutes  how long they get to answer
//
// Not `offered_at`, not `offered_until`, not `anchor_date`: the trigger stamps
// those, and a caller who could set them could decide how long they hold a slot
// that somebody else is also waiting for (20260806100000, Decision 4).
//
// There is no DELETE, here or in the schema. Removal is `status = 'removed'` —
// somebody who asked to be called should still be in the record when they ask
// why nobody called.
// ============================================================================

export const dynamic = "force-dynamic";

const STATUSES = [
  "waiting",
  "offered",
  "confirmed",
  "expired",
  "removed",
] as const;
type WaitlistStatus = (typeof STATUSES)[number];

/** Resolve the app id through a read the caller must be able to make, so an
 *  unreadable entry is a 404 rather than an RLS error further down. */
async function resolveEntry(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  appId: string,
): Promise<string | null> {
  const byLegacy = await supabase
    .from("grooming_waitlist_entries")
    .select("id")
    .eq("legacy_id", appId)
    .maybeSingle();
  if (byLegacy.data) return byLegacy.data.id as string;

  // Guarded: passing a non-uuid to an `eq` on a uuid column is a 400 from
  // PostgREST, not an empty result.
  if (!/^[0-9a-f-]{36}$/i.test(appId)) return null;

  const byId = await supabase
    .from("grooming_waitlist_entries")
    .select("id")
    .eq("id", appId)
    .maybeSingle();
  return (byId.data?.id as string | undefined) ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: appId } = await params;
  const input = (await request.json().catch(() => null)) as {
    status?: string;
    offeredSlot?: string | null;
    offerWindowMinutes?: number;
  } | null;

  if (!input?.status) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }
  if (!STATUSES.includes(input.status as WaitlistStatus)) {
    return NextResponse.json(
      { error: "Unrecognised waitlist status." },
      { status: 422 },
    );
  }
  if (
    input.offerWindowMinutes != null &&
    (!Number.isFinite(input.offerWindowMinutes) ||
      input.offerWindowMinutes <= 0)
  ) {
    return NextResponse.json(
      {
        error: "The confirmation window must be a positive number of minutes.",
      },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const entryId = await resolveEntry(supabase, appId);
  if (!entryId) {
    return NextResponse.json(
      { error: "No such waitlist entry." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("grooming_waitlist_entries")
    .update({
      status: input.status,
      ...(input.offeredSlot !== undefined
        ? { offered_slot: input.offeredSlot }
        : {}),
      ...(input.offerWindowMinutes != null
        ? { offer_window_minutes: Math.round(input.offerWindowMinutes) }
        : {}),
    } as never)
    .eq("id", entryId)
    .select(WAITLIST_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change the waitlist at this facility.",
      duplicate: "That waitlist entry already exists.",
    });
  }

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, legacy_id");

  return NextResponse.json(
    rowToWaitlistEntry(
      data as unknown as WaitlistRow,
      staffLegacyMap(staffRows),
    ),
  );
}
