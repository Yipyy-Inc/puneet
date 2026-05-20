"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { insightMutations, insightQueries } from "@/lib/api/smart-insights";
import type { Insight } from "@/types/smart-insights";
import { InsightCardCompact } from "@/components/smart-insights/InsightCardCompact";
import { InsightActionDrawer } from "@/components/smart-insights/drawer/InsightActionDrawer";

const FACILITY_ID = 11;
const CURRENT_USER = "Marie Tremblay";
const UNDO_WINDOW_MS = 10_000;

/**
 * Spec 10.1 Dashboard widget. Shows up to 3 highest-priority active insights
 * below the Live Activity Board (BookingsBoard). Dismiss + Take Action work
 * the same as the main Smart Insights page.
 */
export function SmartInsightsWidget() {
  const [drawerInsight, setDrawerInsight] = useState<Insight | null>(null);

  const queryClient = useQueryClient();
  const top3Query = useQuery(insightQueries.dashboardTop3(FACILITY_ID));
  const highPriorityQuery = useQuery(
    insightQueries.highPriorityCount(FACILITY_ID),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["insights", FACILITY_ID] });

  const dismissMutation = useMutation({
    mutationFn: insightMutations.dismiss,
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: insightMutations.restore,
    onSuccess: invalidate,
  });

  const handleDismiss = (insight: Insight) => {
    dismissMutation.mutate(
      {
        facilityId: FACILITY_ID,
        insightId: insight.insightId,
        dismissedBy: CURRENT_USER,
      },
      {
        onSuccess: () => {
          toast(`Dismissed: ${insight.title}`, {
            duration: UNDO_WINDOW_MS,
            action: {
              label: "Undo",
              onClick: () =>
                restoreMutation.mutate({
                  facilityId: FACILITY_ID,
                  insightId: insight.insightId,
                }),
            },
          });
        },
      },
    );
  };

  const insights = top3Query.data ?? [];
  const highPriorityCount = highPriorityQuery.data ?? 0;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-amber-500" />
          <h3 className="text-base font-semibold">Smart Insights</h3>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {highPriorityCount} High
            </Badge>
          )}
        </div>
        <Link
          href="/facility/dashboard/insights"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          View all insights
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {top3Query.isLoading ? (
        <p className="text-muted-foreground py-4 text-center text-xs">
          Loading…
        </p>
      ) : insights.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed py-6 text-center text-xs">
          No active insights right now.
        </div>
      ) : (
        <div className="grid gap-2">
          {insights.map((insight) => (
            <InsightCardCompact
              key={insight.insightId}
              insight={insight}
              onDismiss={handleDismiss}
              onTakeAction={(i) => setDrawerInsight(i)}
            />
          ))}
        </div>
      )}

      <InsightActionDrawer
        facilityId={FACILITY_ID}
        insight={drawerInsight}
        onClose={() => setDrawerInsight(null)}
      />
    </Card>
  );
}
