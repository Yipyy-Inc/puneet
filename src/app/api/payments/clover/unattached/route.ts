import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The payments Clover took that Yipyy could not place.
//
// ── EVERYTHING HERE GOES THROUGH THE CALLER'S OWN SESSION ─────────────────
//
// No admin client. `unattached_payments_read` already asks for
// `financial_view_amounts`, and `attach_unattached_payment` is SECURITY INVOKER
// so `payments_insert` asks for `financial_take_payment` when the row is
// written. Reaching for the service role here would move both decisions out of
// the policies and into this file.
//
// The permission checks below are therefore a courtesy — a sentence instead of
// an empty list — and not the gate. The gate is in Postgres.
//
// ── AND A ZERO-ROW WRITE IS NOT A SUCCESS ─────────────────────────────────
//
// `dismiss_unattached_payment` returns whether anything actually moved,
// because its permission check lives in the UPDATE's predicate and a refused
// UPDATE affects no rows and reports success. A route that ignored the return
// would tell somebody a payment had been set aside while it sat there.
// ============================================================================

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("attach"),
    id: z.string().uuid(),
    // The number staff read off a screen, not the uuid behind it.
    bookingRef: z.number().int().positive().optional(),
    clientId: z.string().uuid().optional(),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("dismiss"),
    id: z.string().uuid(),
    note: z.string().trim().min(3, "Say why this is being set aside."),
  }),
]);

async function facilityAndPermissions() {
  const resolved = await activeAdminFacility();
  if (resolved.kind === "none") {
    return {
      error: NextResponse.json(
        { error: "You are not an administrator of a facility." },
        { status: 403 },
      ),
    };
  }
  if (resolved.kind === "ambiguous") {
    return {
      error: NextResponse.json(
        { error: "Open the facility you mean at its own address." },
        { status: 409 },
      ),
    };
  }
  return { facility: resolved.facility, supabase: await createServerClient() };
}

export async function GET() {
  const resolved = await facilityAndPermissions();
  if ("error" in resolved) return resolved.error;

  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's payments." },
      { status: 403 },
    );
  }

  const { data, error } = await resolved.supabase
    .from("unattached_payments")
    .select(
      "id, processor_payment_id, processor_order_id, processor_device_serial, amount_cents, tip_cents, tax_cents, currency, card_brand, card_last4, entry_method, taken_at, discovered_at",
    )
    .eq("facility_id", resolved.facility.id)
    .eq("status", "unattached")
    .order("taken_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    // Whether the person looking may actually do anything about them. The
    // screen needs it to decide between a queue and a read-only list, and
    // guessing from the role would be a second answer to a question the
    // permission map already answers.
    canAttach: holds(permissions, "financial_take_payment"),
    payments: (data ?? []).map((row) => ({
      id: row.id,
      processorPaymentId: row.processor_payment_id,
      processorOrderId: row.processor_order_id,
      deviceSerial: row.processor_device_serial,
      amountCents: row.amount_cents,
      tipCents: row.tip_cents,
      taxCents: row.tax_cents,
      currency: row.currency,
      cardBrand: row.card_brand,
      cardLast4: row.card_last4,
      entryMethod: row.entry_method,
      takenAt: row.taken_at,
      discoveredAt: row.discovered_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const resolved = await facilityAndPermissions();
  if ("error" in resolved) return resolved.error;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the request." },
      { status: 422 },
    );
  }

  if (parsed.data.action === "dismiss") {
    const { data, error } = await resolved.supabase.rpc(
      "dismiss_unattached_payment",
      { p_id: parsed.data.id, p_note: parsed.data.note },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    // FALSE means the UPDATE matched nothing — the permission check is in the
    // predicate, so this is what a refusal looks like.
    if (data !== true) {
      return NextResponse.json(
        {
          error:
            "That payment was not set aside — either somebody else dealt with it first, or you cannot take payments at this facility.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ dismissed: true });
  }

  if (!parsed.data.bookingRef && !parsed.data.clientId) {
    return NextResponse.json(
      { error: "Say which booking or which client this belongs to." },
      { status: 422 },
    );
  }

  const { data, error } = await resolved.supabase.rpc(
    "attach_unattached_payment",
    {
      p_id: parsed.data.id,
      p_booking_ref: parsed.data.bookingRef,
      p_client_id: parsed.data.clientId,
      p_note: parsed.data.note,
    },
  );

  if (error) {
    // 42501 is the policy refusing the ledger row: the caller may look at the
    // queue and may not write to `payments`. Said as itself rather than as a
    // 500, which would read as a bug in Yipyy.
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 422 },
    );
  }

  return NextResponse.json({ paymentId: data });
}
