import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import {
  toSwapRequest,
  type SwapRequest,
  type SwapRow,
} from "@/lib/api/mappers/scheduling";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Shift swaps.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// src/lib/shift-swaps-store.ts — localStorage plus a BroadcastChannel. Its
// `decideShiftSwap` marked the REQUEST approved and never touched either shift,
// then the screen said "Both employees have been notified."
//
// So the roster still had both people exactly where they started, while two of
// them believed they had traded a Saturday. A swap that does not swap is worse
// than no swap feature at all.
//
// ── APPROVING GOES THROUGH THE DATABASE FUNCTION, NOT THROUGH HERE ────────
//
// `approve_shift_swap` moves both shifts and marks the request in ONE
// transaction. Doing it here would be three round trips that can stop after the
// second, leaving both shifts unassigned — a worse rota than the one the swap
// was meant to fix.
//
// It also lets the phase-1 exclusion constraint do its job: if the trade would
// put somebody in two places at once, everything rolls back and the request
// stays pending. There is no approved-but-not-applied state to explain.
// ============================================================================

export const dynamic = "force-dynamic";

// Five TO-ONE embeds. Every one arrives as an object, not a one-element array.
const SELECT =
  "id, requesting_shift_id, requesting_staff_id, target_staff_id, " +
  "target_shift_id, reason, status, requested_at, reviewed_by, reviewed_at, " +
  "review_notes, " +
  "requester:staff!requesting_staff_id(first_name, last_name), " +
  "target:staff!target_staff_id(first_name, last_name), " +
  "reviewer:profiles!reviewed_by(full_name), " +
  "requesting_shift:staff_shifts!requesting_shift_id(starts_at, ends_at), " +
  "target_shift:staff_shifts!target_shift_id(starts_at, ends_at)";

const STATUSES = ["pending", "approved", "denied", "cancelled"] as const;

export interface SwapsPayload {
  swaps: SwapRequest[];
  /** False when the caller may only see swaps they are part of. */
  canDecide: boolean;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  // Narrowed against the enum rather than passed through: an unrecognised
  // status would otherwise reach PostgREST as a filter on a value the column
  // cannot hold, and come back as a 500 rather than an empty list.
  const asked = new URL(request.url).searchParams.get("status");
  const status = STATUSES.find((s) => s === asked);

  const supabase = await createServerClient();
  let query = supabase
    .from("shift_swap_requests")
    .select(SELECT)
    .order("requested_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const [{ data, error }, permissions] = await Promise.all([
    query,
    supabase.rpc("my_permissions"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    swaps: (data as unknown as SwapRow[]).map((row) =>
      toSwapRequest(row, context.timeZone),
    ),
    // The scope, not the presence of the key — `my_permissions()` returns a row
    // for every permission in the catalogue, `none` included.
    canDecide: (
      (permissions.data ?? []) as { permission_key: string; scope: string }[]
    ).some(
      (entry) =>
        entry.permission_key === "scheduling_approve_swaps" &&
        entry.scope !== "none",
    ),
  } satisfies SwapsPayload);
}

interface SwapInput {
  requestingShiftId?: string;
  /** Omitted means "me" — resolved from the membership, not sent by a client. */
  requestingStaffId?: string;
  targetStaffId?: string;
  /** Omitted is a HAND-OFF: give the shift up rather than trade for one. */
  targetShiftId?: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as SwapInput;

  if (!input.requestingShiftId || !input.targetStaffId) {
    return NextResponse.json(
      {
        error:
          "A swap needs the shift you are offering and who you are asking.",
      },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  let requestingStaffId = input.requestingStaffId;
  if (!requestingStaffId) {
    const membership = viewer.memberships.find(
      (m) => m.facilityId === context.facilityId,
    );
    if (membership) {
      const { data } = await supabase
        .from("staff")
        .select("id")
        .eq("membership_id", membership.membershipId)
        .maybeSingle();
      requestingStaffId = (data as { id: string } | null)?.id;
    }
  }

  if (!requestingStaffId) {
    return NextResponse.json(
      {
        error:
          "You are not on this facility's staff, so you have no shift to offer.",
      },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("shift_swap_requests")
    .insert({
      facility_id: context.facilityId,
      requesting_shift_id: input.requestingShiftId,
      requesting_staff_id: requestingStaffId,
      target_staff_id: input.targetStaffId,
      target_shift_id: input.targetShiftId ?? null,
      reason: input.reason ?? "",
    } as never)
    .select(SELECT)
    .maybeSingle();

  if (error) {
    // 23514 is the shape guard: the shift is not yours, or the one you asked
    // for is not theirs. Its message is already the sentence to show.
    if (error.code === "23514" || error.code === "P0002") {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return writeFailure(error, {
      duplicate: "There is already an open request to give that shift away.",
      denied: "You do not have permission to request a swap.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to request a swap." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    toSwapRequest(data as unknown as SwapRow, context.timeZone),
    { status: 201 },
  );
}

interface DecisionInput {
  id?: string;
  status?: "approved" | "denied" | "cancelled";
  notes?: string;
}

export interface SwapDecision extends SwapRequest {
  /** Which shifts moved, and who holds them now. Only present on approval. */
  moved?: { shiftId: string; nowAssignedTo: string | null }[];
}

/**
 * Approve, deny, or withdraw.
 *
 * Approval is the RPC, because it has to move the shifts in the same
 * transaction. Denying and withdrawing are ordinary RLS-governed updates —
 * there is nothing else to change, so there is nothing to keep consistent.
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as DecisionInput;

  if (
    !input.id ||
    !input.status ||
    !["approved", "denied", "cancelled"].includes(input.status)
  ) {
    return NextResponse.json(
      { error: "An `id` and a `status` of approved, denied or cancelled." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  if (input.status === "approved") {
    const { data: moved, error } = await supabase.rpc("approve_shift_swap", {
      p_request_id: input.id,
      p_notes: input.notes ?? undefined,
    });

    if (error) {
      // 23P01 is the phase-1 exclusion constraint: the trade would put somebody
      // in two places at once. The whole function rolled back, so the request
      // is still pending and both shifts are where they were.
      if (error.code === "23P01") {
        return NextResponse.json(
          {
            error:
              "That trade would put somebody on two shifts at once. Nothing was changed.",
          },
          { status: 409 },
        );
      }
      if (error.code === "22023") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.code === "P0002") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return writeFailure(error, {
        duplicate: "That swap could not be approved.",
        denied: "You do not have permission to approve shift swaps.",
      });
    }

    const { data } = await supabase
      .from("shift_swap_requests")
      .select(SELECT)
      .eq("id", input.id)
      .maybeSingle();

    const decision = toSwapRequest(
      data as unknown as SwapRow,
      context.timeZone,
    ) as SwapDecision;

    decision.moved = (
      (moved ?? []) as { moved_shift_id: string; now_assigned: string | null }[]
    ).map((row) => ({
      shiftId: row.moved_shift_id,
      nowAssignedTo: row.now_assigned,
    }));

    return NextResponse.json(decision);
  }

  const { data, error } = await supabase
    .from("shift_swap_requests")
    .update({
      status: input.status,
      review_notes: input.notes ?? null,
    } as never)
    .eq("id", input.id)
    .select(SELECT);

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return writeFailure(error, {
      duplicate: "That swap could not be updated.",
      denied: "You do not have permission to decide this request.",
    });
  }

  // 0 rows and no error is an RLS refusal, not a success — see check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "No request you can decide with that id.",
  );
  if (refused) return refused;

  return NextResponse.json(
    toSwapRequest((data as unknown as SwapRow[])[0], context.timeZone),
  );
}

/**
 * Remove a request outright.
 *
 * Removing an APPROVED swap does not put the shifts back — the trade already
 * happened and the roster is the record of it. This deletes the paperwork, not
 * the decision, which is why RLS restricts it to whoever may approve.
 */
export async function DELETE(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "`id` is required." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That request could not be removed.",
      denied: "You do not have permission to remove swap requests.",
    });
  }

  const refused = deniedIfUntouched(
    data,
    "No request you can remove with that id.",
  );
  if (refused) return refused;

  return NextResponse.json({ removed: id });
}
