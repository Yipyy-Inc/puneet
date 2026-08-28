import { automationTriggerEnum } from "@/types/communications";

// ============================================================================
// What each trigger is called, what it means, and where it belongs.
//
// ── ONE MAP, DERIVED FROM THE ENUM ────────────────────────────────────────
//
// `TRIGGER_META` is keyed by the Zod enum's own type, so adding a value to
// `automationTriggerEnum` and forgetting to describe it is a TYPE ERROR rather
// than a dropdown entry reading "package_expiry".
//
// That is the whole point. The screen this replaces hand-wrote its dropdown as
// a separate array of eight, and a second component hand-wrote a different list
// of eleven. Neither matched the enum's seventeen, and the mismatch was
// invisible until somebody opened a rule the dropdown could not represent and
// silently rewrote its trigger.
// ============================================================================

export type AutomationTrigger = (typeof automationTriggerEnum.options)[number];

export type TriggerCategory =
  | "booking"
  | "reminder"
  | "payment"
  | "forms"
  | "recovery";

export interface TriggerMeta {
  label: string;
  description: string;
  category: TriggerCategory;
  /**
   * True when the trigger is a moment in TIME rather than something a person
   * did — "24 hours before the appointment", not "a booking was created".
   *
   * These can never be emitted from a write path, because no write happens at
   * the moment they are due. They need the scheduled scan, which is why they
   * are the ones still marked "not yet delivering" after the event emitters
   * land.
   */
  timeDriven: boolean;
}

export const TRIGGER_META: Record<AutomationTrigger, TriggerMeta> = {
  booking_created: {
    label: "Booking Created",
    description: "As soon as a booking is made, however it was made.",
    category: "booking",
    timeDriven: false,
  },
  booking_cancelled: {
    label: "Booking Cancelled",
    description: "When a booking is cancelled by staff or by the customer.",
    category: "booking",
    timeDriven: false,
  },
  booking_request_submitted: {
    label: "Booking Request Submitted",
    description:
      "A request came in through online booking and awaits a decision.",
    category: "booking",
    timeDriven: false,
  },
  booking_request_approved: {
    label: "Booking Request Approved",
    description: "Staff accepted a pending booking request.",
    category: "booking",
    timeDriven: false,
  },
  booking_request_declined: {
    label: "Booking Request Declined",
    description: "Staff turned down a pending booking request.",
    category: "booking",
    timeDriven: false,
  },
  check_in: {
    label: "Check-In",
    description: "The pet arrived and was checked in.",
    category: "booking",
    timeDriven: false,
  },
  check_out: {
    label: "Check-Out",
    description: "The pet was checked out and went home.",
    category: "booking",
    timeDriven: false,
  },
  "24h_before": {
    label: "24-Hour Reminder",
    description: "A day before the booking starts.",
    category: "reminder",
    timeDriven: true,
  },
  appointment_reminder: {
    label: "Appointment Reminder",
    description: "A set number of hours before a grooming or training slot.",
    category: "reminder",
    timeDriven: true,
  },
  vaccination_expiry: {
    label: "Vaccination Expiry",
    description: "Before a pet's vaccination records lapse.",
    category: "reminder",
    timeDriven: true,
  },
  package_expiry: {
    label: "Package Expiry",
    description: "Before unused package credits run out of time.",
    category: "reminder",
    timeDriven: true,
  },
  payment_received: {
    label: "Payment Received",
    description: "A payment settled — the receipt.",
    category: "payment",
    timeDriven: false,
  },
  payment_overdue: {
    label: "Payment Overdue",
    description: "An invoice passed its due date without being paid.",
    category: "payment",
    timeDriven: true,
  },
  form_link_sent: {
    label: "Form Link Sent",
    description: "A form was sent to a customer to fill in.",
    category: "forms",
    timeDriven: false,
  },
  form_started: {
    label: "Form Started",
    description: "A customer opened a form but has not finished it.",
    category: "forms",
    timeDriven: false,
  },
  form_submitted: {
    label: "Form Submitted",
    description: "A customer completed and sent back a form.",
    category: "forms",
    timeDriven: false,
  },
  form_incomplete_by_deadline: {
    label: "Form Incomplete by Deadline",
    description: "A form was still unfinished when it was needed.",
    category: "forms",
    timeDriven: true,
  },
  form_red_flag_answer: {
    label: "Form Red-Flag Answer",
    description:
      "An answer needs a human to look at it. Usually sent to staff.",
    category: "forms",
    timeDriven: false,
  },
  booking_abandoned: {
    label: "Booking Abandoned",
    description: "Someone started booking online and did not finish.",
    category: "recovery",
    timeDriven: true,
  },
};

export const CATEGORY_LABEL: Record<TriggerCategory, string> = {
  booking: "Booking & Check-ins",
  reminder: "Reminders",
  payment: "Payment",
  forms: "Forms",
  recovery: "Recovery",
};

/** Every trigger, grouped, for a dropdown with optgroups. */
export function triggersByCategory(): {
  category: TriggerCategory;
  label: string;
  triggers: AutomationTrigger[];
}[] {
  const order: TriggerCategory[] = [
    "booking",
    "reminder",
    "payment",
    "forms",
    "recovery",
  ];
  return order.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    triggers: automationTriggerEnum.options.filter(
      (t) => TRIGGER_META[t].category === category,
    ),
  }));
}
