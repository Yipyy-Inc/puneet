import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { cloverConfig } from "@/lib/clover/config";
import { sweepEveryFacility } from "@/lib/clover/sweep";

// ============================================================================
// The scheduled sweep.
//
// ── WHAT IT IS FOR ────────────────────────────────────────────────────────
//
// Clover documents no retry, no ordering and no duplicate policy for webhooks,
// and the receiver answers 200 even when processing fails — deliberately, or
// Clover would redeliver an unprocessable event forever. Those two facts
// together mean a delivery can be lost with nothing anywhere recording that it
// was. This is the second way of finding out.
//
// ── THE SECRET IS COMPARED IN CONSTANT TIME ───────────────────────────────
//
// Vercel sends `Authorization: Bearer $CRON_SECRET`. The comparison is
// `timingSafeEqual` for the same reason the Clover webhook's is: a `===` on a
// secret leaks its prefix to anybody willing to measure, and this endpoint
// reads every facility's takings.
//
// Without CRON_SECRET set this answers 503 rather than running unauthenticated.
// An open endpoint that sweeps every merchant is not a degraded mode.
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
      { error: "CRON_SECRET is not set; the sweep will not run unguarded." },
      { status: 503 },
    );
  }
  if (!authorised(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!cloverConfig()) {
    return NextResponse.json(
      { error: "Clover is not configured on this deployment." },
      { status: 503 },
    );
  }

  const results = await sweepEveryFacility();

  // Totals for a log line somebody will actually read, and the per-facility
  // problems kept separate so one revoked merchant is visible rather than
  // averaged away.
  const totals = results.reduce(
    (sum, result) => ({
      examined: sum.examined + result.examined,
      reversed: sum.reversed + result.reversed,
      recovered: sum.recovered + result.recovered,
      unattached: sum.unattached + result.unattached,
      drained: sum.drained + result.drained,
    }),
    { examined: 0, reversed: 0, recovered: 0, unattached: 0, drained: 0 },
  );

  return NextResponse.json({
    facilities: results.length,
    ...totals,
    problems: results
      .filter((result) => result.problem)
      .map((result) => ({
        facilityId: result.facilityId,
        problem: result.problem,
      })),
  });
}
