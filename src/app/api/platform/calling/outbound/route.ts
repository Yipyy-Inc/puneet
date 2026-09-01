import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { isDialable, toE164 } from "@/lib/phone/format";
import { platformTwilio } from "@/lib/twilio/config";

// ============================================================================
// Placing an outbound call from the platform support desk.
//
// ── WHY IT MOVED ──────────────────────────────────────────────────────────
//
// This was `/api/twilio/call`, and `src/proxy.ts` excludes ALL of `api/twilio`
// from auth on the stated grounds that "Twilio signs its own webhooks". This
// route is not a webhook. Nothing signs it, nothing verified it, and it took
// `{ to, from }` from the request body — so any caller on the internet could
// name both legs of a call.
//
// Today that costs nothing, because nothing dials. The day the provider adapter
// lands (Phase 2) it would be an open relay, billed to Yipyy, from a number
// belonging to Yipyy. A route that is one commit away from placing real calls
// is not the place to leave an authentication gap "for now".
//
// It is platform-admin only because its three callers are the platform support
// console — the dialer, the call-log detail and the voicemail row. The roadmap
// put it under /api/facility/ with `calling_make_calls`; that was written on
// the assumption the facility dialer used it, and the facility Calling screen
// has its own local handler that never reaches the network.
//
// ── AND IT NO LONGER INVENTS A CALL ───────────────────────────────────────
//
// It used to return `callSid: "CA" + randomUUID()`, `status: "queued"` and a
// dial URL, which is the shape of a real provider response. Every caller read
// `ok: true` and told somebody the call was being placed. Nothing was.
//
// So it validates, and reports `placed: false` with a reason. The callers say
// what actually happened. When the adapter arrives, `placed` becomes true on
// the path that genuinely queued a call and the screens need no changes.
// ============================================================================

export const dynamic = "force-dynamic";

export interface OutboundCallResult {
  ok: boolean;
  /** Whether a call was genuinely handed to the provider. */
  placed: boolean;
  to?: string;
  from?: string;
  /** Why nothing was placed, when nothing was. */
  reason?: string;
  error?: string;
}

export async function POST(request: Request) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json(
      { ok: false, placed: false, error: "Not signed in." },
      { status: 401 },
    );
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      {
        ok: false,
        placed: false,
        error: "Only a platform administrator may place support calls.",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    to?: unknown;
    from?: unknown;
  } | null;

  const to = toE164(typeof body?.to === "string" ? body.to : "");
  const from = toE164(typeof body?.from === "string" ? body.from : "");

  if (!to || !isDialable(to)) {
    return NextResponse.json(
      {
        ok: false,
        placed: false,
        error: "A valid destination number is required.",
      },
      { status: 400 },
    );
  }
  if (!from || !isDialable(from)) {
    return NextResponse.json(
      {
        ok: false,
        placed: false,
        error: "A valid caller number is required.",
      },
      { status: 400 },
    );
  }

  if (!platformTwilio()) {
    return NextResponse.json(
      {
        ok: false,
        placed: false,
        to,
        from,
        error: "No phone provider is configured on this deployment.",
      } satisfies OutboundCallResult,
      { status: 503 },
    );
  }

  // Configured, and still nothing dials: the provider adapter is Phase 2.
  // `ok: true` says the request was accepted and understood; `placed: false`
  // says what did not happen. Collapsing those into one boolean is how the
  // previous version came to report a call that never existed.
  return NextResponse.json({
    ok: true,
    placed: false,
    to,
    from,
    reason: "Outbound calling is not connected yet, so no call was placed.",
  } satisfies OutboundCallResult);
}
