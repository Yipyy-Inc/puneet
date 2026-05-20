import { smartInsightTemplates } from "@/data/smart-insights";
import {
  getSettings,
  mergeInsightState,
  recordAction,
  recordDismissal,
  removeDismissal,
  saveSettings,
} from "@/lib/smart-insights/storage";
import {
  activeInsights,
  applySettings,
  dismissedInsights,
  isHighPriority,
  sortByPriority,
} from "@/lib/smart-insights/priority";
import type {
  Insight,
  InsightCategory,
  InsightOutcome,
  InsightSettings,
} from "@/types/smart-insights";

function resolveAll(facilityId: number): Insight[] {
  const merged = mergeInsightState(smartInsightTemplates, facilityId);
  const settings = getSettings(facilityId);
  return applySettings(merged, settings);
}

export const insightQueries = {
  all: (facilityId: number) => ({
    queryKey: ["insights", facilityId] as const,
    queryFn: async () => sortByPriority(resolveAll(facilityId)),
  }),
  active: (facilityId: number) => ({
    queryKey: ["insights", facilityId, "active"] as const,
    queryFn: async () => sortByPriority(activeInsights(resolveAll(facilityId))),
  }),
  dismissed: (facilityId: number) => ({
    queryKey: ["insights", facilityId, "dismissed"] as const,
    queryFn: async () => dismissedInsights(resolveAll(facilityId)),
  }),
  byCategory: (facilityId: number, category: InsightCategory) => ({
    queryKey: ["insights", facilityId, "category", category] as const,
    queryFn: async () =>
      sortByPriority(
        activeInsights(resolveAll(facilityId)).filter(
          (i) => i.category === category,
        ),
      ),
  }),
  highPriorityCount: (facilityId: number) => ({
    queryKey: ["insights", facilityId, "high-priority-count"] as const,
    queryFn: async () =>
      activeInsights(resolveAll(facilityId)).filter(isHighPriority).length,
  }),
  dashboardTop3: (facilityId: number) => ({
    queryKey: ["insights", facilityId, "dashboard-top-3"] as const,
    queryFn: async () =>
      sortByPriority(activeInsights(resolveAll(facilityId))).slice(0, 3),
  }),
  settings: (facilityId: number) => ({
    queryKey: ["insights", facilityId, "settings"] as const,
    queryFn: async () => getSettings(facilityId),
  }),
};

export const insightMutations = {
  dismiss: async (params: {
    facilityId: number;
    insightId: string;
    dismissedBy: string;
  }): Promise<void> => {
    recordDismissal(params.facilityId, params.insightId, params.dismissedBy);
  },
  restore: async (params: {
    facilityId: number;
    insightId: string;
  }): Promise<void> => {
    removeDismissal(params.facilityId, params.insightId);
  },
  markActionTaken: async (params: {
    facilityId: number;
    insightId: string;
    outcome?: InsightOutcome;
  }): Promise<void> => {
    recordAction(params.facilityId, params.insightId, params.outcome);
  },
  updateSettings: async (params: {
    facilityId: number;
    settings: InsightSettings;
  }): Promise<void> => {
    saveSettings(params.facilityId, params.settings);
  },
};
