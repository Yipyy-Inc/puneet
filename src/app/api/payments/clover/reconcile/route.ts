import { NextResponse } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { cloverConfig } from "@/lib/clover/config";
import { sweepFacility } from "@/lib/clover/sweep";

// ============================================================================
// "Reconcile now" — the facility asking Clover what Yipyy missed.
//
// ── WHY A BUTTON AND NOT ONLY A SCHEDULE ──────────────────────────────────
//
// Two reasons, and the second is the one that mattered when this was decided.
//
// A person looking at a figure they distrust needs a way to settle it in the
// next thirty seconds, not at the next cron tick. And no webhook can reach a
// laptop, so without this the entire inbound half of the integration is
// unexercisable in local development — which is exactly how a sync path ships
// having never once run outside production.
//
// ── IT REPORTS WHAT IT FOUND, NOT THAT IT RAN ─────────────────────────────
//
// The response carries counts. A toast saying "Reconciled" over a sweep that
// examined nothing is the shape of claim `bun run check:success-claims` exists
// to catch, and a person pressing this twice deserves to see the second press
// find nothing.
// ============================================================================

export const maxDuration = 120;

export async function POST() {
  if (!cloverConfig()) {
    return NextResponse.json(
      { error: "Clover is not configured on this deployment." },
      { status: 503 },
    );
  }

  // The facility comes from the session, never from the request — one admin can
  // hold two, and a facility id in a body is a request to sweep somebody else's
  // merchant. `bun run check:facility-from-session` keeps it that way.
  const resolved = await activeAdminFacility();
  if (resolved.kind === "none") {
    return NextResponse.json(
      { error: "You are not an administrator of a facility." },
      { status: 403 },
    );
  }
  if (resolved.kind === "ambiguous") {
    return NextResponse.json(
      { error: "Open the facility you mean at its own address." },
      { status: 409 },
    );
  }

  // Reading a merchant's payment history is reading the takings.
  const permissions = await myPermissions();
  if (!holds(permissions, "financial_view_amounts")) {
    return NextResponse.json(
      { error: "You cannot see this facility's payments." },
      { status: 403 },
    );
  }

  const result = await sweepFacility(resolved.facility.id);

  return NextResponse.json({
    examined: result.examined,
    reversed: result.reversed,
    recovered: result.recovered,
    unattached: result.unattached,
    drained: result.drained,
    // Reported rather than thrown. A sweep that read four pages and then hit a
    // 429 has still done four pages of good, and saying so beats a 502 that
    // implies none of it happened.
    problem: result.problem,
  });
}
