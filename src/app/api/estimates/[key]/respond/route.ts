import { NextResponse, after, type NextRequest } from "next/server";

import { notifyStaff } from "@/lib/notifications/notify-staff";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// A customer views, accepts or declines their own estimate.
//
// One call to `respond_to_estimate` (20260911113556), which checks that the
// estimate is the caller's, still open and not expired, and — for an
// acceptance — that the facility lets customers accept online. It can change
// the status and the history and nothing else; the price is not the
// customer's to touch. This route checks none of that itself.
//
// An acceptance or a decline is news to the facility, so staff who follow
// estimates are notified; a view is not.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { key } = await params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    reason?: string;
  } | null;
  const action = body?.action;
  if (action !== "view" && action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "An estimate is viewed, accepted or declined." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "respond_to_estimate" as never,
    {
      p_estimate_id: key,
      p_action: action,
      p_reason: body?.reason ?? null,
    } as never,
  );
  if (error) {
    const status =
      error.code === "42501" ? 403 : error.code === "22023" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (action !== "view") {
    // The customer's own estimate, which RLS lets them read now it is sent.
    const { data: estimate } = await supabase
      .from("estimates")
      .select("id, facility_id, estimate_number, clients(name)")
      .eq("id", key)
      .maybeSingle();
    const row = estimate as unknown as {
      id: string;
      facility_id: string;
      estimate_number: string;
      clients: { name: string | null } | null;
    } | null;
    if (row) {
      after(() =>
        notifyStaff({
          facilityId: row.facility_id,
          kind: action === "accept" ? "estimate_accepted" : "estimate_declined",
          params: {
            client: row.clients?.name ?? undefined,
            number: row.estimate_number,
          },
          link: "/facility/dashboard/estimates",
          sourceId: row.id,
          dedupeKey: `estimate_${action}:${row.id}`,
          actorProfileId: user.id,
          request,
        }),
      );
    }
  }

  return NextResponse.json(data);
}
