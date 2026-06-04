import type { EarnRule } from "@/types/loyalty";

/**
 * Earn-rule versioning. Editing a *substantive* part of an earn rule (its
 * trigger, reward, scope, or schedule) must not retroactively change historical
 * point totals. So on save we archive the old record and create a new active
 * one; cosmetic edits (name / enabled toggle) apply in place; deletions archive
 * rather than remove. Archived records are never mutated, and transactions
 * reference the earnRuleId they were created under.
 */

export function isActiveEarnRule(rule: EarnRule): boolean {
  return rule.status !== "archived";
}

export function getActiveEarnRules(rules: EarnRule[]): EarnRule[] {
  return rules.filter(isActiveEarnRule);
}

export function getArchivedEarnRules(rules: EarnRule[]): EarnRule[] {
  return rules.filter((r) => r.status === "archived");
}

/** Fields whose change requires a new version (history-affecting). */
const SUBSTANTIVE_KEYS: (keyof EarnRule)[] = [
  "triggerType",
  "triggerValue",
  "rewardType",
  "rewardValue",
  "appliesToServiceTypes",
  "scheduleType",
  "scheduleConfig",
];

/**
 * Canonicalize a value for order-insensitive comparison: arrays are sorted
 * (the substantive array fields — appliesToServiceTypes, scheduleConfig.
 * daysOfWeek — are sets where order is meaningless) and object keys sorted, so a
 * cosmetic reorder (e.g. remove + re-add a service) is not treated as a change.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((a, b) =>
        JSON.stringify(a) < JSON.stringify(b) ? -1 : 1,
      );
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value ?? null;
}

export function earnRuleSubstantivelyChanged(
  a: EarnRule,
  b: EarnRule,
): boolean {
  return SUBSTANTIVE_KEYS.some(
    (k) =>
      JSON.stringify(canonicalize(a[k])) !==
      JSON.stringify(canonicalize(b[k])),
  );
}

let versionCounter = 0;
function newEarnRuleId(): string {
  versionCounter += 1;
  return `earn-v${Date.now()}-${versionCounter}`;
}

/**
 * Reconcile the edited active earn rules against the full stored set,
 * preserving history. Returns the new full list to persist:
 * - archived records are carried over untouched;
 * - a substantively-changed active rule → old archived + brand-new active record;
 * - a cosmetic-only edit (name/enabled) → same record id, updated in place;
 * - a brand-new rule → active with createdAt;
 * - an active rule removed in the editor → archived (not deleted).
 */
export function reconcileEarnRules(
  stored: EarnRule[],
  editedActive: EarnRule[],
): EarnRule[] {
  const now = new Date().toISOString();
  const archived = getArchivedEarnRules(stored);
  const storedActive = getActiveEarnRules(stored);
  const storedActiveById = new Map(storedActive.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const result: EarnRule[] = [...archived];

  for (const edited of editedActive) {
    const old = storedActiveById.get(edited.id);
    if (old) {
      seen.add(edited.id);
      if (earnRuleSubstantivelyChanged(old, edited)) {
        result.push({ ...old, status: "archived", archivedAt: now });
        result.push({
          ...edited,
          id: newEarnRuleId(),
          status: "active",
          archivedAt: undefined,
          createdAt: now,
          replacesRuleId: old.id,
        });
      } else {
        result.push({ ...edited, status: "active", archivedAt: undefined });
      }
    } else {
      result.push({
        ...edited,
        status: "active",
        archivedAt: undefined,
        createdAt: edited.createdAt ?? now,
      });
    }
  }

  for (const old of storedActive) {
    if (!seen.has(old.id)) {
      result.push({ ...old, status: "archived", archivedAt: now });
    }
  }

  return result;
}
