import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  MEMBERSHIP_SELECT,
  rowToMembership,
  type MembershipRow,
} from "@/lib/api/mappers/membership";

// ============================================================================
// One subscription: pause, resume or cancel it, or turn auto-renew on or off.
//
// The Subscribers tab and its detail sheet did all three to a row in
// `useState` and toasted. Each is now a status change on the
// `customer_memberships` row, with the event appended to its activity log
// (in `detail`). Resuming while the client already has another ACTIVE plan
// is refused by the table's one-active index — answered as a 409.
//
// A cancellation is END OF CYCLE, which is what the dialog promises: the row
// is `cancelled` at once (so the client can be put on another plan) and
// `ends_on` is the next billing date, until which the perks still apply.
//
// The event's description comes from the screen, in the language of the
// person who did it; the route caps it and falls back to a plain word.
// ============================================================================

export const dynamic = "force-dynamic";

type Action = "pause" | "resume" | "cancel" | "autoRenew";
const ACTIONS: Action[] = ["pause", "resume", "cancel", "autoRenew"];

interface PauseInput {
  mode?: "cycles" | "date" | "manual";
  cycles?: number;
  resumeDate?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const input = (await request.json().catch(() => null)) as {
    action?: Action;
    reason?: string;
    description?: string;
    pause?: PauseInput;
    autoRenew?: boolean;
  } | null;
  if (!input?.action || !ACTIONS.includes(input.action)) {
    return NextResponse.json(
      { error: "Pause, resume, cancel or auto-renew." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("customer_memberships")
    .select("status, detail, plan_name, next_billing_on")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "No such membership." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const detail = { ...((current.detail ?? {}) as Record<string, unknown>) };
  const log = Array.isArray(detail.activityLog)
    ? [...(detail.activityLog as unknown[])]
    : [];
  const reason = input.reason?.trim().slice(0, 500) || undefined;
  const said = (fallback: string) =>
    input.description?.trim().slice(0, 200) || fallback;
  const patch: Record<string, unknown> = {};

  if (input.action === "pause") {
    if (current.status !== "active") {
      return NextResponse.json(
        { error: "Only an active membership can be paused." },
        { status: 409 },
      );
    }
    const pause = input.pause ?? {};
    const mode = ["cycles", "date", "manual"].includes(pause.mode ?? "")
      ? pause.mode
      : "manual";
    if (mode === "date" && !/^d{4}-d{2}-d{2}$/.test(pause.resumeDate ?? "")) {
      return NextResponse.json(
        { error: "Choose the date the membership resumes." },
        { status: 422 },
      );
    }
    patch.status = "paused";
    detail.pauseDetails = {
      mode,
      pausedAt: new Date().toISOString(),
      ...(mode === "cycles"
        ? { cycles: Math.min(12, Math.max(1, Math.round(pause.cycles ?? 1))) }
        : {}),
      ...(mode === "date" ? { resumeDate: pause.resumeDate } : {}),
      ...(reason ? { reason } : {}),
    };
    log.push(event("paused", said("Paused")));
  } else if (input.action === "resume") {
    if (current.status !== "paused") {
      return NextResponse.json(
        { error: "Only a paused membership can be resumed." },
        { status: 409 },
      );
    }
    patch.status = "active";
    delete detail.pauseDetails;
    log.push(event("resumed", said("Resumed")));
  } else if (input.action === "autoRenew") {
    if (typeof input.autoRenew !== "boolean") {
      return NextResponse.json(
        { error: "Say whether it renews." },
        { status: 422 },
      );
    }
    detail.autoRenew = input.autoRenew;
    log.push(
      event(
        "updated",
        said(input.autoRenew ? "Auto-renew on" : "Auto-renew off"),
      ),
    );
  } else {
    if (current.status === "cancelled") {
      return NextResponse.json(
        { error: "That membership is already cancelled." },
        { status: 409 },
      );
    }
    patch.status = "cancelled";
    const cycleEnd = current.next_billing_on as string | null;
    patch.ends_on = cycleEnd && cycleEnd > today ? cycleEnd : today;
    detail.autoRenew = false;
    if (reason) detail.cancelReason = reason;
    log.push(event("cancelled", said("Cancelled")));
  }
  detail.activityLog = log;
  patch.detail = detail;

  const { data, error } = await supabase
    .from("customer_memberships")
    .update(patch as never)
    .eq("id", id)
    .select(MEMBERSHIP_SELECT);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this client's membership.",
      duplicate: "This client is already on another active plan.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this client's membership.",
  );
  if (denied) return denied;
  return NextResponse.json(
    rowToMembership((data as unknown as MembershipRow[])[0]),
  );
}

function event(type: string, description: string) {
  return {
    id: crypto.randomUUID(),
    type,
    date: new Date().toISOString(),
    description,
  };
}
