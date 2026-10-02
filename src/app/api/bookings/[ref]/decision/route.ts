import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getViewer } from "@/lib/auth/viewer";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  BOOKING_SELECT,
  bookingToRow,
  rowToBooking,
} from "@/lib/api/mappers/booking";
import { writeFailure } from "@/lib/api/write-failure";
import { requireForms } from "@/lib/forms/require-forms";
import { assignKennelsOnConfirm } from "@/lib/boarding/assign-kennel-on-confirm";
import { applyBookingServiceCharges } from "@/lib/payments/booking-service-charges";
import { applyBookingCareCharges } from "@/lib/payments/booking-care-charges";
import { applyEvaluatorPreference } from "@/lib/evaluations/booking-server";
import {
  OPEN_REQUEST_STATUSES,
  approvalRefusal,
  isOpenRequest,
  quotedPrice,
  statusFor,
  type RequestAction,
} from "@/lib/bookings/request-decision";
import type { NewBooking } from "@/types/booking";
import { collectDepositOnConfirm } from "@/lib/payments/booking-deposit-server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { shellText } from "@/lib/shell/text";
import { grantLessonPack } from "@/lib/training/lesson-pack.server";

// ============================================================================
// STAFF DECIDE A CUSTOMER'S REQUEST — every day of it, or none.
//
// POST /api/bookings/[ref]/decision
//   { action: "approve" | "decline" | "waitlist", atQuote?, formOverrideReason? }
//
// A customer's multi-day request is one booking per day (the boards read one
// day per booking), tied by `details.bookingGroup`. Deciding it one booking at
// a time left the rest behind — a request half approved, half still asking. So
// the decision is taken on the request: every open day in its group is moved
// together, and if one write is refused the ones already written are put back.
//
// Approving is refused while the request is still at the $0 the database set
// on arrival and the customer's form had quoted a price (`approvalRefusal`):
// either it is priced first ("Review and approve") or approved at the quote,
// which writes the quote's price. The facility's before-approval forms are
// asked for each day, as the PATCH route asks for one.
//
// The customer hears only if the facility switched the message on: the event
// `booking_request_approved` / `_declined` is emitted and dispatched HERE,
// and awaited, so the answer can say truthfully whether anything was sent.
// ============================================================================

export const dynamic = "force-dynamic";

const ACTIONS: readonly RequestAction[] = ["approve", "decline", "waitlist"];

type Messaged = "sent" | "queued" | "not_sent";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: RequestAction;
    atQuote?: boolean;
    formOverrideReason?: string;
  };
  const action = body.action;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: "Say whether to approve, decline or waitlist." },
      { status: 400 },
    );
  }
  const atQuote = action === "approve" && body.atQuote === true;

  // Staff decide requests. A customer may withdraw their own, which is a
  // cancel, not this.
  const viewer = await getViewer().catch(() => null);
  if (!viewer || (viewer.memberships.length === 0 && !viewer.isPlatformAdmin)) {
    return NextResponse.json(
      { error: "Only the facility can decide a request." },
      { status: 403 },
    );
  }
  if (!viewer.isPlatformAdmin) {
    const permissions = await myPermissions();
    if (!holds(permissions, "edit_bookings")) {
      return NextResponse.json(
        { error: "You do not have permission to edit bookings." },
        { status: 403 },
      );
    }
  }

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("ref", bookingRef)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  const stored = current as unknown as {
    facility_id: string;
    facilities: { timezone: string | null } | null;
  };
  const context = {
    facilityId: stored.facility_id,
    timeZone: stored.facilities?.timezone ?? "America/Toronto",
  };
  const booking = rowToBooking(current);
  if (!isOpenRequest(booking.status)) {
    return NextResponse.json(
      { error: "This booking is not a request any more.", reason: "decided" },
      { status: 409 },
    );
  }

  // The request's other days, from the same facility, still open.
  let rows = [current];
  if (booking.bookingGroup?.id) {
    const { data: siblings, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("facility_id", context.facilityId)
      .filter("details->bookingGroup->>id", "eq", booking.bookingGroup.id)
      .in("status", [...OPEN_REQUEST_STATUSES]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (siblings && siblings.length > 0) rows = siblings;
  }
  const days = rows.map((row) => ({
    row: row as unknown as { id: string },
    booking: rowToBooking(row),
  }));

  if (action === "approve") {
    const unpriced = days.find((day) => approvalRefusal(day.booking, atQuote));
    if (unpriced) {
      return NextResponse.json(
        {
          error:
            "This request has not been priced. Review it and set the price, or approve it at the price the customer was quoted.",
          reason: "unpriced",
        },
        { status: 422 },
      );
    }
    for (const day of days) {
      const refused = await requireForms(
        supabase,
        day.row.id,
        "before_approval",
        body.formOverrideReason,
      );
      if (refused) return refused;
    }
  }

  // Every day, or none: a refused write puts back the days already moved.
  const nextStatus = statusFor(action);
  const undo: Array<{ ref: number; row: Record<string, unknown> }> = [];
  for (const day of days) {
    // At the quote, a day still at its arrival $0 takes the quoted price; a
    // day staff already priced keeps theirs. That is also what lets "Review
    // and approve" on a three-day request price the day it reviewed and
    // approve the rest at what the customer was told.
    const changes: Partial<NewBooking> = {
      status: nextStatus,
      ...(atQuote && approvalRefusal(day.booking, false)
        ? quotedPrice(day.booking)
        : {}),
    };
    const before = bookingToRow(day.booking as Partial<NewBooking>, context);
    const after = bookingToRow(
      { ...day.booking, ...changes } as Partial<NewBooking>,
      context,
    );
    const row: Record<string, unknown> = {};
    const back: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(after)) {
      const was = (before as Record<string, unknown>)[key];
      if (JSON.stringify(value) !== JSON.stringify(was)) {
        row[key] = value;
        back[key] = was;
      }
    }

    const { data: written, error } = await supabase
      .from("bookings")
      .update(row as never)
      .eq("ref", day.booking.id)
      .select("id");
    if (error || !written || written.length === 0) {
      for (const done of undo.reverse()) {
        // rls-write-ok: a best-effort undo of rows this request just wrote;
        // the request already answers with the refusal that caused it.
        await supabase
          .from("bookings")
          .update(done.row as never)
          .eq("ref", done.ref);
      }
      if (error) {
        return writeFailure(error, {
          denied: "Not allowed to edit bookings.",
          duplicate: "That change conflicts with another booking.",
        });
      }
      return NextResponse.json(
        { error: "Not allowed to edit this booking." },
        { status: 403 },
      );
    }
    undo.push({ ref: day.booking.id, row: back });
  }

  // An approved boarding request is given a kennel of the kind it was priced
  // for, under the approver's own session. It had none: a request drops its
  // room so an unconfirmed booking cannot hold one. `kennel: null` says none
  // was free, so the screen can send staff to the kennel board.
  const kennels =
    action === "approve"
      ? await assignKennelsOnConfirm(
          supabase as unknown as SupabaseClient,
          days.map((day) => day.row.id),
        )
      : [];

  // An approved request is priced now, so its service charges land — once,
  // on its first day, decided as the create path decides them. They were
  // skipped when it was made, at the $0 the database gives a request. Its
  // care charges were written when it was made; any a request made some
  // other way is missing land now.
  if (action === "approve") {
    await applyBookingServiceCharges(days.map((day) => day.row.id));
    await applyBookingCareCharges(
      days.map((day) => day.row.id),
      "initial",
    );
    // An evaluation takes the evaluator its customer chose, now that it is
    // confirmed (the database cleared it on the customer's insert).
    await applyEvaluatorPreference(
      supabase as unknown as SupabaseClient,
      days.map((day) => day.row.id),
    );
  }

  // ── A TRAINING REQUEST (the booking wizard, 2026-10-02) ───────────────
  //
  // A class is an enrolment whose sessions are the request's days: declined,
  // its place in the class is given back. A lesson pack approved: the first
  // session is this booking, at the pack's quoted price, and the rest become
  // passes the client books from the booking page.
  const training = await settleTrainingRequest(supabase, action, {
    facilityId: context.facilityId,
    clientId: (current as unknown as { client_id: string }).client_id,
    groupId: booking.bookingGroup?.id ?? null,
    details: (current as unknown as { details: Record<string, unknown> | null })
      .details,
  });

  // The deposit the customer agreed to with the request: their card charged
  // now that it is confirmed, else the deposit link by email (the booking
  // wizard, 2026-10-02). After the charges above, which it is a share of.
  const deposit =
    action === "approve"
      ? await collectDepositOnConfirm({
          bookingIds: days.map((day) => day.row.id),
          request,
          createdBy: user?.id ?? null,
        })
      : "none";

  const messaged = await tellTheCustomer(supabase, action, {
    facilityId: context.facilityId,
    clientId: (current as unknown as { client_id: string }).client_id,
    bookingId: days[0].row.id,
    key: booking.bookingGroup?.id ?? String(booking.id),
    refs: days.map((day) => day.booking.id),
  });

  return NextResponse.json({
    status: nextStatus,
    refs: days.map((day) => day.booking.id),
    messaged,
    kennels,
    deposit,
    training,
  });
}

/**
 * What a training request's decision does beyond its bookings' status: a
 * declined class gives its place back; an approved lesson pack becomes passes.
 * Best effort — the decision stands, and the answer says what happened.
 */
async function settleTrainingRequest(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  action: RequestAction,
  request: {
    facilityId: string;
    clientId: string;
    groupId: string | null;
    details: Record<string, unknown> | null;
  },
): Promise<"none" | "place_released" | "pack_granted" | "pack_not_granted"> {
  try {
    if (action === "decline" && request.groupId && hasServiceRoleKey()) {
      // The group of an enrolment's sessions IS the enrolment.
      const admin = createAdminClient();
      const { data } = await admin
        .from("training_series_enrollments")
        .update({ status: "cancelled" })
        .eq("id", request.groupId)
        .eq("client_id", request.clientId)
        .in("status", ["enrolled", "waitlisted"])
        .select("id");
      return (data ?? []).length > 0 ? "place_released" : "none";
    }
    const details = request.details ?? {};
    const pack = Number(details["trainingPack"] ?? 0);
    const programId = details["trainingProgramId"];
    if (
      action === "approve" &&
      details["trainingFormat"] === "lesson" &&
      Number.isInteger(pack) &&
      pack > 1 &&
      typeof programId === "string"
    ) {
      const { data: client } = await supabase
        .from("clients")
        .select("preferred_language")
        .eq("id", request.clientId)
        .maybeSingle();
      const locale = (
        client as { preferred_language: string | null } | null
      )?.preferred_language?.startsWith("fr")
        ? "fr"
        : "en";
      const petIds = details["petId"];
      const pets = Array.isArray(petIds) ? petIds.length : 1;
      const { data: setting } = await supabase
        .from("facility_settings")
        .select("value")
        .eq("facility_id", request.facilityId)
        .eq("domain", "training_programs")
        .maybeSingle();
      const programs =
        (
          setting?.value as {
            programs?: Array<{ id: string; name: string }>;
          } | null
        )?.programs ?? [];
      const name = programs.find((p) => p.id === programId)?.name ?? "";
      const granted = await grantLessonPack({
        supabase: supabase as unknown as SupabaseClient,
        facilityId: request.facilityId,
        clientId: request.clientId,
        programId,
        sessions: pack,
        pets: Math.max(1, pets),
        packageName: `${name} · ${shellText(locale, "booking", "wizSessionPack").replace("{count}", String(pack))}`,
      });
      return granted.ok ? "pack_granted" : "pack_not_granted";
    }
    return "none";
  } catch (failure) {
    console.warn("[requests] training request not settled:", failure);
    return "none";
  }
}

/**
 * The facility's own message for this decision, if it has switched one on.
 * One event for the whole request — a three-day approval is one message, not
 * three. Best effort: the decision stands whatever happens here.
 */
async function tellTheCustomer(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  action: RequestAction,
  event: {
    facilityId: string;
    clientId: string;
    bookingId: string;
    key: string;
    refs: number[];
  },
): Promise<Messaged> {
  if (action === "waitlist") return "not_sent";
  const kind =
    action === "approve"
      ? "booking_request_approved"
      : "booking_request_declined";
  try {
    const { data: emitted, error } = await supabase.rpc(
      "emit_automation_event",
      {
        p_facility_id: event.facilityId,
        p_kind: kind,
        p_dedupe_key: `${kind}:${event.key}`,
        p_client_id: event.clientId,
        p_booking_id: event.bookingId,
        p_payload: { refs: event.refs },
      },
    );
    if (error || emitted == null) return "not_sent";
    const { dispatchEvent } = await import("@/lib/messaging/dispatch");
    const result = await dispatchEvent(emitted as number);
    if (result.sent > 0) return "sent";
    if (result.queued > 0) return "queued";
    return "not_sent";
  } catch (failure) {
    console.warn("[requests] message not sent:", failure);
    return "not_sent";
  }
}
