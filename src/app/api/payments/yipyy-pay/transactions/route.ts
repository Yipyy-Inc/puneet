import { NextResponse, type NextRequest } from "next/server";

import {
  activeAdminFacility,
  getFacilityContext,
} from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";
import { paymentChannel } from "@/lib/payments/channel";

// ============================================================================
// The takings, and the transactions behind them.
//
// ── WHY THIS READS POSTGRES AND NOT CLOVER ────────────────────────────────
//
// The brief asked for a Clover dashboard inside Yipyy and assumed it would call
// Clover's REST API per view. It reads the ledger instead, and the reasons are
// measured rather than preferred:
//
//   Clover does not know what a boarding stay is. "Boarding $3,800 / Daycare
//   $2,200" is a fact about a BOOKING, and so is the customer's name and the
//   pet's. 454 of 458 payment rows carry a booking_id; Clover carries none.
//
//   Clover rate-limits 16 requests/second PER TOKEN with 5 concurrent. That
//   token is the same one `sweep.ts` uses to keep this ledger true. A reporting
//   screen somebody is clicking filters on must never be able to starve the
//   reconciliation it depends on for its own correctness.
//
//   Clover's own documentation says to use the Export API rather than REST for
//   data older than two months.
//
// So: the sweep pulls Clover into the ledger, and the ledger answers questions.
// If the two ever disagree, that is what "Reconcile now" is for, and it is one
// tab away.
//
// ── ONE ROUTE, TWO ANSWERS ────────────────────────────────────────────────
//
// The summary and the first page of rows are always rendered together and the
// summary is a single aggregate query. Two routes would give the tab two
// loading states and two ways to be half-drawn, which is the same reasoning the
// overview route already records.
//
// Paging past the first page asks for rows ONLY (`summary=0`), because the
// totals do not change when you scroll.
// ============================================================================

/** A page. Large enough to fill a screen twice, small enough to stay quick. */
const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * ONE string literal, never a concatenation.
 *
 * supabase-js infers the row type from this at the type level. A template or a
 * join() is just `string` to the compiler and every column silently becomes an
 * error type — the same note the overview route carries, for the same reason.
 */
const SELECT =
  "id, created_at, method, subtotal, tax, tip, grand_total, processor, processor_payment_id, processor_order_id, processor_device_serial, card_brand, card_last4, entry_method, auth_code, refund_of_payment_id, author_name, bookings ( ref, service, clients ( name ), booking_pets ( pets ( name ) ) )";

interface TransactionRow {
  id: string;
  created_at: string;
  method: string | null;
  subtotal: number | string | null;
  tax: number | string | null;
  tip: number | string | null;
  grand_total: number | string | null;
  processor: string | null;
  processor_payment_id: string | null;
  processor_order_id: string | null;
  processor_device_serial: string | null;
  card_brand: string | null;
  card_last4: string | null;
  entry_method: string | null;
  auth_code: string | null;
  refund_of_payment_id: string | null;
  author_name: string | null;
  bookings: {
    ref: number | null;
    service: string | null;
    clients: { name: string | null } | null;
    booking_pets: { pets: { name: string | null } | null }[] | null;
  } | null;
}

function cents(value: number | string | null): number {
  return Math.round(Number(value ?? 0) * 100);
}

/**
 * A window, or the last 30 days.
 *
 * `to` is treated as EXCLUSIVE and the caller sends the start of the day after
 * the one it wants. A half-open window is the only kind that cannot
 * double-count a payment taken at midnight, and the aggregate uses the same
 * bounds so the summary and the rows can never disagree about what is in range.
 */
function windowFrom(params: URLSearchParams): { from: string; to: string } {
  const now = Date.now();
  const rawFrom = params.get("from");
  const rawTo = params.get("to");

  const from =
    rawFrom && !Number.isNaN(Date.parse(rawFrom))
      ? new Date(rawFrom)
      : new Date(now - 30 * 24 * 60 * 60 * 1000);
  const to =
    rawTo && !Number.isNaN(Date.parse(rawTo))
      ? new Date(rawTo)
      : new Date(now + 24 * 60 * 60 * 1000);

  return { from: from.toISOString(), to: to.toISOString() };
}

export async function GET(request: NextRequest) {
  // The facility comes from the SESSION, never the request. One admin can hold
  // two, and a facility id in a query string is a request to read somebody
  // else's takings. `bun run check:facility-from-session` keeps it that way.
  const active = await activeAdminFacility();
  if (active.kind === "none") {
    return NextResponse.json(
      { error: "Only an owner or administrator can see Yipyy Pay." },
      { status: 403 },
    );
  }
  if (active.kind === "ambiguous") {
    return NextResponse.json(
      { error: "Open the facility you mean at its own address." },
      { status: 409 },
    );
  }

  // Reading the takings is reading the money.
  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's payments." },
      { status: 403 },
    );
  }

  const facilityId = active.facility.id;
  const params = request.nextUrl.searchParams;
  const { from, to } = windowFrom(params);
  const supabase = await createServerClient();

  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(params.get("limit") ?? PAGE_SIZE) || PAGE_SIZE),
  );

  // ── The rows ────────────────────────────────────────────────────────────
  let query = supabase
    .from("payments")
    .select(SELECT, { count: "exact" })
    .eq("facility_id", facilityId)
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filters are applied to the ROWS only, never to the summary. The totals
  // describe the period; narrowing the list to refunds should not rewrite the
  // day's takings underneath it.
  const kind = params.get("kind");
  if (kind === "refunds") query = query.lt("grand_total", 0);
  if (kind === "sales") query = query.gt("grand_total", 0);
  if (kind === "clover") query = query.eq("processor", "clover");

  const method = params.get("method");
  if (method) query = query.eq("method", method);

  const service = params.get("service");
  if (service) query = query.eq("bookings.service", service);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Could not read this facility's payments." },
      { status: 502 },
    );
  }

  const transactions = ((data ?? []) as unknown as TransactionRow[]).map(
    (row) => {
      const total = cents(row.grand_total);
      const booking = row.bookings;
      return {
        id: row.id,
        at: row.created_at,
        /** Signed. A refund stays negative all the way to the screen. */
        amountCents: total,
        subtotalCents: cents(row.subtotal),
        taxCents: cents(row.tax),
        tipCents: cents(row.tip),
        method: row.method,
        /** "refunded" covers both a reversal row and a voided original. */
        kind: total < 0 || row.refund_of_payment_id ? "refund" : "sale",
        processor: row.processor,
        cloverPaymentId: row.processor_payment_id,
        cloverOrderId: row.processor_order_id,
        deviceSerial: row.processor_device_serial,
        cardBrand: row.card_brand,
        cardLast4: row.card_last4,
        entryMethod: row.entry_method,
        authCode: row.auth_code,
        takenBy: row.author_name,
        // One rule, in lib/payments/channel.ts, decided from what the
        // PROCESSOR said rather than from our own label for the tender. The
        // map that used to sit here reported 206 hand-recorded card rows as
        // "Online" although none of them ever reached the Ecommerce API.
        channel: paymentChannel(row),
        bookingRef: booking?.ref ?? null,
        service: booking?.service ?? null,
        clientName: booking?.clients?.name ?? null,
        petNames: (booking?.booking_pets ?? [])
          .map((entry) => entry.pets?.name)
          .filter((name): name is string => Boolean(name)),
      };
    },
  );

  // ── The totals ──────────────────────────────────────────────────────────
  //
  // Skipped when paging: scrolling does not change what the period is worth,
  // and re-running the aggregate per page would be the expensive half of a
  // request that did not need it.
  let takings: unknown = null;
  if (params.get("summary") !== "0") {
    const context = await getFacilityContext(facilityId);
    const { data: summary } = await supabase.rpc("facility_takings", {
      p_facility_id: facilityId,
      p_from: from,
      p_to: to,
      // The facility's own day, not UTC. An 8pm payment belongs to the evening
      // it was taken in, and this repo has already lost a night shift to that.
      p_time_zone: context?.timeZone ?? "America/Toronto",
    });
    takings = summary ?? null;
  }

  return NextResponse.json({
    window: { from, to },
    transactions,
    total: count ?? transactions.length,
    offset,
    limit,
    takings,
  });
}
