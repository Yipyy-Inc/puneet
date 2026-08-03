import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  OFFBOARDING_SELECT,
  actorIdsOf,
  rowToOffboardingInstance,
  type InstanceRow,
} from "@/lib/api/mappers/offboarding";
import { resolveActorNames } from "@/lib/api/actor-names";

// ============================================================================
// Offboarding instances — list, and start one.
//
// POST DOES NOT INSERT. It calls public.offboard_staff(), because starting an
// offboarding is three writes that must not half-happen: the record, the
// materialised checklist, and — the one that matters — terminating the staff
// row while deactivating their membership. `is_active = false` is what actually
// revokes access (every access helper filters on it, and the JWT hook stops
// emitting the facility), so doing it from here in separate requests would open
// a window where someone is terminated on the roster and still holding a
// session. See 20260804180000.
//
// There is no DELETE. Offboarding is a record of something that happened; an
// offboarding started by mistake is corrected by reactivating the staff member,
// which is the status-change path, not a delete here.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("offboarding_instances")
    .select(OFFBOARDING_SELECT)
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data as unknown as InstanceRow[];
  const names = await resolveActorNames(supabase, actorIdsOf(rows));
  return NextResponse.json(
    rows.map((row) => rowToOffboardingInstance(row, names)),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    staffId?: string;
    reason?: string;
    templateId?: string;
    lastDay?: string;
  } | null;

  if (!input?.staffId || !input.reason) {
    return NextResponse.json(
      { error: "A staff member and a reason are required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // The RPC takes a template UUID; the UI holds legacy ids. Resolved through a
  // read the caller has to be able to make, so an unreadable template is a
  // missing template rather than an RLS error deeper down.
  let templateUuid: string | undefined;
  if (input.templateId) {
    const { data: template } = await supabase
      .from("offboarding_templates")
      .select("id")
      .eq("legacy_id", input.templateId)
      .maybeSingle();
    templateUuid = template?.id ?? undefined;
  }

  // OMITTED rather than passed as null: both optional arguments have SQL
  // defaults that the function's own resolution depends on — no template means
  // "pick one by reason", no last day means "today". Sending an explicit null
  // says the same thing here, but only by coincidence of how the defaults were
  // written, and the generated Args type declares them optional for a reason.
  const { error: rpcError } = await supabase.rpc("offboard_staff", {
    p_staff_legacy_id: input.staffId,
    p_reason: input.reason,
    ...(templateUuid ? { p_template_id: templateUuid } : {}),
    ...(input.lastDay ? { p_last_day: input.lastDay } : {}),
  });

  if (rpcError) {
    return writeFailure(rpcError, {
      denied: "Not allowed to offboard staff at this facility.",
      duplicate: "That staff member already has an offboarding record.",
    });
  }

  // Read back through the same mapper the list uses, so the client renders the
  // RESPONSE rather than the input it just sent. The checklist, the due dates
  // and the assignees are all computed server-side and none of them are
  // knowable here.
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("legacy_id", input.staffId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("offboarding_instances")
    .select(OFFBOARDING_SELECT)
    .eq("staff_id", staff?.id ?? "")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as unknown as InstanceRow;
  const names = await resolveActorNames(supabase, actorIdsOf([row]));
  return NextResponse.json(rowToOffboardingInstance(row, names), {
    status: 201,
  });
}
