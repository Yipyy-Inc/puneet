import { z } from "zod";

// ============================================================================
// Smart Workflows — a sequence, not a single message.
//
// An `automation_rule` says "when X happens, send Y". A workflow says "when X
// happens (or when this filter matches on a schedule), send Y, then wait, then
// send Z — and stop the moment they do the thing I was asking for."
// ============================================================================

export const workflowKindEnum = z.enum(["event", "audience"]);
export type WorkflowKind = z.infer<typeof workflowKindEnum>;

export const workflowStatusEnum = z.enum([
  "draft",
  "active",
  "paused",
  "archived",
]);
export type WorkflowStatus = z.infer<typeof workflowStatusEnum>;

export const frequencyEnum = z.enum(["daily", "weekly", "monthly"]);
export type Frequency = z.infer<typeof frequencyEnum>;

/**
 * The filter model, matching what `SegmentBuilderModal` already produces.
 *
 * Filters AND together inside a group; groups combine by `groupLogicOperator`.
 * `public.compile_audience()` reads exactly this shape, so the builder's output
 * needs no translation layer — and there is no second place for the semantics
 * to drift.
 */
export const audienceFilterSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown().optional(),
});
export type AudienceFilter = z.infer<typeof audienceFilterSchema>;

export const audienceSchema = z.object({
  groupLogicOperator: z.enum(["AND", "OR"]).default("AND"),
  filterGroups: z.array(z.object({ filters: z.array(audienceFilterSchema) })),
});
export type Audience = z.infer<typeof audienceSchema>;

export interface WorkflowStep {
  id?: string;
  stepIndex: number;
  /** Minutes to wait after the previous step, or after the trigger for step 0. */
  delayMinutes: number;
  emailTemplateId: string | null;
  smsTemplateId: string | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  kind: WorkflowKind;
  status: WorkflowStatus;

  /** Set when kind === 'event'. */
  trigger: string | null;
  /** Set when kind === 'audience'. */
  audience: Audience | null;
  /** kind === 'event' only: narrow WHO the action starts it for. */
  triggerFilters: Audience | null;
  /** kind === 'event' only: narrow WHAT it starts on. Empty means every service. */
  serviceTypes: string[];

  locationIds: string[];
  frequency: Frequency | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  /** "HH:mm" on the FACILITY's clock, never UTC. */
  sendAtLocal: string | null;

  minDaysBetweenSends: number;
  stopOn: string[];

  lastEstimate: number | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;

  steps: WorkflowStep[];

  // ── Derived, read-only ────────────────────────────────────────────────────
  /** Live enrolments — people currently partway through. */
  activeEnrollments: number;
  /** Everyone ever enrolled. */
  totalEnrollments: number;
  /** Messages this workflow has actually sent, from `message_sends`. */
  messagesSent: number;
  /** Enrolments that ended early because a stop condition matched. */
  stoppedEarly: number;
  /**
   * False when this workflow's trigger has no emitter yet. Same honesty as the
   * rules: it can be written and kept, but not switched on, and the row says so.
   */
  deliverable: boolean;
}

/** How one step of a sequence has actually performed. */
export interface WorkflowStepStat {
  stepIndex: number;
  sent: number;
  queued: number;
  failed: number;
  skipped: number;
}

/**
 * One line of "what this workflow has been doing".
 *
 * Read from `message_sends`, so it is the record of what was actually
 * attempted rather than a separate activity table that could disagree with it.
 */
export interface WorkflowActivity {
  id: string;
  clientName: string | null;
  stepIndex: number | null;
  channel: string;
  status: string;
  skipReason: string | null;
  createdAt: string;
}

export interface WorkflowDetail extends Workflow {
  /** Distinct clients this workflow has ever written to. */
  uniqueRecipients: number;
  stepStats: WorkflowStepStat[];
  recentActivity: WorkflowActivity[];
}

/**
 * The audience fields the compiler actually implements.
 *
 * `SEGMENT_FILTER_FIELDS` in src/data/marketing.ts lists thirty. Four of them —
 * `friends_of_pet`, `mutual_friends`, `evaluation_required`,
 * `agreement_not_signed` — have no table behind them in any form and are
 * DELIBERATELY absent here. Offering a filter that silently matches nobody is
 * the same bug as the seven dangling template ids, and this list is what keeps
 * the picker honest.
 */
export const AUDIENCE_FIELDS = [
  {
    field: "last_visit_days",
    label: "Last visit",
    operators: [
      { value: "more_than", label: "more than … days ago" },
      { value: "less_than", label: "within the last … days" },
    ],
    input: "number" as const,
    placeholder: "30",
  },
  {
    field: "last_service_type",
    label: "Last service",
    operators: [
      { value: "in", label: "was one of" },
      { value: "not_in", label: "was not one of" },
    ],
    input: "services" as const,
  },
  {
    field: "vaccination_status",
    label: "Vaccinations",
    operators: [
      { value: "expired", label: "have expired" },
      { value: "expiring_within", label: "expire within … days" },
      { value: "missing", label: "were never provided" },
    ],
    input: "number" as const,
    placeholder: "30",
  },
  {
    field: "customer_tag",
    label: "Customer tag",
    operators: [
      { value: "has", label: "has tag" },
      { value: "not_has", label: "does not have tag" },
    ],
    input: "tag" as const,
  },
  {
    field: "has_active_booking",
    label: "Upcoming booking",
    operators: [{ value: "is", label: "is" }],
    input: "boolean" as const,
  },
  {
    field: "total_visits",
    label: "Completed visits",
    operators: [
      { value: "more_than", label: "more than" },
      { value: "less_than", label: "fewer than" },
    ],
    input: "number" as const,
    placeholder: "5",
  },
  {
    field: "last_booking_date",
    label: "Last booking",
    operators: [
      { value: "before", label: "before" },
      { value: "after", label: "on or after" },
    ],
    input: "date" as const,
  },
  {
    field: "membership_status",
    label: "Membership",
    operators: [{ value: "is", label: "is" }],
    input: "membership" as const,
  },
] as const;

export type AudienceFieldKey = (typeof AUDIENCE_FIELDS)[number]["field"];

export const STOP_CONDITIONS = [
  {
    value: "booked",
    label: "They book an appointment",
    hint: "The usual one. Stops a win-back sequence chasing somebody who already rebooked.",
  },
  {
    value: "manual",
    label: "Someone stops it by hand",
    hint: "Staff can end a sequence for one client from the workflow's detail page.",
  },
] as const;
