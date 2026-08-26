import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { refundableFor, type RefundablePayment } from "@/lib/clover/refund";

// ============================================================================
// The counter sales that survive a refresh.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// Retail returns were impossible for a reason that was easy to state wrongly.
// It was NOT that a retail sale carries no processor payment id — since
// 2026-08-25 it carries a real one, because `/api/payments/retail/charge`
// writes an ordinary `payments` row. It was that the returns screen could not
// SEE that row: it reads `getAllTransactions()` from `src/data/retail.ts`, a
// module array that dies on refresh. So the sale existed, was reversible, and
// was invisible to the only screen that would ever want to reverse it.
//
// This is the list that closes that gap.
//
// ── WHAT COUNTS AS A COUNTER SALE ─────────────────────────────────────────
//
// A `payments` row with no booking. That is the whole definition and it is the
// same one `/api/payments/retail/charge` writes to: `booking_id` is nullable,
// `open_payment_intent` has always accepted a null booking, and a sale over the
// counter belongs to no stay. Nothing needs a `source` column to distinguish
// them, and adding one would only create a second answer to the same question.
//
// ── REFUNDS ARE NOT SALES, AND NEITHER ARE SETTLED ONES ───────────────────
//
// `grand_total > 0` drops the negative rows — a reversal is not something you
// can return — and each row carries what is still refundable after everything
// already given back, computed the same way the booking route computes it.
// A fully-refunded sale stays in the list with `refundableCents: 0`, because a
// staff member looking for a sale they returned yesterday should find it and
// see that it is done, not find nothing and wonder.
// ============================================================================

export const dynamic = "force-dynamic";

/** A till receipt is not an archive. Enough to find this week's sale. */
const LIMIT = 200;

type SaleRow = Omit<RefundablePayment, "processor_payment_id"> & {
  /** Nullable on the table: a cash sale has nothing at a processor, and so
   *  nothing that can be reversed at Clover. The screen needs to know. */
  processor_payment_id: string | null;
  method: string | null;
  subtotal: number | string;
  tax: number | string;
  tip: number | string;
  card_brand: string | null;
  card_last4: string | null;
  entry_method: string | null;
  author_name: string | null;
  note: string | null;
  created_at: string;
  client_id: string | null;
  // PostgREST returns a to-one embed as an OBJECT, not a single-element array.
  // Reading one as an array is what emptied the daycare board once; typed here
  // so the same mistake cannot be made silently.
  clients: { id: string; ref: number; name: string | null } | null;
};

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // facility-from-request-ok: a GET with no body, scoped to the session's
  // facility. There is nothing here for a caller to name.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  // The caller's own client. `payments_read` requires `financial_view_amounts`,
  // so somebody who may not see money gets an empty till rather than a 403 —
  // the same answer a facility that has sold nothing gets, which is the point:
  // the list must not tell them takings exist.
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, processor_payment_id, grand_total, processor_device_serial, method, subtotal, tax, tip, card_brand, card_last4, entry_method, author_name, note, created_at, client_id, clients(id, ref, name)",
    )
    .eq("facility_id", context.facilityId)
    .is("booking_id", null)
    .gt("grand_total", 0)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json(
      { error: "The till could not be read." },
      { status: 502 },
    );
  }

  const rows = (data ?? []) as unknown as SaleRow[];
  // Only the card sales have anything to reverse; a cash row has no processor
  // balance to compute and would otherwise be reported as refundable money.
  const slices = await refundableFor(
    supabase,
    rows.filter(
      (row): row is SaleRow & { processor_payment_id: string } =>
        row.processor_payment_id !== null,
    ),
  );
  const remainingById = new Map(
    slices.map((slice) => [slice.payment.id, Math.max(0, slice.remaining)]),
  );

  return NextResponse.json({
    sales: rows.map((row) => ({
      paymentId: row.id,
      processorPaymentId: row.processor_payment_id,
      /** Whether Yipyy could put this back on a card at all. False for a cash
       *  or store-credit sale — those are settled in the room, and the return
       *  screen must not offer "original payment" for them. */
      refundableToCard: Boolean(row.processor_payment_id),
      amountCents: Math.round(Number(row.grand_total) * 100),
      subtotalCents: Math.round(Number(row.subtotal) * 100),
      taxCents: Math.round(Number(row.tax) * 100),
      tipCents: Math.round(Number(row.tip) * 100),
      refundableCents: remainingById.get(row.id) ?? 0,
      method: row.method,
      cardBrand: row.card_brand,
      cardLast4: row.card_last4,
      entryMethod: row.entry_method,
      /** Present only on a card-present sale — the till knows it must go back
       *  to the same device, and the screen can say so before anyone tries. */
      onDevice: Boolean(row.processor_device_serial),
      soldBy: row.author_name,
      note: row.note,
      clientId: row.client_id,
      clientRef: row.clients?.ref ?? null,
      clientName: row.clients?.name ?? null,
      createdAt: row.created_at,
    })),
  });
}
