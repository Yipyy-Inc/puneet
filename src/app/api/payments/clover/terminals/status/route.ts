import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { getFacilityContext } from "@/lib/api/facility-context";
import { deviceState } from "@/lib/clover/terminal";

// ============================================================================
// Is this one terminal awake, right now?
//
// ── WHY IT IS A BUTTON AND NOT A PAGE LOAD ────────────────────────────────
//
// The spec asks for live online/offline status "pulled from the Clover API on
// page load, not cached". It cannot be, and the reason is worth stating rather
// than quietly ignoring: `deviceState()` is a round trip to physical hardware.
// A healthy device answers in about eight seconds; one with Cloud Pay Display
// closed costs Clover's own fifteen-second device timeout before the 504, and
// the measured allowance is forty.
//
// A facility with three terminals would therefore wait up to two minutes for
// the Devices tab to draw, every time they opened it — and would learn nothing
// they could act on, because a device that was awake when the page loaded may
// be asleep by the time they walk to it.
//
// So the tab lists what the merchant owns immediately, and this answers for one
// device when somebody asks. That is slower to look at and faster to use.
//
// ── ONE DEVICE PER REQUEST, DELIBERATELY ──────────────────────────────────
//
// Probing several in one call would put the slowest one in front of the fastest
// and blow the function budget. The screen fires one request per card and each
// resolves on its own.
//
// ── A READ, SO IT IS A POST ONLY BECAUSE IT TAKES A BODY ──────────────────
//
// Nothing is written. The serial goes in a body rather than a query string so
// it does not end up in an access log next to a merchant id.
// ============================================================================

/**
 * Sixty, against the forty-second fetch timeout inside `deviceState`.
 *
 * The margin is for the token refresh and connection lookup that happen first.
 * Matching the two exactly would have a slow refresh kill the request just
 * before the answer arrived.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // From the session. A caller who could name the facility could probe another
  // business's hardware and learn when their counter is staffed.
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    serial?: unknown;
  } | null;
  const serial = typeof body?.serial === "string" ? body.serial.trim() : "";
  if (!serial) {
    return NextResponse.json(
      { error: "Which terminal? A serial is required." },
      { status: 422 },
    );
  }

  // `deviceState` resolves the connection itself and refuses a facility that
  // has none, so a caller naming a serial from another merchant gets
  // "unreachable" rather than an answer about somebody else's device.
  const state = await deviceState(context.facilityId, serial);

  return NextResponse.json({
    serial,
    // "ready" | "busy" | "asleep" | "unreachable" — four states, not a boolean.
    // A terminal that is mid-payment is not offline, and telling a facility it
    // is would send them to unplug a device that is working.
    kind: state.kind,
    detail: state.kind === "ready" ? null : state.detail,
    checkedAt: new Date().toISOString(),
  });
}
