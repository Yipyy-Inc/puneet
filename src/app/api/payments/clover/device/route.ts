import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityContext } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { cancelOnDevice, openCashDrawer } from "@/lib/clover/print";

// ============================================================================
// Telling the terminal to stop, and opening the drawer beside it.
//
// ── TWO ACTIONS, ONE ROUTE, BECAUSE THEY ARE THE SAME KIND OF THING ───────
//
// Both are commands to a physical device that move no money and record nothing.
// Splitting them would mean two routes with identical auth, identical serial
// validation and identical "never throw at the counter" handling.
//
// ── CANCEL STOPS A PROMPT. IT DOES NOT UNDO A PAYMENT ─────────────────────
//
// If a card was approved in the moment before this arrived, the money has
// moved and cancelling the prompt changes nothing about that. So the response
// says `stopped`, never `cancelled the payment`, and the screen says "Stop
// asking on the terminal".
//
// A payment taken in that race is found by reconciliation, which matches on the
// externalPaymentId the sale carried — see lib/clover/reconcile.ts. Saying
// anything stronger here would be the same class of defect as a screen
// reporting a refund that never happened.
// ============================================================================

export const dynamic = "force-dynamic";

const DeviceAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    deviceSerial: z.string().min(4).max(64),
  }),
  z.object({
    action: z.literal("open-drawer"),
    deviceSerial: z.string().min(4).max(64),
    /** Omitted, Clover opens the first drawer it finds. */
    cashDrawerId: z.string().min(1).max(120).optional(),
    reason: z.string().max(120).optional(),
  }),
]);

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // facility-from-request-ok: the facility comes from the session. The body
  // names a DEVICE, and a device belongs to a merchant — sending a command to
  // one is scoped by the token, which is the facility's.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const parsed = DeviceAction.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name an action and a terminal." },
      { status: 400 },
    );
  }

  // Resolved from the session, not from a facility argument — the same call
  // the terminal route makes. `my_permissions` is scoped by the JWT.
  const permissions = await myPermissions();

  if (parsed.data.action === "cancel") {
    // The same permission as taking the payment: whoever may start a prompt on
    // the terminal may stop one. A separate permission would mean a counter
    // where the person who began a sale cannot end it.
    if (!holds(permissions, "financial_take_payment")) {
      return NextResponse.json(
        { error: "You cannot take payments for this facility." },
        { status: 403 },
      );
    }

    const outcome = await cancelOnDevice(
      context.facilityId,
      parsed.data.deviceSerial,
    );

    return NextResponse.json({
      // `stopped`, not `cancelled`. See the banner: a card approved a moment
      // earlier is still paid, and this word is what stops a screen claiming
      // otherwise.
      stopped: outcome.cancelled,
      detail: outcome.detail ?? null,
      note: "This stops the terminal asking. It does not reverse a payment that was already approved.",
    });
  }

  // ── Opening the drawer ──────────────────────────────────────────────────
  //
  // `open_close_register` — the permission the Daily Register screen already
  // uses. Opening a till is a cash-handling act and belongs with the register,
  // not with card payments.
  if (!holds(permissions, "open_close_register")) {
    return NextResponse.json(
      { error: "You cannot open the register for this facility." },
      { status: 403 },
    );
  }

  const outcome = await openCashDrawer(
    context.facilityId,
    parsed.data.deviceSerial,
    { cashDrawerId: parsed.data.cashDrawerId, reason: parsed.data.reason },
  );

  if (!outcome.opened && outcome.detail === "no drawer") {
    // Not a failure of ours. This terminal has no drawer attached, and the
    // screen should say that rather than offer a retry that cannot work.
    return NextResponse.json(
      {
        opened: false,
        error: "That terminal has no cash drawer attached.",
        code: "no_drawer",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    opened: outcome.opened,
    detail: outcome.detail ?? null,
  });
}
