import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// GET /api/admin/facilities-at-risk — active facilities whose booking volume
// has fallen, counted.
//
// The dashboard said "Bookings at 43% of last month" and "No admin login in
// 21 days" from `stableInt(...)`, a hash of the facility's id. Both read as
// measurements and neither was one; the rows also linked to fixture numeric
// ids, so the link went nowhere.
//
// This compares the last 28 days with the 28 before them
// (platform_facility_volume, 20260919203825). A facility that has never taken
// a booking is not "at risk" — it has not started — so only one that HAD
// volume and lost it appears.
// ============================================================================

export const dynamic = "force-dynamic";

const DAYS = 28;

export interface AtRiskFacility {
  facilityId: string;
  facilityName: string;
  madeThisPeriod: number;
  madeLastPeriod: number;
  /** This period as a percentage of the one before. */
  percentOfLast: number;
  severity: "critical" | "warning";
}

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only Yipyy's team may read this." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: Array<{
      facility_id: string;
      made_this_period: number;
      made_last_period: number;
    }> | null;
    error: { message: string } | null;
  }>;

  const [{ data: volume, error }, { data: facilities }] = await Promise.all([
    rpc("platform_facility_volume", { p_days: DAYS }),
    supabase
      .from("facilities")
      .select("id, name, facility_subscriptions ( status )"),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const named = new Map(
    (
      (facilities ?? []) as unknown as Array<{
        id: string;
        name: string;
        facility_subscriptions: { status: string | null } | null;
      }>
    )
      // A facility with no subscription row counts as active, the way
      // has_permission reads it.
      .filter((f) => {
        const status = f.facility_subscriptions?.status ?? "active";
        return status !== "suspended" && status !== "cancelled";
      })
      .map((f) => [f.id, f.name]),
  );

  const rows: AtRiskFacility[] = [];
  for (const row of volume ?? []) {
    const name = named.get(row.facility_id);
    if (!name) continue;
    const last = Number(row.made_last_period ?? 0);
    const now = Number(row.made_this_period ?? 0);
    // Never had any: not a fall, a start that has not happened.
    if (last === 0) continue;
    const percent = Math.round((now / last) * 100);
    if (percent >= 50) continue;
    rows.push({
      facilityId: row.facility_id,
      facilityName: name,
      madeThisPeriod: now,
      madeLastPeriod: last,
      percentOfLast: percent,
      severity: now === 0 ? "critical" : "warning",
    });
  }
  rows.sort((a, b) => a.percentOfLast - b.percentOfLast);
  return NextResponse.json(rows.slice(0, 6));
}
