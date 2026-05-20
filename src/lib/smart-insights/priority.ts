import type {
  Insight,
  InsightPriority,
  InsightSettings,
} from "@/types/smart-insights";

/**
 * Severity is a unitless score used for the 20%-worsening dismissal override
 * check (storage.ts → isSuppressed). It collapses the three impact axes —
 * revenue, operational risk, customer retention — into a single magnitude per
 * spec § Scoring and Priority System.
 *
 * The mock data ships a static `priority` so this is mainly a hook for when
 * a backend computes real scores; we still want a number we can compare across
 * regenerations of the same insight.
 */
export function computeSeverity(insight: Insight): number {
  const priorityWeight: Record<InsightPriority, number> = {
    high: 100,
    medium: 50,
    low: 20,
  };
  return priorityWeight[insight.priority];
}

export function isHighPriority(insight: Insight): boolean {
  return insight.priority === "high" && insight.status === "active";
}

/**
 * Apply user-defined threshold overrides. For the mock layer this only filters
 * the visible set — a real backend would re-run analysis with the overridden
 * thresholds. We keep the wiring so the UI behaves correctly today.
 */
export function applySettings(
  insights: Insight[],
  settings: InsightSettings,
): Insight[] {
  if (!settings.enabled) return [];
  return insights.filter((i) => settings.categoriesEnabled[i.category]);
}

export function sortByPriority(insights: Insight[]): Insight[] {
  const rank: Record<InsightPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...insights].sort((a, b) => {
    const byPriority = rank[a.priority] - rank[b.priority];
    if (byPriority !== 0) return byPriority;
    return (
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  });
}

export function activeInsights(insights: Insight[]): Insight[] {
  return insights.filter(
    (i) =>
      i.status === "active" ||
      i.status === "action_taken" ||
      i.status === "monitoring",
  );
}

export function dismissedInsights(insights: Insight[]): Insight[] {
  return insights.filter((i) => i.status === "dismissed");
}
