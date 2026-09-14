import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { rowToBooking } from "@/lib/api/mappers/booking";
import {
  rowToBookingYipyyGo,
  type BookingYipyyGoRow,
} from "@/lib/api/mappers/yipyy-go";

// ============================================================================
// Booking rows as the screens read them: mapped, with where the pet is and
// where its pre-arrival form stands.
//
// Shared by GET /api/bookings and GET /api/bookings/page, which used to be one
// route carrying this merge inline. Two copies would drift on the first change
// to either view.
//
// ── TWO SECOND QUERIES, IN BATCHES ────────────────────────────────────────
//
// `booking_presence` (20260806960000) and `booking_yipyy_go` (20260913133630)
// are views PostgREST cannot embed, so they are read by booking id and merged.
// In batches of 150: `.in()` is a query-string filter, and every id of a large
// facility is a URL PostgREST refuses (caught by booking-presence.spec against
// the e2e tenant's 400+ rows).
// ============================================================================

type PresenceRow = {
  booking_id: string;
  presence: string;
  arrived_at: string | null;
  departed_at: string | null;
};

const BATCH = 150;

export type EnrichResult =
  | { ok: true; bookings: ReturnType<typeof enrichOne>[] }
  | { ok: false; error: string };

function enrichOne(
  booking: ReturnType<typeof rowToBooking>,
  presence: PresenceRow | undefined,
  yipyyGo: ReturnType<typeof rowToBookingYipyyGo> | undefined,
) {
  return {
    ...booking,
    presence: presence?.presence ?? "unknown",
    arrivedAt: presence?.arrived_at ?? null,
    departedAt: presence?.departed_at ?? null,
    yipyyGo,
  };
}

export async function enrichBookingRows(
  supabase: SupabaseClient,
  rows: unknown[],
): Promise<EnrichResult> {
  const ids = (rows as { id: string }[]).map((row) => row.id);

  const presenceRows: PresenceRow[] = [];
  const yipyyGoRows: BookingYipyyGoRow[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const [presence, yipyyGo] = await Promise.all([
      supabase
        .from("booking_presence")
        .select("booking_id, presence, arrived_at, departed_at")
        .in("booking_id", slice),
      supabase
        .from("booking_yipyy_go")
        .select(
          "booking_id, requirement, status, satisfied, pets_total, pets_satisfied",
        )
        .in("booking_id", slice),
    ]);
    if (presence.error) return { ok: false, error: presence.error.message };
    if (yipyyGo.error) return { ok: false, error: yipyyGo.error.message };
    presenceRows.push(...((presence.data ?? []) as PresenceRow[]));
    yipyyGoRows.push(...((yipyyGo.data ?? []) as BookingYipyyGoRow[]));
  }

  const presenceById = new Map(presenceRows.map((r) => [r.booking_id, r]));
  const yipyyGoById = new Map(
    yipyyGoRows.map((r) => [r.booking_id, rowToBookingYipyyGo(r)]),
  );

  return {
    ok: true,
    bookings: (rows as never[]).map((row) => {
      const id = (row as { id: string }).id;
      return enrichOne(
        rowToBooking(row),
        presenceById.get(id),
        yipyyGoById.get(id),
      );
    }),
  };
}
