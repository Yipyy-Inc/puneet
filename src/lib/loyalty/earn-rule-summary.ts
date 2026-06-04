import type { EarnRule } from "@/types/loyalty";

const SERVICE_NOUN: Record<string, string> = {
  daycare: "daycare visit",
  grooming: "grooming appointment",
  training: "training class",
  boarding: "boarding stay",
  spa: "spa visit",
  walking: "walk",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function rewardPhrase(rule: EarnRule): string {
  const v = rule.rewardValue;
  switch (rule.rewardType) {
    case "points":
      return `${v} points`;
    case "credit":
      return `$${v} account credit`;
    case "gift_card":
      return `a $${v} gift card`;
    case "discount_pct":
      return `${v}% off`;
    case "discount_fixed":
      return `$${v} off`;
    case "freebie": {
      const s = rule.appliesToServiceTypes?.[0];
      return s ? `a free ${s}` : "a free service";
    }
  }
}

function triggerPhrase(rule: EarnRule): string {
  switch (rule.triggerType) {
    case "spend_amount":
      return "for every $1 spent";
    case "booking_completed":
      return "for every completed booking";
    case "service_type": {
      const s = rule.appliesToServiceTypes?.[0];
      const noun = (s && SERVICE_NOUN[s]) || `${s ?? "service"} visit`;
      return `for every ${noun}`;
    }
    case "visit_count":
      return "for every visit";
    case "birthday":
      return "on their birthday";
    case "first_booking":
      return "on their first booking";
    case "referral_completed":
      return "when a referral completes";
    case "review_submitted":
      return "when they leave a review";
    case "app_download":
      return "when they download the app";
    case "manual":
      return "when awarded by staff";
  }
}

/** Service scope is only phrased for spend/booking triggers; service-specific
 *  triggers already name the service in their trigger phrase. */
function appliesToPhrase(rule: EarnRule): string {
  if (
    rule.triggerType !== "spend_amount" &&
    rule.triggerType !== "booking_completed"
  ) {
    return "";
  }
  const svc = rule.appliesToServiceTypes;
  if (!svc || svc.length === 0) return "";
  return ` on ${svc.join(", ")}`;
}

function schedulePhrase(rule: EarnRule): string {
  if (rule.scheduleType === "date_range") {
    const c = rule.scheduleConfig;
    if (c?.startDate && c?.endDate) {
      return `, from ${fmtDate(c.startDate)} to ${fmtDate(c.endDate)}`;
    }
    return ", during a set date range";
  }
  if (rule.scheduleType === "recurring_days") {
    const days = rule.scheduleConfig?.daysOfWeek;
    if (days && days.length) {
      const names = [...days]
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d])
        .filter(Boolean);
      return `, on ${names.join(", ")}`;
    }
    return ", on selected days";
  }
  return ", all year round";
}

/**
 * Plain-English description of an earn rule, e.g.
 * "Customers earn 10 points for every $1 spent on grooming, all year round."
 */
export function summarizeEarnRule(rule: EarnRule): string {
  if (rule.triggerType === "manual") {
    return `Staff can manually award ${rewardPhrase(rule)}.`;
  }
  const verb =
    rule.rewardType === "points" ||
    rule.rewardType === "credit" ||
    rule.rewardType === "gift_card"
      ? "earn"
      : "get";
  return `Customers ${verb} ${rewardPhrase(rule)} ${triggerPhrase(rule)}${appliesToPhrase(rule)}${schedulePhrase(rule)}.`;
}
