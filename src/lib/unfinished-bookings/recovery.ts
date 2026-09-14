import type {
  AbandonmentRecoverySettings,
  AbandonmentStep,
} from "@/types/unfinished-booking";

// ============================================================================
// What a facility's recovery settings say about one unfinished booking.
//
// Pure, so the decision the messaging tick makes — which channels, when, and
// with what words — is testable without a database. The tick
// (`recovery-tick.ts`) does the reading, the claim and the queueing.
// ============================================================================

export type RecoveryChannel = "email" | "sms";

export interface RecoveryPlan {
  /** Nothing is owed: the switch, the step, or the channel is off. */
  off: boolean;
  channels: RecoveryChannel[];
  delayHours: number;
}

export function recoveryPlan(
  settings: AbandonmentRecoverySettings,
  step: AbandonmentStep,
): RecoveryPlan {
  const rule = settings.stepRules[step];
  const delayHours =
    rule.delayHours === "inherit"
      ? settings.defaultDelayHours
      : rule.delayHours;
  const channel =
    rule.channel === "inherit" ? settings.defaultChannel : rule.channel;

  if (!settings.enabled || !rule.enabled || channel === "off") {
    return { off: true, channels: [], delayHours };
  }
  const channels: RecoveryChannel[] =
    channel === "both" ? ["email", "sms"] : [channel];
  return { off: false, channels, delayHours };
}

/** The moment the facility said to wait until. */
export function recoveryDueAt(abandonedAt: string, delayHours: number): Date {
  return new Date(new Date(abandonedAt).getTime() + delayHours * 3_600_000);
}

export interface RecoveryFacts {
  clientName: string;
  petName: string | null;
  service: string | null;
  facilityName: string;
  resumeLink: string;
}

const RECOVERY_TAG =
  /\{\{(client_name|pet_name|service|facility_name|resume_link)\}\}/g;

/**
 * The recovery tags, filled from the draft.
 *
 * A tag the draft has no value for is LEFT AS WRITTEN, so the caller's
 * UNRESOLVED_TAG check refuses the message — "Hi {{pet_name}}" must not reach a
 * customer, and neither must "Hi ," with the name silently dropped.
 */
export function fillRecoveryTags(template: string, facts: RecoveryFacts) {
  const values: Record<string, string | null> = {
    client_name: facts.clientName.trim().split(/\s+/)[0] || null,
    pet_name: facts.petName?.trim() || null,
    service: facts.service ? facts.service.replace(/_/g, " ") : null,
    facility_name: facts.facilityName || null,
    resume_link: facts.resumeLink || null,
  };
  return template.replace(
    RECOVERY_TAG,
    (tag, key: string) => values[key] ?? tag,
  );
}

/** Where the customer picks the draft back up, on the facility's own host. */
export function recoveryResumeLink(origin: string, unfinishedId: string) {
  return `${origin}/customer/bookings/new?resumeBooking=${encodeURIComponent(unfinishedId)}`;
}
