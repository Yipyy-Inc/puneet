import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  MEMBERSHIP_PLAN_SELECT,
  planToColumns,
  rowToPlan,
  type MembershipPlanRow,
} from "@/lib/api/mappers/membership";
import type { MembershipPlan } from "@/data/services-pricing";

// ============================================================================
// The facility's membership plans (20260911161036).
//
// The Plans tab created, edited, duplicated, activated and deleted plans in
// `useState` over `membershipPlans` from `@/data/services-pricing`. Writes
// need manage_services (the table's policies). The subscriber count is
// counted from `customer_memberships`, never stored.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const [{ data, error }, { data: subs }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select(MEMBERSHIP_PLAN_SELECT)
      .match(inFacility(scope))
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_memberships")
      .select("plan_id, status")
      .match(inFacility(scope))
      .in("status", ["active", "paused"]),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const s of (subs ?? []) as { plan_id: string | null }[]) {
    if (s.plan_id) counts.set(s.plan_id, (counts.get(s.plan_id) ?? 0) + 1);
  }
  return NextResponse.json(
    ((data ?? []) as unknown as MembershipPlanRow[]).map((row) =>
      rowToPlan(row, counts.get(row.id) ?? 0),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const input = (await request
    .json()
    .catch(() => null)) as Partial<MembershipPlan> | null;
  if (!input?.name?.trim()) {
    return NextResponse.json(
      { error: "A plan needs a name." },
      { status: 422 },
    );
  }
  if (
    input.monthlyPrice !== undefined &&
    (!Number.isFinite(input.monthlyPrice) || input.monthlyPrice < 0)
  ) {
    return NextResponse.json(
      { error: "The price must be a number." },
      { status: 422 },
    );
  }

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .insert({
      facility_id: facility.facilityId,
      ...planToColumns(input),
    } as never)
    .select(MEMBERSHIP_PLAN_SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage membership plans at this facility.",
      duplicate: "A plan like that already exists.",
    });
  }
  return NextResponse.json(rowToPlan(data as unknown as MembershipPlanRow, 0), {
    status: 201,
  });
}
