// Trials for the trials-management page.
//
// Only one real trial subscription exists and its dates are stale, so the
// active-trial set is synthesized deterministically and now-relative: each seed
// gets a fixed days-remaining value (spread across the green/amber/red bands and
// one already-expired/read-only trial). Trial-expiry reminders at 14/7/3 days
// are modeled as idempotent jobs keyed off the trial end date (sent once
// `now` passes `trialEnd − step`). Conversion rate is computed from a set of
// trials that ended in the current quarter. Swap the synthesized days/outcomes
// for real dates when a backend arrives.

import {
  TRIAL_EXPIRY_TEMPLATE_ID,
  TRIAL_SEEDS,
  QUARTER_OUTCOMES,
} from "@/data/trial-seeds";
import type {
  Trial,
  TrialReminder,
  TrialReminderStep,
  TrialsState,
} from "@/types/trials";

const REMINDER_STEPS: TrialReminderStep[] = [14, 7, 3];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfQuarter(now: Date): Date {
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1);
}

const TRIAL_LENGTH_DAYS = 14;

export function buildTrials(now: Date): TrialsState {
  const trials: Trial[] = TRIAL_SEEDS.map((seed, index) => {
    const daysRemaining = seed.daysRemaining;
    const trialEnd = addDays(now, daysRemaining);
    const trialStart = addDays(trialEnd, -TRIAL_LENGTH_DAYS);
    const expired = daysRemaining <= 0;

    const reminders: TrialReminder[] = REMINDER_STEPS.map((step) => {
      const scheduledAt = isoDate(addDays(trialEnd, -step));
      // Sent once we're within `step` days of the end (or past it).
      const sent = daysRemaining <= step;
      return {
        step,
        templateId: TRIAL_EXPIRY_TEMPLATE_ID,
        scheduledAt,
        status: sent ? "sent" : "pending",
      };
    });

    return {
      id: `trial-${index + 1}`,
      facilityName: seed.facilityName,
      tierId: seed.tierId,
      plan: seed.plan,
      adminName: seed.adminName,
      adminEmail: seed.adminEmail,
      trialStart: isoDate(trialStart),
      trialEnd: isoDate(trialEnd),
      daysRemaining,
      status: expired ? "expired" : "active",
      readOnly: expired,
      reminders,
    };
  });

  // Sort by days remaining ascending (most urgent first).
  trials.sort((a, b) => a.daysRemaining - b.daysRemaining);

  const activeCount = trials.filter((t) => t.status === "active").length;
  const expiringIn7 = trials.filter(
    (t) => t.status === "active" && t.daysRemaining > 0 && t.daysRemaining <= 7,
  ).length;

  // Conversion rate for trials that ended this quarter.
  const quarterStart = startOfQuarter(now);
  const ended = QUARTER_OUTCOMES.map((outcome, i) => ({
    outcome,
    endedAt: addDays(now, -(i + 1) * 5),
  })).filter((o) => o.endedAt >= quarterStart && o.endedAt <= now);
  const converted = ended.filter((o) => o.outcome === "converted").length;
  const conversionRateQuarter =
    ended.length > 0 ? Math.round((converted / ended.length) * 100) : 0;

  return {
    trials,
    summary: {
      activeCount,
      expiringIn7,
      conversionRateQuarter,
      convertedThisQuarter: converted,
      endedThisQuarter: ended.length,
    },
  };
}
