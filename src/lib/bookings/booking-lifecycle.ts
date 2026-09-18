import type { BookingStatus } from "@/types/base";
import type { PermissionKey } from "@/types/facility-staff";

import { arrivalPermissionFor, arrivalWriterFor } from "./arrival-writer";

// ============================================================================
// Where a booking is in its life, and what may happen to it next.
//
// One answer for every surface. The booking page's action bar, its status
// menu, the calendar and PATCH /api/bookings/[ref] each decided this for
// themselves, and disagreed: the action bar offered "Undo check-in" on a
// booking that had not been checked in, gated No-show on a fixture invoice
// no real booking carries, and the status menu moved any status to any other
// — cancelled without a refund, completed without payment.
//
// ── STAGE, NOT STATUS ─────────────────────────────────────────────────────
//
// For daycare, boarding, training and grooming, WHERE THE PET IS decides the
// stage: the attendance record (the `booking_presence` view) is the truth of
// arrival, and since 2026-09-18 the database mirrors it into the status. A
// row the mirror never saw — status "checked_in" with nobody on site — is
// shown as what presence says, not what the status claims.
//
// For evaluations and custom services there is no attendance record, and the
// status is the lifecycle.
// ============================================================================

export type Presence = "expected" | "on-site" | "departed" | "unknown";

export type BookingStage =
  | "request"
  | "unconfirmed"
  | "expected"
  | "on_site"
  | "gone_home"
  | "completed"
  | "no_show"
  | "cancelled"
  | "declined";

export interface LifecycleBooking {
  status: BookingStatus;
  service: string;
  presence?: Presence;
  startDate: string;
  endDate: string;
}

/** Whether the pet's whereabouts come from an attendance record. */
export function isPresenceTracked(service: string | undefined): boolean {
  return arrivalWriterFor(service) !== null;
}

function knownPresence(b: LifecycleBooking): Presence | null {
  if (!isPresenceTracked(b.service)) return null;
  return b.presence && b.presence !== "unknown" ? b.presence : null;
}

export function bookingStage(b: LifecycleBooking): BookingStage {
  switch (b.status) {
    case "request_submitted":
    case "waitlisted":
      return "request";
    case "pending":
    case "estimate_sent":
      return "unconfirmed";
    case "cancelled":
      return "cancelled";
    case "declined":
      return "declined";
    case "no_show":
      return "no_show";
    case "completed":
      return "completed";
    default:
      break;
  }
  // confirmed · checked_in · in_progress · ready
  const presence = knownPresence(b);
  if (presence === "on-site") return "on_site";
  if (presence === "departed") return "gone_home";
  if (presence === "expected") return "expected";
  return b.status === "confirmed" ? "expected" : "on_site";
}

// ── ACTIONS ─────────────────────────────────────────────────────────────

export type BookingActionId =
  // a request
  | "review_request"
  | "waitlist_request"
  | "decline_request"
  // before the day
  | "confirm"
  | "undo_confirm"
  | "charge_deposit"
  | "take_prepayment"
  | "check_in"
  | "no_show"
  // on site
  | "check_out"
  | "check_out_unpaid"
  | "mark_in_progress"
  | "mark_ready"
  | "undo_check_in"
  // after
  | "finish"
  | "take_payment"
  | "split_tips"
  | "refund"
  | "undo_checkout"
  | "undo_no_show"
  | "reinstate"
  // any open booking
  | "edit"
  | "add_item"
  | "transfer"
  | "report_incident"
  | "send_pay_link"
  | "cancel";

/**
 * Where an action is shown. `primary` is the page's one prominent control
 * (§1), `secondary` sits beside it, `more` goes in the overflow menu, and
 * `reverse` is the separated row of undo and cancel.
 */
export type ActionPlacement = "primary" | "secondary" | "more" | "reverse";

export interface BookingAction {
  id: BookingActionId;
  placement: ActionPlacement;
}

export interface ActionContext {
  can: (key: PermissionKey) => boolean;
  /** What is still owed, from the ledger (balanceOf). */
  owed: number;
  /** What has been paid, net of refunds. */
  paid: number;
  /** The facility-local calendar day, YYYY-MM-DD. */
  today: string;
  /** A deposit rule applies to this booking and nothing has been paid. */
  depositDue: boolean;
  /** The facility has more than one location. */
  multiLocation: boolean;
}

/** Everything a person may do with this booking now, in display order. */
export function availableActions(
  b: LifecycleBooking,
  ctx: ActionContext,
): BookingAction[] {
  const stage = bookingStage(b);
  const out: BookingAction[] = [];
  const add = (id: BookingActionId, placement: ActionPlacement, ok = true) => {
    if (ok) out.push({ id, placement });
  };
  const canEdit = ctx.can("edit_bookings");
  const canArrive = ctx.can(arrivalPermissionFor(b.service));
  const canPay = ctx.can("take_payment");
  const canCancel = ctx.can("cancel_bookings");
  const canRefund = ctx.can("process_refund");
  const canIncident = ctx.can("log_incidents");
  const grooming = b.service.toLowerCase() === "grooming";
  const started = b.startDate <= ctx.today;

  switch (stage) {
    case "request":
      add("review_request", "primary", canEdit);
      add(
        "waitlist_request",
        "secondary",
        canEdit && b.status !== "waitlisted",
      );
      add("decline_request", "reverse", canEdit);
      break;

    case "unconfirmed":
      add("confirm", "primary", canEdit);
      add("edit", "secondary", canEdit);
      add("charge_deposit", "secondary", canPay && ctx.depositDue);
      add("add_item", "secondary", canPay);
      add("transfer", "more", canEdit && ctx.multiLocation);
      add("report_incident", "more", canIncident);
      add("cancel", "reverse", canCancel);
      break;

    case "expected":
      add("check_in", "primary", canArrive);
      add("edit", "secondary", canEdit);
      add("charge_deposit", "secondary", canPay && ctx.depositDue);
      add(
        "take_prepayment",
        "secondary",
        canPay && ctx.owed > 0 && !ctx.depositDue,
      );
      add("add_item", "secondary", canPay);
      add("send_pay_link", "more", canPay && ctx.owed > 0);
      add("transfer", "more", canEdit && ctx.multiLocation);
      add("report_incident", "more", canIncident);
      add("undo_confirm", "reverse", canEdit && ctx.paid === 0);
      add("no_show", "reverse", canEdit && started);
      add("cancel", "reverse", canCancel);
      break;

    case "on_site":
      // Checking out with money owed goes through the till when this person
      // can take it; otherwise it records the departure and leaves the
      // balance on the booking.
      add("check_out", "primary", canArrive || (canPay && ctx.owed > 0));
      add("check_out_unpaid", "more", canArrive && canPay && ctx.owed > 0);
      add(
        "mark_in_progress",
        "secondary",
        grooming && canEdit && b.status !== "in_progress",
      );
      add(
        "mark_ready",
        "secondary",
        grooming && canEdit && b.status !== "ready",
      );
      add("edit", "secondary", canEdit);
      add("add_item", "secondary", canPay);
      add("send_pay_link", "more", canPay && ctx.owed > 0);
      add("transfer", "more", canEdit && ctx.multiLocation);
      add("report_incident", "more", canIncident);
      add("undo_check_in", "reverse", canArrive);
      add("cancel", "reverse", canCancel);
      break;

    case "gone_home":
      // Departed on the attendance record while the status never followed —
      // rows from before the mirror. Finish them where they are.
      add("take_payment", "primary", canPay && ctx.owed > 0);
      add("finish", ctx.owed > 0 && canPay ? "secondary" : "primary", canEdit);
      add("send_pay_link", "more", canPay && ctx.owed > 0);
      add("report_incident", "more", canIncident);
      add("undo_checkout", "reverse", canArrive);
      add("cancel", "reverse", canCancel);
      break;

    case "completed":
      add("take_payment", "primary", canPay && ctx.owed > 0);
      add("send_pay_link", "more", canPay && ctx.owed > 0);
      add("split_tips", "more", canPay && ctx.paid > 0);
      add("refund", "more", canRefund && ctx.paid > 0);
      add("report_incident", "more", canIncident);
      add("undo_checkout", "reverse", canArrive);
      add("cancel", "reverse", canCancel);
      break;

    case "no_show":
      add("refund", "more", canRefund && ctx.paid > 0);
      add("undo_no_show", "reverse", canEdit);
      break;

    case "cancelled":
      add("refund", "more", canRefund && ctx.paid > 0);
      add("reinstate", "reverse", canEdit);
      break;

    case "declined":
      break;
  }
  return out;
}

// ── WHICH STATUS MOVES ARE ALLOWED ──────────────────────────────────────

export type TransitionRefusal =
  /** Arrival and departure of a tracked service go through its attendance write. */
  | "use_arrival"
  /** The pet is not on site, so it cannot be in progress or ready. */
  | "not_on_site"
  /** The pet arrived, so it was not a no-show. */
  | "arrived"
  /** A declined booking can only be cancelled. */
  | "declined_final"
  /** A cancelled booking can only be reinstated. */
  | "cancelled_final"
  /** A booking that was confirmed cannot go back to being a request. */
  | "not_a_request";

export type TransitionAnswer =
  | { ok: true }
  | { ok: false; reason: TransitionRefusal };

const REQUESTISH = new Set<BookingStatus>([
  "pending",
  "estimate_sent",
  "request_submitted",
  "waitlisted",
]);
const ON_SITE_STATUSES = new Set<BookingStatus>([
  "checked_in",
  "in_progress",
  "ready",
]);

/**
 * May a booking's status be SET from `from` to `to` by a direct write?
 *
 * The rule for a tracked service is that the status agrees with where the
 * pet is: the arrival and departure writes move it (the database mirrors
 * them), and a direct write may only bring a stray status into line — never
 * pull it away. Cancelling is always allowed (it is how every other state is
 * left, and the e2e sweeps rely on it); who may cancel is a permission, not
 * a transition.
 */
export function checkStatusTransition(
  from: BookingStatus,
  to: BookingStatus,
  b: { service: string; presence?: Presence },
): TransitionAnswer {
  if (from === to || to === "cancelled") return { ok: true };
  if (from === "declined") return { ok: false, reason: "declined_final" };
  if (from === "cancelled") {
    return to === "confirmed" || to === "pending"
      ? { ok: true }
      : { ok: false, reason: "cancelled_final" };
  }
  if (
    to === "request_submitted" ||
    to === "waitlisted" ||
    to === "estimate_sent"
  ) {
    return REQUESTISH.has(from)
      ? { ok: true }
      : { ok: false, reason: "not_a_request" };
  }

  const tracked = isPresenceTracked(b.service);
  const presence = tracked ? (b.presence ?? "unknown") : "unknown";

  if (tracked) {
    if (to === "checked_in" || to === "in_progress" || to === "ready") {
      if (presence !== "on-site") {
        return {
          ok: false,
          reason: to === "checked_in" ? "use_arrival" : "not_on_site",
        };
      }
      return { ok: true };
    }
    if (to === "completed") {
      return presence === "departed"
        ? { ok: true }
        : { ok: false, reason: "use_arrival" };
    }
    if (
      to === "confirmed" &&
      presence !== "expected" &&
      presence !== "unknown"
    ) {
      return { ok: false, reason: "use_arrival" };
    }
    if (
      to === "no_show" &&
      (presence === "on-site" || presence === "departed")
    ) {
      return { ok: false, reason: "arrived" };
    }
    return { ok: true };
  }

  // Untracked: the status is the lifecycle.
  if ((to === "in_progress" || to === "ready") && !ON_SITE_STATUSES.has(from)) {
    return { ok: false, reason: "not_on_site" };
  }
  if (
    to === "no_show" &&
    (ON_SITE_STATUSES.has(from) || from === "completed")
  ) {
    return { ok: false, reason: "arrived" };
  }
  return { ok: true };
}
