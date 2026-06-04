import type {
  EarnRule,
  EarnRuleTriggerType,
  EarnRuleRewardType,
  FacilityLoyaltyConfig,
} from "@/types/loyalty";
import type { LoyaltyEvent } from "./engine";

/**
 * Pure earn-rule evaluation for the loyalty automation engine. Given an event
 * and a facility's *active* earn rules, work out every reward that fires — with
 * no I/O, no mutation, and no clock access (the event carries its own
 * timestamp). This is the "earning points" half of the engine.
 */

export interface EarnOutcome {
  rule: EarnRule;
  rewardType: EarnRuleRewardType;
  /** Points added to the balance (0 for non-points rewards). */
  points: number;
  /** Account credit ($) added (0 for non-credit rewards). */
  credit: number;
  /** Non-balance perk granted (gift card / discount / freebie), if any. */
  perk?: { type: EarnRuleRewardType; value: number };
  description: string;
}

export interface EarnComputeContext {
  /** Earning multiplier from the customer's current tier (1 = no boost). */
  tierMultiplier: number;
  /** The visit number this event represents (account.totalVisits + 1) — used to
   *  fire visit-count milestone rules exactly on the milestone visit. */
  visitNumber: number;
}

/** Triggers whose points earnings are boosted by the customer's tier multiplier.
 *  One-off bonuses (birthday, referral, review, first booking, app download,
 *  manual) are awarded at face value. */
const MULTIPLIER_TRIGGERS: ReadonlySet<EarnRuleTriggerType> = new Set([
  "spend_amount",
  "booking_completed",
  "service_type",
  "visit_count",
]);

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function parseHHmm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Whether the rule's schedule window admits an event at `occurredAt`. */
export function matchesSchedule(rule: EarnRule, occurredAt: string): boolean {
  if (rule.scheduleType === "always") return true;
  const cfg = rule.scheduleConfig;
  if (!cfg) return true;

  if (rule.scheduleType === "date_range") {
    const key = dateKey(occurredAt);
    if (cfg.startDate && key < cfg.startDate) return false;
    if (cfg.endDate && key > cfg.endDate) return false;
    return true;
  }

  if (rule.scheduleType === "recurring_days") {
    if (cfg.daysOfWeek && cfg.daysOfWeek.length > 0) {
      const dow = new Date(occurredAt).getUTCDay();
      if (!cfg.daysOfWeek.includes(dow)) return false;
    }
    if (cfg.startTime || cfg.endTime) {
      const mins = minutesOfDay(occurredAt);
      if (cfg.startTime && mins < parseHHmm(cfg.startTime)) return false;
      if (cfg.endTime && mins > parseHHmm(cfg.endTime)) return false;
    }
    return true;
  }

  return true;
}

/** Service-vs-retail scope gate from the facility's points-scope config. Only
 *  spend/booking/service earnings are scoped; lifecycle bonuses are not. */
function eventInScope(config: FacilityLoyaltyConfig, event: LoyaltyEvent): boolean {
  const scope = config.pointsScope;
  if (!scope?.enabled) return true;
  if (scope.scope === "services_only" && event.isService === false) return false;
  if (scope.scope === "retail_only" && event.isService) return false;
  return true;
}

/** Does this event trigger this rule, ignoring schedule/scope? */
function eventMatchesTrigger(
  rule: EarnRule,
  event: LoyaltyEvent,
  ctx: EarnComputeContext,
): boolean {
  switch (rule.triggerType) {
    case "spend_amount":
      return (
        (event.type === "booking_completed" || event.type === "purchase") &&
        (event.amount ?? 0) > 0
      );
    case "booking_completed":
      return event.type === "booking_completed";
    case "service_type":
      return (
        event.type === "booking_completed" &&
        !!event.serviceType &&
        !!rule.appliesToServiceTypes &&
        rule.appliesToServiceTypes.includes(event.serviceType)
      );
    case "visit_count":
      return (
        event.type === "booking_completed" &&
        rule.triggerValue != null &&
        ctx.visitNumber === rule.triggerValue
      );
    case "first_booking":
      return event.type === "booking_completed" && event.isFirstBooking === true;
    case "referral_completed":
      return event.type === "referral_completed";
    case "review_submitted":
      return event.type === "review_submitted";
    case "birthday":
      return event.type === "birthday";
    case "app_download":
      return event.type === "app_download";
    case "manual":
      return event.type === "manual_award";
  }
}

/** Base reward value (pre-multiplier) for a matched rule. */
function baseRewardValue(rule: EarnRule, event: LoyaltyEvent): number {
  if (rule.triggerType === "spend_amount") {
    const amt = event.amount ?? 0;
    const unit = rule.triggerValue && rule.triggerValue > 0 ? rule.triggerValue : 1;
    const units = Math.floor(amt / unit);
    return units * rule.rewardValue;
  }
  return rule.rewardValue;
}

function describe(rule: EarnRule, points: number, credit: number): string {
  if (points > 0) return `Earned ${points} points — ${rule.name}`;
  if (credit > 0) return `Earned $${credit} credit — ${rule.name}`;
  return rule.name;
}

/**
 * Evaluate every active earn rule against the event and return the rewards that
 * fire. Caller passes only *active* rules (see getActiveEarnRules); archived
 * rules are skipped defensively.
 */
export function computeEarnings(
  rules: EarnRule[],
  event: LoyaltyEvent,
  config: FacilityLoyaltyConfig,
  ctx: EarnComputeContext,
): EarnOutcome[] {
  const outcomes: EarnOutcome[] = [];

  for (const rule of rules) {
    if (!rule.enabled || rule.status === "archived") continue;
    if (!eventMatchesTrigger(rule, event, ctx)) continue;
    if (!matchesSchedule(rule, event.occurredAt)) continue;

    const scoped =
      rule.triggerType === "spend_amount" ||
      rule.triggerType === "booking_completed" ||
      rule.triggerType === "service_type";
    if (scoped && !eventInScope(config, event)) continue;

    const value = baseRewardValue(rule, event);
    if (value <= 0) continue;

    if (rule.rewardType === "points") {
      const boosted = MULTIPLIER_TRIGGERS.has(rule.triggerType)
        ? Math.floor(value * ctx.tierMultiplier)
        : value;
      outcomes.push({
        rule,
        rewardType: "points",
        points: boosted,
        credit: 0,
        description: describe(rule, boosted, 0),
      });
    } else if (rule.rewardType === "credit") {
      outcomes.push({
        rule,
        rewardType: "credit",
        points: 0,
        credit: value,
        description: describe(rule, 0, value),
      });
    } else {
      outcomes.push({
        rule,
        rewardType: rule.rewardType,
        points: 0,
        credit: 0,
        perk: { type: rule.rewardType, value },
        description: `${rule.name} unlocked`,
      });
    }
  }

  return outcomes;
}
