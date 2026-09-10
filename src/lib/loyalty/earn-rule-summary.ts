import type { EarnRule } from "@/types/loyalty";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateShort,
  formatList,
  formatMoney,
  formatNumber,
  formatPercent,
  formatWeekday,
} from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";

const SERVICE_NOUN: Record<string, string> = {
  daycare: "daycare visit",
  grooming: "grooming appointment",
  training: "training class",
  boarding: "boarding stay",
  spa: "spa visit",
  walking: "walk",
};

// English dates and weekdays through `Intl` as well: the weekday array and the
// "en-US" date that were here are what `formatWeekday` and `formatDateShort`
// exist to replace (§5q).
const DAY_NAMES = [0, 1, 2, 3, 4, 5, 6].map((d) => formatWeekday(d, "en"));

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return formatDateShort(new Date(y, m - 1, d), "en");
}

function rewardPhrase(rule: EarnRule): string {
  const v = rule.rewardValue;
  switch (rule.rewardType) {
    case "points":
      return `${v} ${v === 1 ? "point" : "points"}`;
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

// ---------------------------------------------------------------------------
// Customer-facing variant — second person, imperative, for the loyalty portal's
// "How Points Are Earned" section.
// ---------------------------------------------------------------------------

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The earning action, second person. A single service is folded into the verb
 *  ("per daycare visit") for visit/service triggers. */
function customerTriggerPhrase(
  rule: EarnRule,
  serviceLower: string | null,
): string {
  const v = rule.triggerValue;
  switch (rule.triggerType) {
    case "spend_amount":
      return `per $${v && v > 0 ? v : 1} spent`;
    case "booking_completed":
      return "per completed booking";
    case "visit_count":
      return v && v > 1
        ? `every ${v} visits`
        : serviceLower
          ? `per ${serviceLower} visit`
          : "per visit";
    case "service_type":
      return serviceLower ? `per ${serviceLower} visit` : "per visit";
    case "first_booking":
      return "on your first booking";
    case "birthday":
      return "on your birthday";
    case "referral_completed":
      return "per successful referral";
    case "review_submitted":
      return "per review you leave";
    case "app_download":
      return "when you download the app";
    case "manual":
      return "as a special bonus";
  }
}

function customerSchedulePhrase(rule: EarnRule): string {
  if (rule.scheduleType === "date_range") {
    const c = rule.scheduleConfig;
    const start = fmtDate(c?.startDate);
    const end = fmtDate(c?.endDate);
    if (start && end) return `${start}–${end}`;
    if (start) return `from ${start}`;
    if (end) return `until ${end}`;
    return "limited time";
  }
  if (rule.scheduleType === "recurring_days") {
    const days = rule.scheduleConfig?.daysOfWeek;
    if (days && days.length) {
      return [...days]
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d])
        .filter(Boolean)
        .join(", ");
    }
    return "select days";
  }
  return "all year";
}

function customerServicesPhrase(services: string[] | null): string | null {
  if (!services || services.length === 0) return null;
  const names = services.map(cap);
  return names.length === 1
    ? `applies to ${names[0]} only`
    : `applies to ${names.join(", ")}`;
}

// ---------------------------------------------------------------------------
// The same one-liner in French (§5q).
//
// Built as its own grammar rather than by translating the English fragments:
// French puts the amount after the noun ("10 $ de crédit"), agrees an
// adjective with a service it cannot see the gender of, and says "par tranche
// de 1 $ dépensé" where English says "per $1 spent". So a service is named in
// parentheses — "un service gratuit (Toilettage)" — rather than inflected,
// and money, percentages, dates and weekdays come from `Intl`. The facility's
// own service ids pass through `serviceTypeLabel`, which returns a name the
// facility typed unchanged.
// ---------------------------------------------------------------------------

function frRewardPhrase(rule: EarnRule): string {
  const v = rule.rewardValue;
  const money = (n: number) =>
    formatMoney(n, "fr", { whole: Number.isInteger(n) });
  switch (rule.rewardType) {
    case "points":
      return `${formatNumber(v, "fr")} ${v === 1 ? "point" : "points"}`;
    case "credit":
      return `${money(v)} de crédit`;
    case "gift_card":
      return `une carte-cadeau de ${money(v)}`;
    case "discount_pct":
      return `${formatPercent(v, "fr")} de rabais`;
    case "discount_fixed":
      return `${money(v)} de rabais`;
    case "freebie": {
      const s = rule.appliesToServiceTypes?.[0];
      return s
        ? `un service gratuit (${serviceTypeLabel("fr", s)})`
        : "un service gratuit";
    }
  }
}

function frTriggerPhrase(rule: EarnRule, service: string | null): string {
  const v = rule.triggerValue;
  const label = service ? serviceTypeLabel("fr", service) : null;
  switch (rule.triggerType) {
    case "spend_amount":
      return `par tranche de ${formatMoney(v && v > 0 ? v : 1, "fr", { whole: true })} dépensé`;
    case "booking_completed":
      return "par réservation terminée";
    case "visit_count":
      return v && v > 1
        ? `toutes les ${v} visites`
        : label
          ? `par visite (${label})`
          : "par visite";
    case "service_type":
      return label ? `par visite (${label})` : "par visite";
    case "first_booking":
      return "à votre première réservation";
    case "birthday":
      return "à votre anniversaire";
    case "referral_completed":
      return "par parrainage réussi";
    case "review_submitted":
      return "par avis laissé";
    case "app_download":
      return "en téléchargeant l’application";
    case "manual":
      return "en prime spéciale";
  }
}

function frSchedulePhrase(rule: EarnRule): string {
  if (rule.scheduleType === "date_range") {
    const c = rule.scheduleConfig;
    const start = c?.startDate ? formatDateShort(c.startDate, "fr") : "";
    const end = c?.endDate ? formatDateShort(c.endDate, "fr") : "";
    if (start && end) return `du ${start} au ${end}`;
    if (start) return `à partir du ${start}`;
    if (end) return `jusqu’au ${end}`;
    return "durée limitée";
  }
  if (rule.scheduleType === "recurring_days") {
    const days = rule.scheduleConfig?.daysOfWeek;
    if (days && days.length) {
      return formatList(
        [...days]
          .sort((a, b) => a - b)
          .map((d) => formatWeekday(d, "fr", "long")),
        "fr",
      );
    }
    return "certains jours";
  }
  return "toute l’année";
}

function frServicesPhrase(services: string[] | null): string | null {
  if (!services || services.length === 0) return null;
  const names = services.map((s) => serviceTypeLabel("fr", s));
  return names.length === 1
    ? `${names[0]} seulement`
    : `s’applique à : ${formatList(names, "fr")}`;
}

/**
 * Customer-facing one-liner for an earn rule, e.g.
 * "Earn 50 points per daycare visit (applies to Daycare only, all year)" ·
 * "Obtenez 50 points par visite (Garderie) (Garderie seulement, toute
 * l’année)". `locale` defaults to English for the staff-side callers.
 */
export function earnRuleCustomerSummary(
  rule: EarnRule,
  locale: AppLocale = "en",
): string {
  if (locale === "fr") {
    const service =
      rule.appliesToServiceTypes?.length === 1
        ? rule.appliesToServiceTypes[0]
        : null;
    const paren = [
      frServicesPhrase(rule.appliesToServiceTypes),
      frSchedulePhrase(rule),
    ]
      .filter((p): p is string => Boolean(p))
      .join(", ");
    return `Obtenez ${frRewardPhrase(rule)} ${frTriggerPhrase(rule, service)} (${paren})`;
  }
  const serviceLower =
    rule.appliesToServiceTypes?.length === 1
      ? rule.appliesToServiceTypes[0]
      : null;
  const main = `Earn ${rewardPhrase(rule)} ${customerTriggerPhrase(rule, serviceLower)}`;
  const paren = [
    customerServicesPhrase(rule.appliesToServiceTypes),
    customerSchedulePhrase(rule),
  ]
    .filter((p): p is string => Boolean(p))
    .join(", ");
  return `${main} (${paren})`;
}

/** Active, customer-relevant earn rules (excludes archived/disabled rules and
 *  staff-only "manual" awards). */
export function activeCustomerEarnRules(rules: EarnRule[]): EarnRule[] {
  return rules.filter(
    (r) => r.enabled && r.status !== "archived" && r.triggerType !== "manual",
  );
}
