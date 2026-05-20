import type {
  Insight,
  InsightOutcome,
  InsightSettings,
} from "@/types/smart-insights";
import { DEFAULT_INSIGHT_SETTINGS } from "@/types/smart-insights";

const SUPPRESSION_DAYS = 14;
const WORSENING_OVERRIDE_PCT = 20;

interface DismissRecord {
  insightId: string;
  dismissedAt: string;
  dismissedBy: string;
}

interface ActionRecord {
  insightId: string;
  actionTakenAt: string;
  outcome?: InsightOutcome;
}

const keys = {
  dismissals: (facilityId: number) => `yipyy:insights:dismissals:${facilityId}`,
  actions: (facilityId: number) => `yipyy:insights:actions:${facilityId}`,
  settings: (facilityId: number) => `yipyy:insights:settings:${facilityId}`,
} as const;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage quota or disabled — fail silently
  }
}

export function getDismissals(facilityId: number): DismissRecord[] {
  return read<DismissRecord[]>(keys.dismissals(facilityId), []);
}

export function recordDismissal(
  facilityId: number,
  insightId: string,
  dismissedBy: string,
): void {
  const all = getDismissals(facilityId).filter(
    (d) => d.insightId !== insightId,
  );
  all.push({
    insightId,
    dismissedAt: new Date().toISOString(),
    dismissedBy,
  });
  write(keys.dismissals(facilityId), all);
}

export function removeDismissal(
  facilityId: number,
  insightId: string,
): void {
  const all = getDismissals(facilityId).filter(
    (d) => d.insightId !== insightId,
  );
  write(keys.dismissals(facilityId), all);
}

export function getActions(facilityId: number): ActionRecord[] {
  return read<ActionRecord[]>(keys.actions(facilityId), []);
}

export function recordAction(
  facilityId: number,
  insightId: string,
  outcome?: InsightOutcome,
): void {
  const all = getActions(facilityId).filter((a) => a.insightId !== insightId);
  all.push({
    insightId,
    actionTakenAt: new Date().toISOString(),
    outcome,
  });
  write(keys.actions(facilityId), all);
}

export function getSettings(facilityId: number): InsightSettings {
  return read<InsightSettings>(
    keys.settings(facilityId),
    DEFAULT_INSIGHT_SETTINGS,
  );
}

export function saveSettings(
  facilityId: number,
  settings: InsightSettings,
): void {
  write(keys.settings(facilityId), settings);
}

/**
 * Per spec § Recalculation & Dismissal: a dismissed insight is suppressed for
 * 14 days unless the underlying metric worsens by more than 20%, in which case
 * it can re-fire immediately. `currentSeverity` and `baselineSeverity` are
 * unitless scores from priority.ts.
 */
export function isSuppressed(
  dismissal: DismissRecord,
  baselineSeverity: number,
  currentSeverity: number,
  now: Date = new Date(),
): boolean {
  const dismissedAt = new Date(dismissal.dismissedAt);
  const daysSince = (now.getTime() - dismissedAt.getTime()) / 86_400_000;
  if (daysSince >= SUPPRESSION_DAYS) return false;
  if (baselineSeverity <= 0) return true;
  const worseningPct =
    ((currentSeverity - baselineSeverity) / baselineSeverity) * 100;
  return worseningPct < WORSENING_OVERRIDE_PCT;
}

/**
 * Merges static insight templates with runtime state from localStorage.
 * Returns a fresh array; safe to render directly.
 */
export function mergeInsightState(
  templates: Insight[],
  facilityId: number,
): Insight[] {
  const dismissals = new Map(
    getDismissals(facilityId).map((d) => [d.insightId, d]),
  );
  const actions = new Map(getActions(facilityId).map((a) => [a.insightId, a]));

  return templates.map((tpl) => {
    const dismissal = dismissals.get(tpl.insightId);
    const action = actions.get(tpl.insightId);

    if (dismissal) {
      return {
        ...tpl,
        status: "dismissed" as const,
        dismissedAt: dismissal.dismissedAt,
        dismissedBy: dismissal.dismissedBy,
      };
    }

    if (action) {
      const merged: Insight = {
        ...tpl,
        actionTakenAt: action.actionTakenAt,
        outcome: action.outcome,
      };
      const takenAt = new Date(action.actionTakenAt);
      const ageMs = Date.now() - takenAt.getTime();
      const dayMs = 86_400_000;

      if (action.outcome) {
        const windowMs = action.outcome.windowDays * dayMs;
        merged.status = ageMs > windowMs ? "resolved" : "monitoring";

        // Simulate progress: in a real backend, `current` would be a live
        // count of qualifying events. Here we deterministically interpolate
        // toward ~60% of target by the end of the window — never auto-completes
        // (real outcomes don't always hit 100%).
        if (action.outcome.target && action.outcome.target > 0) {
          const elapsedDays = ageMs / dayMs;
          const ratio = Math.min(
            1,
            Math.max(0, elapsedDays / action.outcome.windowDays),
          );
          const projected = Math.floor(action.outcome.target * 0.6 * ratio);
          merged.outcome = {
            ...action.outcome,
            current: Math.max(action.outcome.current, projected),
            evaluatedAt: new Date().toISOString(),
          };
        }
      } else {
        merged.status = ageMs > dayMs ? "resolved" : "action_taken";
      }
      return merged;
    }

    return tpl;
  });
}
