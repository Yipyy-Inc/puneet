import type { NotificationKind } from "@/lib/notifications/catalog";

// ============================================================================
// The email a member of staff gets for a notification they switched email on
// for. Pure, so the words are unit-tested.
//
// In English, as every other staff email in the product is: a facility has no
// language of its own to send in yet (see lib/yipyy-go/notify.ts). The bell
// renders the same notice in the viewer's language from the catalogue.
// ============================================================================

export type NotificationParams = Record<string, string | number | undefined>;

function value(params: NotificationParams, key: string, fallback = ""): string {
  const v = params[key];
  return v === undefined || v === null || v === "" ? fallback : String(v);
}

const WORDS: Record<
  NotificationKind,
  (p: NotificationParams) => { subject: string; line: string }
> = {
  booking_request: (p) => ({
    subject: `Booking request from ${value(p, "client", "a customer")}`,
    line: `${value(p, "client", "A customer")} asked to book ${value(p, "service", "a service")}${p.date ? ` on ${value(p, "date")}` : ""}. It is waiting for a decision.`,
  }),
  booking_online: (p) => ({
    subject: `New online booking from ${value(p, "client", "a customer")}`,
    line: `${value(p, "client", "A customer")} booked ${value(p, "service", "a service")}${p.date ? ` on ${value(p, "date")}` : ""} online.`,
  }),
  booking_cancelled: (p) => ({
    subject: `Booking cancelled by ${value(p, "client", "a customer")}`,
    line: `${value(p, "client", "A customer")} cancelled ${value(p, "service", "their booking")}${p.date ? ` on ${value(p, "date")}` : ""}.`,
  }),
  form_submitted: (p) => ({
    subject: `Form submitted: ${value(p, "form", "a form")}`,
    line: `${value(p, "client", "A customer")} submitted ${value(p, "form", "a form")}.`,
  }),
  pre_arrival_submitted: (p) => ({
    subject: `Pre-arrival form for ${value(p, "pet", "a pet")}`,
    line: `${value(p, "client", "A customer")} submitted the pre-arrival form for ${value(p, "pet", "their pet")}.`,
  }),
  vaccination_uploaded: (p) => ({
    subject: `Vaccination record to review for ${value(p, "pet", "a pet")}`,
    line: `A ${value(p, "vaccine", "vaccination")} record for ${value(p, "pet", "a pet")} is waiting for review.`,
  }),
  swap_requested: (p) => ({
    subject: `Shift swap request from ${value(p, "staff", "a team member")}`,
    line: `${value(p, "staff", "A team member")} asked to swap a shift${p.date ? ` on ${value(p, "date")}` : ""}.`,
  }),
  time_off_requested: (p) => ({
    subject: `Time off request from ${value(p, "staff", "a team member")}`,
    line: `${value(p, "staff", "A team member")} asked for time off from ${value(p, "from")} to ${value(p, "to")}.`,
  }),
  swap_decided: (p) => ({
    subject: `Your shift swap was ${value(p, "decision", "decided")}`,
    line: `Your shift swap request${p.date ? ` for ${value(p, "date")}` : ""} was ${value(p, "decision", "decided")}.`,
  }),
  time_off_decided: (p) => ({
    subject: `Your time off was ${value(p, "decision", "decided")}`,
    line: `Your time off from ${value(p, "from")} to ${value(p, "to")} was ${value(p, "decision", "decided")}.`,
  }),
  incident_reported: (p) => ({
    subject: `Incident reported: ${value(p, "title", "an incident")}`,
    line: `An incident was reported: ${value(p, "title", "no title")}${p.severity ? ` (${value(p, "severity")})` : ""}.`,
  }),
  estimate_accepted: (p) => ({
    subject: `Estimate ${value(p, "number")} accepted`,
    line: `${value(p, "client", "A customer")} accepted estimate ${value(p, "number")}.`,
  }),
  estimate_declined: (p) => ({
    subject: `Estimate ${value(p, "number")} declined`,
    line: `${value(p, "client", "A customer")} declined estimate ${value(p, "number")}.`,
  }),
};

export function staffNotificationEmail(input: {
  kind: NotificationKind;
  params: NotificationParams;
  facilityName: string;
  /** Absolute link to the thing, or null when there is none. */
  url: string | null;
}): { subject: string; text: string } {
  const words = WORDS[input.kind](input.params);
  return {
    subject: `${input.facilityName}: ${words.subject}`,
    text: [
      words.line,
      ...(input.url ? ["", `Open it: ${input.url}`] : []),
      "",
      "You get this email because you switched email on for these notifications in My notifications.",
    ].join("\n"),
  };
}
