import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { sendDueMessages } from "@/lib/messaging/dispatch";

// ============================================================================
// The messaging tick: sending what was queued for later.
//
// ── WHAT IT IS FOR ────────────────────────────────────────────────────────
//
// A rule with a positive `offset_minutes` — "three hours after check-out" —
// writes its message to `message_sends` fully rendered, with `scheduled_for` in
// the future and `status = 'queued'`, and stops. Nothing else in the system
// ever comes back for it. Before this route, such a message sat in the outbox
// for ever and the Automations screen would have shown a rule that had "sent"
// something nobody received.
//
// ── THE SAME SECRET AND THE SAME COMPARISON AS THE CLOVER SWEEP ───────────
//
// `Authorization: Bearer $CRON_SECRET`, compared with `timingSafeEqual`: a
// `===` on a secret leaks its prefix to anybody willing to measure, and this
// endpoint sends mail to a facility's customers in their name.
//
// Without CRON_SECRET set it answers 503 rather than running unauthenticated.
// An open endpoint that emails customers is not a degraded mode — it is a
// spam cannon with somebody else's business on the envelope.
//
// ── IT IS SAFE TO RUN OFTEN, AND SAFE TO RUN TWICE AT ONCE ────────────────
//
// Each message is claimed with a conditional `queued -> sending` update that
// returns the rows it actually changed, so two overlapping ticks cannot both
// take the same row. Running it every few minutes is the intended cadence: the
// delay a facility configures is a floor, not a promise, and a message due at
// 14:00 going out at 14:04 is fine where one going out twice is not.
// ============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;

  const given = Buffer.from(header.replace(/^Bearer\s+/i, "").trim());
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set; the tick will not run unguarded." },
      { status: 503 },
    );
  }
  if (!authorised(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const result = await sendDueMessages();

  // The counts are the point. A tick that reports `sent: 0, skipped: 12` is a
  // suppression list doing its job; one reporting `failed: 12` is an outage,
  // and they must not look the same from outside.
  return NextResponse.json({
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    problems: result.problems.slice(0, 20),
  });
}
