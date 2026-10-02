import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { holds, myPermissions } from "@/lib/auth/permissions";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  chargeDepositShares,
  DEPOSIT_ROW_SELECT,
  planDeposit,
  requestRows,
  type DepositRow,
} from "@/lib/payments/booking-deposit-server";
import { sendDepositLinks } from "@/lib/payments/deposit-links.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// A booking's deposit, from the desk (the booking wizard's Confirm, the
// client's mock, 2026-10-02):
//
//   charge  "Charge Visa •••• 4242" — the client's saved card, once per part
//           the deposit lands on, under keys that refuse a second charge
//   link    "Send payment link" — /pay/{ref}?deposit=1 by email or SMS
//
// The amount is the facility's rule on the whole request, worked out here
// (lib/payments/deposit-shares) — never sent by the screen. Asking for or
// taking money is `financial_take_payment`, as for the pay link and the card.
// ============================================================================

export const dynamic = "force-dynamic";

const inputSchema = z.union([
  z.object({ action: z.literal("charge"), savedCardId: z.uuid() }),
  z.object({ action: z.literal("link"), channel: z.enum(["email", "sms"]) }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 403 });
  }
  if (!holds(await myPermissions(), "financial_take_payment")) {
    return NextResponse.json(
      { error: "Not allowed to take payments at this facility." },
      { status: 403 },
    );
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Charge a saved card, or send a link by email or SMS." },
      { status: 422 },
    );
  }

  const { ref } = await params;
  // The caller's own client: the booking comes back only if they may see it.
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(DEPOSIT_ROW_SELECT)
    .eq("ref", Number(ref))
    .eq("facility_id", context.facilityId)
    .maybeSingle();
  const booking = data as unknown as DepositRow | null;
  if (!booking) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const admin = createAdminClient() as unknown as SupabaseClient;
  const rows = await requestRows(admin, booking);
  const plan = await planDeposit(admin, rows);
  if (plan.shares.length === 0) {
    return NextResponse.json(
      { error: "No deposit is due on this booking." },
      { status: 409 },
    );
  }

  if (parsed.data.action === "link") {
    const result = await sendDepositLinks({
      admin,
      rows,
      plan,
      channel: parsed.data.channel,
      request,
    });
    return NextResponse.json(result);
  }

  const charged = await chargeDepositShares({
    rows,
    plan,
    savedCardId: parsed.data.savedCardId,
    // Staff at the desk, the cardholder not on the screen.
    initiator: "merchant",
    createdBy: user.id,
    authorName: user.email ?? "Staff",
    keyPrefix: "deposit",
  });
  if (!charged.ok) {
    return NextResponse.json(
      {
        error: charged.message,
        code: charged.code,
        chargedCents: charged.chargedCents,
      },
      { status: charged.code === "declined" ? 402 : 409 },
    );
  }
  return NextResponse.json({
    charged: true,
    chargedCents: charged.chargedCents,
    cardLabel: charged.cardLabel,
  });
}
