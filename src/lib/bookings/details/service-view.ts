import type { BookingStatus } from "@/types/base";
import {
  bookingStage,
  type BookingAction,
  type BookingActionId,
  type BookingStage,
  type LifecycleBooking,
} from "@/lib/bookings/booking-lifecycle";

// ============================================================================
// The facility booking page, as the client's Booking_Details mocks shape it
// (2026-10-03) — the parts of it that are decisions rather than drawing.
//
// The mocks are one page in four services. What differs between them is data:
// which tabs a booking has, which steps its stepper walks, what the one
// button in the header does next, which card titles the details and what it
// offers. All of it is here, pure, so the four pages cannot drift apart and a
// test can read every answer.
//
// The steps are drawn from the lifecycle (`bookingStage`), not from the status
// alone: for a tracked service WHERE THE PET IS decides the stage, and the
// header must agree with the boards about it.
// ============================================================================

export type DetailKind =
  | "boarding"
  | "daycare"
  | "grooming"
  | "training"
  | "other";

export function serviceKind(service: string | null | undefined): DetailKind {
  const s = (service ?? "").toLowerCase();
  return s === "boarding" ||
    s === "daycare" ||
    s === "grooming" ||
    s === "training"
    ? s
    : "other";
}

/** A stay or a day has a journal and tasks; a groom or a lesson does not. */
export type DetailTab = "overview" | "journal" | "tasks" | "notes";

export function detailTabs(kind: DetailKind): DetailTab[] {
  return kind === "boarding" || kind === "daycare"
    ? ["overview", "journal", "tasks", "notes"]
    : ["overview", "notes"];
}

export type DetailStep =
  | "confirmed"
  | "booked"
  | "checkedIn"
  | "checkedOut"
  | "inGrooming"
  | "readyForPickup"
  | "completed"
  | "sessionComplete";

export function detailSteps(kind: DetailKind): DetailStep[] {
  switch (kind) {
    case "boarding":
    case "daycare":
      return ["confirmed", "checkedIn", "checkedOut"];
    case "grooming":
      return [
        "booked",
        "checkedIn",
        "inGrooming",
        "readyForPickup",
        "completed",
      ];
    case "training":
      return ["booked", "checkedIn", "sessionComplete"];
    default:
      return ["booked", "checkedIn", "completed"];
  }
}

/**
 * Where the booking stands on its stepper.
 *
 * `index` is the step it is AT. A request or an unconfirmed booking has not
 * reached the first step — confirmed is the first — so it is -1 and every
 * dot is still ahead. A cancelled, declined or no-show booking has no stepper
 * at all (`null`): it left the path, and the pill says how.
 */
export interface StepState {
  index: number;
  /** The last step is reached: no next action, a green pill. */
  done: boolean;
  stage: BookingStage;
}

export function stepState(
  kind: DetailKind,
  booking: LifecycleBooking,
): StepState | null {
  const stage = bookingStage(booking);
  const last = detailSteps(kind).length - 1;
  const at = (index: number): StepState => ({
    index,
    done: index === last,
    stage,
  });
  switch (stage) {
    case "request":
    case "unconfirmed":
      return at(-1);
    case "expected":
      return at(0);
    case "on_site":
      if (kind === "grooming") {
        if (booking.status === "in_progress") return at(2);
        if (booking.status === "ready") return at(3);
      }
      return at(1);
    case "gone_home":
    case "completed":
      return at(last);
    default:
      return null;
  }
}

/** The pill beside the service: a step's own word, or the state that left the path. */
export type PillTone = "live" | "done" | "waiting" | "stopped" | "neutral";

export function pillTone(
  state: StepState | null,
  status: BookingStatus,
): PillTone {
  if (!state) {
    return status === "no_show" ? "neutral" : "stopped";
  }
  if (state.done) return "done";
  return state.index < 0 ? "waiting" : "live";
}

/**
 * The header's ONE button: the action that moves the booking to its next
 * step, as the mock draws it ("Check Bubu in", "Start grooming", "Ready for
 * pickup", "Complete", "Complete session").
 *
 * Chosen from what the lifecycle already allows this viewer — never invented
 * here — so a permission the viewer lacks still removes the button.
 *
 * Taking a payment is never the header's button: the payment card beside the
 * page offers it, and a finished booking shows no next step (the mock).
 */
export function primaryFor(
  kind: DetailKind,
  booking: LifecycleBooking,
  actions: readonly BookingAction[],
): BookingActionId | null {
  const has = (id: BookingActionId) => actions.some((a) => a.id === id);
  const stage = bookingStage(booking);
  if (kind === "grooming" && stage === "on_site") {
    if (booking.status !== "in_progress" && booking.status !== "ready") {
      if (has("mark_in_progress")) return "mark_in_progress";
    } else if (booking.status === "in_progress" && has("mark_ready")) {
      return "mark_ready";
    }
    return has("check_out") ? "check_out" : null;
  }
  const primary = actions.find((a) => a.placement === "primary");
  if (!primary || primary.id === "take_payment") return null;
  return primary.id;
}

/** The details card: its title and the one action it carries. */
export function detailsCard(kind: DetailKind): {
  title: "stay" | "visit" | "appointment" | "program";
  action: "moveKennel" | "changeGroup" | "reschedule" | null;
} {
  switch (kind) {
    case "boarding":
      return { title: "stay", action: "moveKennel" };
    case "daycare":
      return { title: "visit", action: "changeGroup" };
    case "grooming":
      return { title: "appointment", action: "reschedule" };
    case "training":
      return { title: "program", action: "reschedule" };
    default:
      return { title: "visit", action: null };
  }
}

// ── The More menu ──────────────────────────────────────────────────────────

export type MoreItem =
  | "printBooking"
  | "printCareSheet"
  | "earlyCheckout"
  | "reschedule"
  | "payLinkEmail"
  | "payLinkSms"
  | BookingActionId
  | "emailReceipt"
  | "tags";

export interface MoreGroup {
  /** The group's small-capitals heading; the first group has none. */
  heading: "sendPaymentLink" | "other" | null;
  items: MoreItem[];
}

/** Lifecycle actions the page draws elsewhere, never in the menu. */
const DRAWN_ELSEWHERE = new Set<BookingActionId>([
  "edit",
  "add_item",
  "add_service_charge",
  "send_pay_link",
  "report_incident",
  "cancel",
]);

/**
 * The mock's menu, in its order — print, the service's own move (early
 * checkout or reschedule), the payment link by email and by text, then
 * "Other": the undo or no-show, everything else the lifecycle allows, and
 * the two red items last.
 */
export function moreMenu(
  kind: DetailKind,
  actions: readonly BookingAction[],
  options: {
    primary: BookingActionId | null;
    canPrintCareSheet: boolean;
    canEarlyCheckout: boolean;
    canEmailReceipt: boolean;
    /** Taking a payment lives on the payment card — unless that is hidden. */
    paymentCardShown: boolean;
  },
): MoreGroup[] {
  const has = (id: BookingActionId) => actions.some((a) => a.id === id);
  const first: MoreItem[] = ["printBooking"];
  if (options.canPrintCareSheet) first.push("printCareSheet");
  if ((kind === "boarding" || kind === "daycare") && options.canEarlyCheckout) {
    first.push("earlyCheckout");
  }
  if ((kind === "grooming" || kind === "training") && has("edit")) {
    first.push("reschedule");
  }
  const groups: MoreGroup[] = [{ heading: null, items: first }];

  if (has("send_pay_link")) {
    groups.push({
      heading: "sendPaymentLink",
      items: ["payLinkEmail", "payLinkSms"],
    });
  }

  // The reversal first, as the mock puts "Undo checked in" or "Mark as
  // no-show" at the top of Other.
  const reversals: BookingActionId[] = [
    "undo_check_in",
    "undo_checkout",
    "undo_confirm",
    "no_show",
    "undo_no_show",
    "reinstate",
  ];
  const other: MoreItem[] = reversals.filter(has);
  for (const action of actions) {
    if (
      action.id === options.primary ||
      DRAWN_ELSEWHERE.has(action.id) ||
      reversals.includes(action.id) ||
      (action.id === "take_payment" && options.paymentCardShown)
    ) {
      continue;
    }
    other.push(action.id);
  }
  if (has("add_service_charge")) other.push("add_service_charge");
  if (options.canEmailReceipt) other.push("emailReceipt");
  other.push("tags");
  if (has("report_incident")) other.push("report_incident");
  if (has("cancel")) other.push("cancel");
  groups.push({ heading: "other", items: other });
  return groups;
}

/** A red item: it ends or damages something. */
export function isDangerItem(item: MoreItem): boolean {
  return item === "report_incident" || item === "cancel";
}

// ── Alerts under the header ────────────────────────────────────────────────

export type AlertTone = "red" | "amber" | "neutral";

export type DetailAlert =
  | { kind: "allergy"; tone: "red"; text: string }
  | { kind: "careOverdue"; tone: "amber"; count: number }
  | { kind: "checkoutToday"; tone: "neutral"; time: string | null }
  | { kind: "vaccines"; tone: "amber"; text: string }
  | { kind: "flag"; tone: AlertTone; text: string };

/** A profile that says "None" has no allergy to show. */
const NO_ALLERGY = /^(none|n\/?a|no|nil|aucune?)$/i;

export function allergiesOf(raw: string | null | undefined): string[] {
  return [
    ...new Set(
      (raw ?? "")
        .split(/[,;]/)
        .map((a) => a.trim())
        .filter((a) => a && !NO_ALLERGY.test(a)),
    ),
  ];
}

/**
 * The chips under the stepper, in the mock's order: what could hurt the pet,
 * what is late today, then what today holds.
 */
export function alertsFor(input: {
  allergies: readonly string[];
  /** Today's planned care with nothing logged, while the pet is here. */
  careOverdue: number;
  /** Boarding, leaving today and still here: the booked time. */
  checkoutToday: { time: string | null } | null;
  vaccineGaps: string | null;
  flags: readonly { text: string; tone: AlertTone }[];
}): DetailAlert[] {
  const out: DetailAlert[] = input.allergies.map((text) => ({
    kind: "allergy" as const,
    tone: "red" as const,
    text,
  }));
  if (input.careOverdue > 0) {
    out.push({ kind: "careOverdue", tone: "amber", count: input.careOverdue });
  }
  if (input.vaccineGaps) {
    out.push({ kind: "vaccines", tone: "amber", text: input.vaccineGaps });
  }
  for (const flag of input.flags) {
    if (flag.text.trim()) {
      out.push({ kind: "flag", tone: flag.tone, text: flag.text.trim() });
    }
  }
  if (input.checkoutToday) {
    out.push({
      kind: "checkoutToday",
      tone: "neutral",
      time: input.checkoutToday.time,
    });
  }
  return out;
}

// ── The journal ────────────────────────────────────────────────────────────

/** The four kinds the journal draws, each with its own chip colours. */
export type JournalKind = "meal" | "med" | "potty" | "activity";

export function journalKind(taskType: string): JournalKind {
  switch (taskType) {
    case "feeding":
      return "meal";
    case "medication":
      return "med";
    case "potty":
      return "potty";
    default:
      return "activity";
  }
}

/**
 * The answers a kind offers, as care-log outcomes. The mock's words map onto
 * the outcomes the Daily Care board already writes, so a meal logged here and
 * one logged on the board are the same row.
 */
export function journalOptions(kind: JournalKind): string[] {
  switch (kind) {
    case "meal":
      return ["ate_all", "ate_some", "refused"];
    case "med":
      return ["given", "refused", "skipped"];
    case "potty":
      return ["pee", "poop", "both", "nothing"];
    default:
      return ["completed", "skipped"];
  }
}

/** An outcome somebody should notice — the amber result chip. */
export function isConcerning(outcome: string): boolean {
  return [
    "refused",
    "skipped",
    "nothing",
    "ate_some",
    "ate_little",
    "vomited",
    "issue_reported",
  ].includes(outcome);
}

// ── Training ───────────────────────────────────────────────────────────────

export type SkillState = "not-started" | "practising" | "mastered";

/**
 * A skill's state from the trainer's ratings (`training_attendance.exercises`,
 * 1–5): none is not started, a 5 is mastered, anything else is practice.
 * Read from the latest rating, as the progress charts read it.
 */
export function skillState(
  latestRating: number | null | undefined,
): SkillState {
  if (latestRating == null || !Number.isFinite(latestRating)) {
    return "not-started";
  }
  return latestRating >= 5 ? "mastered" : "practising";
}

/**
 * What a tap writes on THIS session's attendance, as the mock cycles a skill
 * (not started → practising → mastered → not started): a 3, a 5, or the
 * rating taken off again.
 */
export function nextSkillRating(state: SkillState): number | null {
  return state === "not-started" ? 3 : state === "practising" ? 5 : null;
}

// ── Pets ───────────────────────────────────────────────────────────────────

/** "Bubu", "Bubu & Kofi", "Bubu +2" — the page's rule since the hero. */
export function petsLabel(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  return names.length <= 2
    ? names.join(" & ")
    : `${names[0]} +${names.length - 1}`;
}
