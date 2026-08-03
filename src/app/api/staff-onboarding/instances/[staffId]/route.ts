import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  mintOnboardingToken,
  toByteaLiteral,
} from "@/lib/api/onboarding-token";
import { INSTANCE_SELECT, rowToInstance } from "@/lib/api/mappers/instance";

// ============================================================================
// One instance, by the staff member's app-facing id.
//
// The manager's three verbs, and nothing the hire can reach:
//
//   PATCH  { action: "review" }          reviewActivate
//          { action: "resend" }          regenerateOnboardingToken (new token)
//          { action: "request-change" }  requestOnboardingChangeByTask
//          { action: "resolve-change" }  resolveOnboardingChange
//
// Modelled as actions rather than a field PATCH because these are not edits to
// a record, they are transitions with different permission answers, and a body
// of `{ reviewedAt: "..." }` invites a caller to try setting it directly. The
// database refuses that either way (the clamp in 20260803180000), but an API
// that offers a field it will silently revert is an API that lies.
// ============================================================================

export const dynamic = "force-dynamic";

type Action =
  | { action: "review" }
  | { action: "resend" }
  | {
      action: "request-change";
      taskId?: string;
      sectionType: string;
      note: string;
    }
  | { action: "resolve-change"; sectionType: string; taskId?: string };

async function findInstance(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  staffId: string,
): Promise<{ id: string; facility_id: string; staff_id: string } | null> {
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("legacy_id", staffId)
    .maybeSingle();
  if (!staff) return null;

  const { data } = await supabase
    .from("onboarding_instances")
    .select("id, facility_id, staff_id")
    .eq("staff_id", staff.id)
    .maybeSingle();
  return data ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { staffId } = await params;
  const supabase = await createServerClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("legacy_id", staffId)
    .maybeSingle();
  if (!staff) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data } = await supabase
    .from("onboarding_instances")
    .select(INSTANCE_SELECT)
    .eq("staff_id", staff.id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json(rowToInstance(data));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { staffId } = await params;
  const body = (await request.json()) as Action;
  const supabase = await createServerClient();

  const instance = await findInstance(supabase, staffId);
  if (!instance) {
    // Unreadable and absent are the same answer: confirming that an invitation
    // EXISTS for someone you may not see is itself a disclosure.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  switch (body.action) {
    case "review": {
      // Activating is a manager's act; the database checks manage_staff, this
      // just asks for it. Sections are marked complete alongside, mirroring
      // reviewActivate — a reviewed instance with half-done sections would
      // read as unfinished forever.
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("onboarding_instances")
        .update({ reviewed_at: now } as never)
        .eq("id", instance.id);
      if (error) {
        return writeFailure(error, {
          denied: "Not allowed to activate this account.",
          duplicate: "",
        });
      }
      await supabase
        .from("onboarding_sections")
        .update({ status: "complete", completed_at: now } as never)
        .eq("instance_id", instance.id)
        .neq("status", "complete");
      break;
    }

    case "resend": {
      // A NEW token, which invalidates the old link — that is what resending
      // means. The old hash is overwritten, so a leaked previous link dies here.
      const { token, hash } = mintOnboardingToken();
      const { data: config } = await supabase
        .from("staff_hr_config")
        .select("invite_expiry_days")
        .eq("facility_id", instance.facility_id)
        .maybeSingle();
      const days = config?.invite_expiry_days ?? 7;

      const { error } = await supabase
        .from("onboarding_instances")
        .update({
          token_hash: toByteaLiteral(hash),
          token_expires_at: new Date(
            Date.now() + days * 24 * 60 * 60 * 1000,
          ).toISOString(),
          expiry_notified_at: null,
        } as never)
        .eq("id", instance.id);
      if (error) {
        return writeFailure(error, {
          denied: "Only a manager can reissue an onboarding link.",
          duplicate: "",
        });
      }
      // Returned once. See the note in ../route.ts.
      return NextResponse.json({ token });
    }

    case "request-change": {
      if (!body.note?.trim()) {
        return NextResponse.json(
          { error: "A note is required." },
          { status: 422 },
        );
      }
      const { error } = await supabase
        .from("onboarding_change_requests")
        .insert({
          instance_id: instance.id,
          facility_id: instance.facility_id,
          task_key: body.taskId ?? null,
          section_type: body.sectionType,
          note: body.note,
        } as never);
      if (error) {
        return writeFailure(error, {
          denied: "Not allowed to request changes here.",
          duplicate: "",
        });
      }
      // Reopen the flagged section and hand the hire back their link: clearing
      // submitted_at is what makes the token work again (the RPC refuses a
      // submitted instance), which is the whole point of asking for a fix.
      if (body.taskId) {
        await supabase
          .from("onboarding_sections")
          .update({ status: "in_progress", completed_at: null } as never)
          .eq("instance_id", instance.id)
          .eq("task_key", body.taskId);
      }
      await supabase
        .from("onboarding_instances")
        .update({ submitted_at: null } as never)
        .eq("id", instance.id);
      break;
    }

    case "resolve-change": {
      const query = supabase
        .from("onboarding_change_requests")
        .update({ resolved_at: new Date().toISOString() } as never)
        .eq("instance_id", instance.id)
        .eq("section_type", body.sectionType)
        .is("resolved_at", null);
      const { error } = body.taskId
        ? await query.eq("task_key", body.taskId)
        : await query;
      if (error) {
        return writeFailure(error, {
          denied: "Only a manager can resolve a change request.",
          duplicate: "",
        });
      }
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: full } = await supabase
    .from("onboarding_instances")
    .select(INSTANCE_SELECT)
    .eq("id", instance.id)
    .single();

  // From the STORED row: the clamp may have reverted something, and a response
  // repeating the request would show a manager a review that did not happen.
  return NextResponse.json(rowToInstance(full!));
}
