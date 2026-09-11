import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  MEMBERSHIP_SELECT,
  nextBillingOn,
  rowToMembership,
  cyclePrice,
  type MembershipRow,
} from "@/lib/api/mappers/membership";

// ============================================================================
// Who is on which membership plan (customer_memberships, 20260911161036).
//
// The Subscribers tab was `memberships` from `@/data/services-pricing` in
// `useState`; the client file's membership card read the same fixture. GET
// lists the facility's subscriptions (or one client's, `?clientRef=`); POST
// puts a client on a plan at the plan's price and cycle. Writing needs
// edit_clients — the table's write policy. One ACTIVE plan per client is the
// table's own unique index, so a second answers 409.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const clientRef = Number(new URL(request.url).searchParams.get("clientRef"));

  let query = supabase
    .from("customer_memberships")
    .select(MEMBERSHIP_SELECT)
    .match(inFacility(scope))
    .order("created_at", { ascending: false });
  if (Number.isFinite(clientRef) && clientRef > 0) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", clientRef)
      .maybeSingle();
    if (!client) return NextResponse.json([]);
    query = query.eq("client_id", client.id as string);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as MembershipRow[]).map(rowToMembership),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const input = (await request.json().catch(() => null)) as {
    clientRef?: number;
    planId?: string;
    startsOn?: string;
  } | null;
  if (!input?.clientRef || !input.planId) {
    return NextResponse.json(
      { error: "A client and a plan are required." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();

  const [{ data: client }, { data: plan }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, facility_id")
      .eq("ref", input.clientRef)
      .maybeSingle(),
    supabase
      .from("membership_plans")
      .select(
        "id, facility_id, name, billing_cycle, monthly_price, discount_percent, plan",
      )
      .eq("id", input.planId)
      .maybeSingle(),
  ]);
  if (!client || client.facility_id !== facility.facilityId) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }
  if (!plan || plan.facility_id !== facility.facilityId) {
    return NextResponse.json({ error: "No such plan." }, { status: 404 });
  }

  const startsOn =
    input.startsOn && /^\d{4}-\d{2}-\d{2}$/.test(input.startsOn)
      ? input.startsOn
      : new Date().toISOString().slice(0, 10);
  const tail = (plan.plan ?? {}) as {
    credits?: number;
    quarterlyPrice?: number;
    annualPrice?: number;
  };
  const credits = Number(tail.credits ?? 0);
  const { data, error } = await supabase
    .from("customer_memberships")
    .insert({
      facility_id: facility.facilityId,
      client_id: client.id,
      plan_id: plan.id,
      plan_name: plan.name,
      status: "active",
      starts_on: startsOn,
      billing_cycle: plan.billing_cycle,
      price: cyclePrice(
        plan as { billing_cycle: string; monthly_price: number },
        tail,
      ),
      discount_percent: plan.discount_percent,
      next_billing_on: nextBillingOn(startsOn, plan.billing_cycle as string),
      created_by: user.id,
      detail: {
        creditsTotal: credits,
        creditsRemaining: credits,
        autoRenew: true,
        activityLog: [
          {
            id: crypto.randomUUID(),
            type: "created",
            date: new Date().toISOString(),
            description: `Joined ${plan.name}`,
          },
        ],
      },
    } as never)
    .select(MEMBERSHIP_SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this client's membership.",
      duplicate: "This client is already on an active plan.",
    });
  }
  return NextResponse.json(rowToMembership(data as unknown as MembershipRow), {
    status: 201,
  });
}
