// ============================================================================
// Reputation Booster — Step 1: Automated Post-Service Trigger Engine
// ----------------------------------------------------------------------------
// Pure, framework-agnostic logic. Given a checkout event (T0) and the current
// settings, it decides whether a review request may be scheduled, on which
// channel, and for when (T0 + Δt). It also advances scheduled requests to
// "sent" once their send time is due.
// ============================================================================

import type {
  ReputationSettings,
  ReputationRequest,
  ReputationChannel,
  ReputationCheckoutEvent,
  ReputationDelay,
  ReputationSequenceStep,
} from "@/types/reputation";
import { renderStepMessage } from "@/lib/reputation/message-template";

/** Collapse whitespace so a rendered message fits on one audit line. */
function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

// ─── Delay (Δt) resolution ───────────────────────────────────────────────────

const FIXED_DELAY_MINUTES: Record<
  Exclude<ReputationDelay, "custom">,
  number
> = {
  immediate: 0,
  "30min": 30,
  "1hour": 60,
  "3hours": 180,
  "24hours": 1440,
};

/** Resolve the configured send delay (Δt) to minutes. Default 60. */
export function resolveDelayMinutes(settings: ReputationSettings): number {
  if (settings.delay === "custom") {
    return Math.max(0, settings.customDelayMinutes ?? 60);
  }
  return FIXED_DELAY_MINUTES[settings.delay] ?? 60;
}

/** Human-readable description of the configured delay. */
export function describeDelay(settings: ReputationSettings): string {
  switch (settings.delay) {
    case "immediate":
      return "immediately after checkout";
    case "30min":
      return "30 min after checkout";
    case "1hour":
      return "1 hour after checkout";
    case "3hours":
      return "3 hours after checkout";
    case "24hours":
      return "24 hours after checkout";
    case "custom":
      return `${settings.customDelayMinutes ?? 60} min after checkout`;
    default:
      return "after checkout";
  }
}

// ─── Channel resolution ──────────────────────────────────────────────────────

/**
 * Pick the outreach channel honoring the client's preference where possible,
 * then falling back to SMS (highest open rate) and finally email. Returns null
 * when no channel is enabled.
 */
export function resolveChannel(
  settings: ReputationSettings,
  pref?: ReputationChannel,
): ReputationChannel | null {
  const { sms, email } = settings.channels;
  if (pref === "sms" && sms) return "sms";
  if (pref === "email" && email) return "email";
  if (sms) return "sms";
  if (email) return "email";
  return null;
}

export function findTrigger(settings: ReputationSettings, event: string) {
  return settings.triggers.find((t) => t.event === event);
}

// ─── Outreach sequence ───────────────────────────────────────────────────────

/** The configured multi-step sequence, or a single legacy step as fallback. */
export function getSequence(
  settings: ReputationSettings,
): ReputationSequenceStep[] {
  const seq = settings.outreachSequence;
  if (seq && seq.length > 0) return seq;
  return [
    {
      id: "legacy-initial",
      channel: resolveChannel(settings) ?? "email",
      delayMinutes: resolveDelayMinutes(settings),
      onlyIfNoResponse: false,
    },
  ];
}

/** The initial (non-backup) send step. */
export function initialStep(
  settings: ReputationSettings,
): ReputationSequenceStep {
  const seq = getSequence(settings);
  return seq.find((s) => !s.onlyIfNoResponse) ?? seq[0];
}

/** Backup steps (only-if-no-response), ordered by delay. */
export function backupSteps(
  settings: ReputationSettings,
): ReputationSequenceStep[] {
  return getSequence(settings)
    .filter((s) => s.onlyIfNoResponse)
    .sort((a, b) => a.delayMinutes - b.delayMinutes);
}

/** Human-readable phrase for a minute offset from checkout. */
export function describeMinutes(min: number): string {
  if (min <= 0) return "immediately after checkout";
  if (min < 60) return `${min} min after checkout`;
  if (min % 1440 === 0)
    return `${min / 1440} day${min / 1440 > 1 ? "s" : ""} after checkout`;
  if (min % 60 === 0)
    return `${min / 60} hour${min / 60 > 1 ? "s" : ""} after checkout`;
  return `${min} min after checkout`;
}

// ─── Evaluation (protection rules / limits) ──────────────────────────────────

export interface CheckoutEvaluation {
  allowed: boolean;
  reason?: string;
}

const MS_PER_DAY = 86_400_000;

function refTime(r: ReputationRequest): number {
  const iso = r.scheduledSendAt ?? r.sentAt ?? r.checkoutAt ?? "";
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Decide whether a checkout event may produce a review request, applying the
 * master switch, trigger enablement, opt-out, daily send limit and cooldown.
 */
export function evaluateCheckout(params: {
  event: ReputationCheckoutEvent;
  settings: ReputationSettings;
  existing: ReputationRequest[];
  now: Date;
}): CheckoutEvaluation {
  const { event, settings, existing, now } = params;

  if (!settings.enabled) {
    return { allowed: false, reason: "Reputation Booster is turned off" };
  }

  const trigger = findTrigger(settings, event.triggerEvent);
  if (!trigger) {
    return {
      allowed: false,
      reason: `No trigger configured for "${event.triggerEvent}"`,
    };
  }
  if (!trigger.enabled) {
    return {
      allowed: false,
      reason: `Trigger "${trigger.label}" is turned off`,
    };
  }

  if (event.clientOptedOut && settings.protectionRules.blockOnOptOut) {
    return {
      allowed: false,
      reason: "Client has opted out of review requests",
    };
  }

  if (!resolveChannel(settings, event.channelPref)) {
    return { allowed: false, reason: "No delivery channel is enabled" };
  }

  const clientReqs = existing.filter((r) => r.clientId === event.clientId);

  // Daily send limit — count requests already targeting today.
  const todayCount = clientReqs.filter((r) => {
    const t = refTime(r);
    return Number.isFinite(t) && isSameCalendarDay(new Date(t), now);
  }).length;
  if (todayCount >= settings.dailySendLimitPerClient) {
    return {
      allowed: false,
      reason: `Daily send limit (${settings.dailySendLimitPerClient}/day) already reached for this client`,
    };
  }

  // Cooldown — block if a request went to this client within the window.
  const cooldownMs = settings.protectionRules.cooldownDays * MS_PER_DAY;
  if (cooldownMs > 0) {
    const nowMs = now.getTime();
    const recent = clientReqs.some((r) => {
      const t = refTime(r);
      return Number.isFinite(t) && t <= nowMs && nowMs - t < cooldownMs;
    });
    if (recent) {
      return {
        allowed: false,
        reason: `Client is within the ${settings.protectionRules.cooldownDays}-day cooldown window`,
      };
    }
  }

  // Negative-feedback pause — hold off after a recent low rating.
  if (settings.negativePauseDays > 0) {
    const pauseMs = settings.negativePauseDays * MS_PER_DAY;
    const nowMs = now.getTime();
    const paused = clientReqs.some((r) => {
      if (r.rating == null || r.rating >= settings.happyThreshold) return false;
      const t = new Date(r.ratedAt ?? "").getTime();
      return Number.isFinite(t) && t <= nowMs && nowMs - t < pauseMs;
    });
    if (paused) {
      return {
        allowed: false,
        reason: `Client is in the ${settings.negativePauseDays}-day pause after a negative review`,
      };
    }
  }

  return { allowed: true };
}

// ─── Build a scheduled request ───────────────────────────────────────────────

/**
 * Build the review request for an allowed checkout. With a zero delay the
 * request is created already "sent"; otherwise it is "scheduled" for T0 + Δt.
 * Callers should run evaluateCheckout first.
 */
export function buildScheduledRequest(params: {
  event: ReputationCheckoutEvent;
  settings: ReputationSettings;
  now: Date;
}): ReputationRequest {
  const { event, settings, now } = params;
  const step = initialStep(settings);
  // The sequence step's channel is authoritative; only honor an explicit
  // channelPref when it's actually an enabled channel (never smuggle a disabled one).
  const channel =
    event.channelPref &&
    resolveChannel(settings, event.channelPref) === event.channelPref
      ? event.channelPref
      : step.channel;
  const delayMin = Math.max(0, step.delayMinutes);
  const scheduledSendAt = new Date(
    now.getTime() + delayMin * 60_000,
  ).toISOString();
  const id = `rr-live-${event.bookingId}-${now.getTime()}`;
  const sendLabel = new Date(scheduledSendAt).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const auditLog = [
    {
      id: `${id}-t0`,
      timestamp: event.checkoutAt,
      action: `Checkout recorded (T0) — ${event.serviceLabel}`,
    },
    delayMin === 0
      ? {
          id: `${id}-send`,
          timestamp: scheduledSendAt,
          action: `Review request sent via ${channel.toUpperCase()}`,
        }
      : {
          id: `${id}-schedule`,
          timestamp: event.checkoutAt,
          action: `Review request scheduled for ${sendLabel} (${describeMinutes(delayMin)}) via ${channel.toUpperCase()}`,
        },
    {
      id: `${id}-msg`,
      timestamp: scheduledSendAt,
      action: `${channel === "sms" ? "SMS" : "Email"} content: ${oneLine(
        renderStepMessage(
          { ...step, channel },
          {
            id,
            clientName: event.clientName,
            petNames: [event.petName],
            serviceLabel: event.serviceLabel,
            staffName: event.staffName,
            locale: event.locale,
            stackLocales: event.stackLocales,
          },
        ),
      )}`,
    },
  ];

  return {
    id,
    bookingId: event.bookingId,
    clientId: event.clientId,
    clientName: event.clientName,
    petName: event.petName,
    service: event.service,
    serviceLabel: event.serviceLabel,
    staffId: event.staffId,
    staffName: event.staffName,
    channel,
    status: delayMin === 0 ? "sent" : "scheduled",
    // Keep sentAt a real past timestamp until actually sent so scheduled rows
    // never sort/display ahead of genuine sends; processDueRequests stamps the
    // true send time on promotion.
    sentAt: delayMin === 0 ? scheduledSendAt : event.checkoutAt,
    triggerEvent: event.triggerEvent,
    checkoutAt: event.checkoutAt,
    scheduledSendAt,
    locale: event.locale,
    stackLocales: event.stackLocales,
    publicLinkClicked: false,
    remindersCount: 0,
    escalatedToManager: false,
    taskCreated: false,
    isApprovedForPublicDisplay: false,
    isPubliclyDisplayed: false,
    auditLog,
  };
}

// ─── Advance due requests ────────────────────────────────────────────────────

/**
 * Promote any "scheduled" request whose send time has arrived to "sent".
 * Returns a new array plus the ids that changed (empty when nothing was due).
 */
export function processDueRequests(
  requests: ReputationRequest[],
  now: Date,
): { requests: ReputationRequest[]; changedIds: string[] } {
  const nowMs = now.getTime();
  const changedIds: string[] = [];

  const next = requests.map((r) => {
    if (r.status !== "scheduled") return r;
    const t = new Date(r.scheduledSendAt ?? "").getTime();
    if (!Number.isFinite(t) || t > nowMs) return r;

    changedIds.push(r.id);
    const sentAt = r.scheduledSendAt ?? new Date(nowMs).toISOString();
    return {
      ...r,
      status: "sent" as const,
      sentAt,
      auditLog: [
        ...r.auditLog,
        {
          id: `${r.id}-sent`,
          timestamp: sentAt,
          action: `Review request sent via ${r.channel.toUpperCase()}`,
        },
      ],
    };
  });

  return { requests: next, changedIds };
}

// ─── Reminders engine ────────────────────────────────────────────────────────

/**
 * Drive the multi-step outreach sequence for unrated requests: fire each backup
 * step (only-if-no-response) at its delay from checkout (T0) using that step's
 * channel, then close the request once the final step has well passed. Steps
 * fired are tracked by `remindersCount`. `ratedIds` are already-responded.
 */
export function processSequenceReminders(
  requests: ReputationRequest[],
  settings: ReputationSettings,
  now: Date,
  ratedIds: Set<string>,
): { requests: ReputationRequest[]; changedIds: string[] } {
  const backups = backupSteps(settings);
  const changedIds: string[] = [];
  const nowMs = now.getTime();

  const next = requests.map((req) => {
    if (ratedIds.has(req.id) || req.rating != null) return req;
    if (req.status !== "sent" && req.status !== "reminder_sent") return req;

    const t0 = new Date(req.checkoutAt ?? req.sentAt).getTime();
    if (!Number.isFinite(t0)) return req;
    const minsSince = (nowMs - t0) / 60_000;
    const count = req.remindersCount ?? 0;

    // Next pending backup step is due?
    if (count < backups.length) {
      const step = backups[count];
      if (minsSince >= step.delayMinutes) {
        changedIds.push(req.id);
        return {
          ...req,
          status: "reminder_sent" as const,
          remindersCount: count + 1,
          lastReminderAt: now.toISOString(),
          auditLog: [
            ...req.auditLog,
            {
              id: `${req.id}-seq${count + 1}`,
              timestamp: now.toISOString(),
              action: `Backup reminder via ${step.channel.toUpperCase()} (${describeMinutes(step.delayMinutes)}, no response): ${oneLine(
                renderStepMessage(step, {
                  id: req.id,
                  clientName: req.clientName,
                  petNames: [req.petName],
                  serviceLabel: req.serviceLabel,
                  staffName: req.staffName,
                  locale: req.locale,
                  stackLocales: req.stackLocales,
                }),
              )}`,
            },
          ],
        };
      }
      return req;
    }

    // All steps fired — close once the final step is a day past.
    const lastDelay = backups.length
      ? backups[backups.length - 1].delayMinutes
      : initialStep(settings).delayMinutes;
    if (minsSince >= lastDelay + 1440) {
      changedIds.push(req.id);
      return {
        ...req,
        status: "closed" as const,
        auditLog: [
          ...req.auditLog,
          {
            id: `${req.id}-seqclose`,
            timestamp: now.toISOString(),
            action: "Sequence complete — no response, request closed",
          },
        ],
      };
    }
    return req;
  });

  return { requests: next, changedIds };
}

/**
 * Find requests due for the one-time "happy but hasn't clicked through" nudge:
 * rated at/above the happy threshold, never clicked a public link, not yet
 * nudged, and past the configured window. Returns the request ids.
 */
export function findHappyNudges(
  requests: ReputationRequest[],
  settings: ReputationSettings,
  now: Date,
): string[] {
  const r = settings.reminders;
  if (!r || !r.happyNoClickReminderEnabled) return [];
  const nowMs = now.getTime();
  return requests
    .filter((req) => {
      if (req.rating == null || req.rating < settings.happyThreshold)
        return false;
      if (req.publicLinkClicked || req.happyReminderSentAt) return false;
      if (req.status === "closed") return false;
      const ratedMs = new Date(req.ratedAt ?? "").getTime();
      if (!Number.isFinite(ratedMs)) return false;
      return (nowMs - ratedMs) / 3_600_000 >= r.happyNoClickReminderHours;
    })
    .map((req) => req.id);
}
