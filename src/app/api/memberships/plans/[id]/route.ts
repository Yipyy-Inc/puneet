import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  MEMBERSHIP_PLAN_SELECT,
  planToColumns,
  rowToPlan,
  type MembershipPlanRow,
} from "@/lib/api/mappers/membership";
import type { MembershipPlan } from "@/data/services-pricing";

// One membership plan: edit (the whole editor shape — its long tail is
// replaced, as the builder hands back the plan it wants) or delete. Deleting
// a plan leaves its subscribers on their `plan_name`; `plan_id` is ON DELETE
// SET NULL (20260911161036).

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const input = (await request
    .json()
    .catch(() => null)) as Partial<MembershipPlan> | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  if (input.name !== undefined && !input.name.trim()) {
    return NextResponse.json(
      { error: "A plan needs a name." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const columns = planToColumns(input);
  // A toggle sends only `isActive`; it must not wipe the long tail.
  const hasTail = Object.keys(columns.plan).length > 0;
  const { plan, ...rest } = columns;
  const { data, error } = await supabase
    .from("membership_plans")
    .update({ ...rest, ...(hasTail ? { plan } : {}) } as never)
    .eq("id", id)
    .select(MEMBERSHIP_PLAN_SELECT);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage membership plans at this facility.",
      duplicate: "A plan like that already exists.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this membership plan.",
  );
  if (denied) return denied;
  return NextResponse.json(
    rowToPlan((data as unknown as MembershipPlanRow[])[0], 0),
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("membership_plans")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to delete this membership plan.",
      duplicate: "That plan cannot be deleted.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to delete this membership plan.",
  );
  if (denied) return denied;
  return new NextResponse(null, { status: 204 });
}
