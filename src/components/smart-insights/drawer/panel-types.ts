import type { Insight, InsightOutcome } from "@/types/smart-insights";

export interface InsightPanelProps {
  insight: Insight;
  onComplete: (outcome?: InsightOutcome) => void;
  onCancel: () => void;
}

export type InsightPanelComponent = (
  props: InsightPanelProps,
) => React.ReactElement | null;
