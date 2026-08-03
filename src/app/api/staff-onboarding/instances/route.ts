import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  mintOnboardingToken,
  toByteaLiteral,
} from "@/lib/api/onboarding-token";
import { INSTANCE_SELECT, rowToInstance } from "@/lib/api/mappers/instance";

// ============================================================================
// Onboarding instances — the manager's side.
//
// The hire's side is not here at all: /onboard/[token] goes through the
// SECURITY DEFINER RPCs (20260803180000), because an unauthenticated
// token-bearer must never be given a policy predicate they can vary.
//
// THE TOKEN IS RETURNED EXACTLY ONCE, by POST and by the resend endpoint, and
// only in the response body. It is never stored, never logged, and cannot be
// read back — GET returns instances without it, because there is nothing to
// return. A manager who loses the link resends and gets a new one, which is the
// correct behaviour for a bearer credential and the reason regenerate exists.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("onboarding_instances")
    .select(INSTANCE_SELECT)
    .order("invited_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data.map(rowToInstance));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as {
    staffId?: string;
    templateId?: string;
  };
  if (!input.staffId) {
    return NextResponse.json(
      { error: "A staff member is required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // Resolve through a READ the caller has to be able to make: an unreadable
  // staff member is a 404 here rather than an RLS error further down that says
  // less about what went wrong.
  const { data: staff } = await supabase
    .from("staff")
    .select("id, facility_id")
    .eq("legacy_id", input.staffId)
    .maybeSingle();

  if (!staff) {
    return NextResponse.json(
      { error: "That staff member does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data: template } = input.templateId
    ? await supabase
        .from("onboarding_templates")
        .select("id, invite_expiry_days")
        .eq("legacy_id", input.templateId)
        .maybeSingle()
    : { data: null };

  const { data: config } = await supabase
    .from("staff_hr_config")
    .select("invite_expiry_days")
    .eq("facility_id", staff.facility_id)
    .maybeSingle();

  const expiryDays =
    template?.invite_expiry_days ?? config?.invite_expiry_days ?? 7;
  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { token, hash } = mintOnboardingToken();

  const { data: created, error } = await supabase
    .from("onboarding_instances")
    .insert({
      staff_id: staff.id,
      // Derived by trigger from the staff row; sent so the NOT NULL is
      // satisfied before the trigger overwrites it with the same answer.
      facility_id: staff.facility_id,
      template_id: template?.id ?? null,
      token_hash: toByteaLiteral(hash),
      token_expires_at: expiresAt,
    } as never)
    .select(INSTANCE_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to invite staff at this facility.",
      duplicate: "That staff member already has an onboarding invitation.",
    });
  }

  // `token` here and nowhere else, ever again.
  return NextResponse.json(
    { instance: rowToInstance(created), token },
    { status: 201 },
  );
}
