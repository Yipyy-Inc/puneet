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

  const slices: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    slices.push(ids.slice(i, i + BATCH));
  }

  const presenceRows: PresenceRow[] = [];
  const yipyyGoRows: BookingYipyyGoRow[] = [];

  // ── THE BATCHES NO LONGER WAIT FOR EACH OTHER ───────────────────────────
  //
  // They used to run one after another, and the cost was latency, not work:
  // `booking_presence` averages 132 ms per call and `booking_yipyy_go` 186 ms,
  // so a facility with 2,547 bookings spent ~3.2 seconds doing nothing but
  // waiting — seventeen round trips deep. With the paged main query and a
  // formatter rebuilt per row on top of it, `/api/bookings` answered
  // `canceling statement due to statement timeout` on every call, at any limit
  // above about 200. Measured 2026-09-24.
  //
  // IN WAVES, NOT ALL AT ONCE. Firing all thirty-four queries together would
  // trade a latency problem for a pool one: `max_connections` is 60 and this is
  // not the only thing running. Four batches in flight is eight queries, which
  // turns seventeen sequential trips into five waves and leaves the pool room
  // to breathe.
  const WAVE = 4;
  for (let i = 0; i < slices.length; i += WAVE) {
    const results = await Promise.all(
      slices.slice(i, i + WAVE).map(async (slice) => {
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
        return { presence, yipyyGo };
      }),
    );

    // Every error is still reported, and the FIRST one still wins — a wave
    // that fails must not be mistaken for a facility with no presence rows.
    for (const { presence, yipyyGo } of results) {
      if (presence.error) return { ok: false, error: presence.error.message };
      if (yipyyGo.error) return { ok: false, error: yipyyGo.error.message };
      presenceRows.push(...((presence.data ?? []) as PresenceRow[]));
      yipyyGoRows.push(...((yipyyGo.data ?? []) as BookingYipyyGoRow[]));
    }
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
