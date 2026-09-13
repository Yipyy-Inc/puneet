import { NextResponse } from "next/server";

import type { createServerClient } from "@/lib/supabase/server";
import type { YipyyGoPhoto } from "@/lib/api/mappers/yipyy-go";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// What every pre-arrival form route does the same way.
//
// A booking is named by its ref in the URL and resolved through RLS — the
// owner reads their own, staff read their facility's — so the facility, the
// client and the dogs all come from the row, never from the request. The
// functions answer 42501 for "not yours" and 22023 for a form that cannot move
// the way it was asked to; writeFailure() maps only the first, so the routes
// map both here.
// ============================================================================

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

export const YIPYY_GO_PHOTO_BUCKET = "yipyy-go-photos";

export function yipyyGoFailure(error: {
  code?: string;
  message: string;
  hint?: string | null;
}) {
  if (error.code === "42501") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error.code === "22023") {
    return NextResponse.json(
      { error: error.message, ...(error.hint ? { code: error.hint } : {}) },
      { status: 422 },
    );
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}

export function bookingNotFound() {
  return NextResponse.json(
    { error: "That booking does not exist, or is not yours." },
    { status: 404 },
  );
}

export interface ResolvedYipyyGoBooking {
  id: string;
  ref: number;
  facilityId: string;
  clientId: string;
  service: string;
  status: string;
  startAt: string;
  endAt: string;
  totalCost: number;
  tipAmount: number | null;
  /** The facility's time zone, which a booking's day and times are read in. */
  timezone: string;
  pets: { id: string; ref: number; name: string }[];
}

export async function resolveYipyyGoBooking(
  supabase: Supabase,
  refParam: string,
): Promise<ResolvedYipyyGoBooking | null> {
  const ref = Number(refParam);
  if (!Number.isSafeInteger(ref) || ref <= 0) return null;

  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, facility_id, client_id, service, status, start_at, end_at, total_cost, tip_amount, facilities(timezone), booking_pets(pets(id, ref, name))",
    )
    .eq("ref", ref)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    ref: number;
    facility_id: string;
    client_id: string;
    service: string;
    status: string;
    start_at: string;
    end_at: string;
    total_cost: number | string | null;
    tip_amount: number | string | null;
    facilities: { timezone: string | null } | null;
    booking_pets:
      | { pets: { id: string; ref: number; name: string } | null }[]
      | null;
  };

  return {
    id: row.id,
    ref: Number(row.ref),
    facilityId: row.facility_id,
    clientId: row.client_id,
    service: row.service,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    totalCost: Number(row.total_cost ?? 0),
    tipAmount: row.tip_amount === null ? null : Number(row.tip_amount),
    timezone: row.facilities?.timezone ?? DEFAULT_TIMEZONE,
    pets: (row.booking_pets ?? [])
      .flatMap((bp) => (bp.pets ? [bp.pets] : []))
      .map((pet) => ({ id: pet.id, ref: Number(pet.ref), name: pet.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Photos grouped by submission, each with a URL signed for a minute. */
export async function signYipyyGoPhotos(
  supabase: Supabase,
  submissionIds: string[],
): Promise<Map<string, YipyyGoPhoto[]>> {
  const bySubmission = new Map<string, YipyyGoPhoto[]>();
  if (submissionIds.length === 0) return bySubmission;

  const { data: rows } = await supabase
    .from("yipyy_go_photos")
    .select("id, submission_id, kind, item_ref, storage_path")
    .in("submission_id", submissionIds)
    .order("created_at", { ascending: true });
  const photos = (rows ?? []) as {
    id: string;
    submission_id: string;
    kind: string;
    item_ref: string | null;
    storage_path: string;
  }[];
  if (photos.length === 0) return bySubmission;

  const { data: signed } = await supabase.storage
    .from(YIPYY_GO_PHOTO_BUCKET)
    .createSignedUrls(
      photos.map((photo) => photo.storage_path),
      60,
    );
  const urlByPath = new Map(
    (signed ?? []).map((entry) => [entry.path, entry.signedUrl]),
  );

  for (const photo of photos) {
    const list = bySubmission.get(photo.submission_id) ?? [];
    list.push({
      id: photo.id,
      kind:
        photo.kind === "medication" || photo.kind === "question"
          ? photo.kind
          : "belongings",
      itemRef: photo.item_ref,
      url: urlByPath.get(photo.storage_path) ?? "",
    });
    bySubmission.set(photo.submission_id, list);
  }
  return bySubmission;
}
