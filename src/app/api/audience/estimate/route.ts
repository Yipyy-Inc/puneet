import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// "About how many clients does this filter name?"
//
// ── POST, NOT GET ─────────────────────────────────────────────────────────
//
// The filter is a nested json document — too big for a query string, and it
// describes who a facility is about to message. That does not belong in access
// logs, proxy logs or browser history.
//
// ── IT RUNS AS THE CALLER ─────────────────────────────────────────────────
//
// `count_audience` is SECURITY INVOKER, so RLS decides what the person asking
// can see. A manager scoped to one branch gets that branch's number, not the
// whole network's — and the wizard cannot be used to probe how many clients a
// facility has if you are not entitled to know.
// ============================================================================

export const dynamic = "force-dynamic";

export interface EstimateResult {
  /** How many clients match right now. */
  matched: number;
  /** Everyone at this facility, so the screen can show a proportion. */
  total: number;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    audience?: unknown;
  } | null;

  const supabase = await createServerClient();

  const [{ data: matched, error }, { count: total }] = await Promise.all([
    supabase.rpc("count_audience", {
      p_facility_id: context.facilityId,
      p_filters: (body?.audience ?? { filterGroups: [] }) as never,
    }),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", context.facilityId),
  ]);

  if (error) {
    // The compiler RAISES on an unknown field rather than matching everybody,
    // so this is the path a bad filter takes. Pass its own words through: "
    // unknown audience field "mutual_friends"" is far more use to whoever is
    // building the filter than "Bad Request".
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result: EstimateResult = {
    matched: (matched as number | null) ?? 0,
    total: total ?? 0,
  };
  return NextResponse.json(result);
}
