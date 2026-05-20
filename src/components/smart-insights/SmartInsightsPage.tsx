"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { insightMutations, insightQueries } from "@/lib/api/smart-insights";
import { InsightActionDrawer } from "@/components/smart-insights/drawer/InsightActionDrawer";
import {
  activeInsights,
  dismissedInsights,
} from "@/lib/smart-insights/priority";
import type { Insight, InsightCategory } from "@/types/smart-insights";
import { InsightsHeader } from "@/components/smart-insights/InsightsHeader";
import {
  CategoryFilterBar,
  type CategoryFilter,
} from "@/components/smart-insights/CategoryFilterBar";
import { InsightCard } from "@/components/smart-insights/InsightCard";
import { DismissedInsightsView } from "@/components/smart-insights/DismissedInsightsView";
import {
  LocationFilter,
  LOCATION_FILTER_ALL,
} from "@/components/smart-insights/LocationFilter";
import { useLocationContext } from "@/hooks/use-location-context";

const FACILITY_ID = 11;
const CURRENT_USER = "Marie Tremblay";
const UNDO_WINDOW_MS = 10_000;

export function SmartInsightsPage() {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>(
    LOCATION_FILTER_ALL,
  );
  const [drawerInsight, setDrawerInsight] = useState<Insight | null>(null);

  const { isHQView, isMultiLocation, locations, currentLocationId } =
    useLocationContext();

  const queryClient = useQueryClient();
  const allQuery = useQuery(insightQueries.all(FACILITY_ID));

  const insights = allQuery.data ?? [];

  // When not in HQ View, scope to the currently-selected location only.
  // In HQ View, the LocationFilter dropdown controls scoping.
  const locationScoped = useMemo(() => {
    if (isHQView) {
      if (locationFilter === LOCATION_FILTER_ALL) return insights;
      return insights.filter((i) => i.locationId === locationFilter);
    }
    if (currentLocationId) {
      return insights.filter((i) => i.locationId === currentLocationId);
    }
    return insights;
  }, [insights, isHQView, locationFilter, currentLocationId]);

  const active = useMemo(() => activeInsights(locationScoped), [locationScoped]);
  const dismissed = useMemo(
    () => dismissedInsights(locationScoped),
    [locationScoped],
  );

  const invalidateInsights = () => {
    queryClient.invalidateQueries({ queryKey: ["insights", FACILITY_ID] });
  };

  const dismissMutation = useMutation({
    mutationFn: insightMutations.dismiss,
    onSuccess: invalidateInsights,
  });

  const restoreMutation = useMutation({
    mutationFn: insightMutations.restore,
    onSuccess: invalidateInsights,
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

  const handleRestore = (insight: Insight) => {
    restoreMutation.mutate(
      {
        facilityId: FACILITY_ID,
        insightId: insight.insightId,
      },
      {
        onSuccess: () => {
          toast.success(`Re-activated: ${insight.title}`);
        },
      },
    );
  };

  const counts = useMemo(() => {
    const c: Record<CategoryFilter, number> = {
      all: active.length,
      revenue: 0,
      operations: 0,
      customers: 0,
      staff: 0,
      marketing: 0,
    };
    for (const insight of active) {
      c[insight.category] += 1;
    }
    return c;
  }, [active]);

  const visible = useMemo(() => {
    if (filter === "all") return active;
    return active.filter((i) => i.category === filter);
  }, [active, filter]);

  const highPriorityCount = useMemo(
    () => active.filter((i) => i.priority === "high").length,
    [active],
  );

  return (
    <div className="space-y-5">
      <InsightsHeader highPriorityCount={highPriorityCount} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryFilterBar value={filter} onChange={setFilter} counts={counts} />
        {isHQView && isMultiLocation && (
          <LocationFilter
            value={locationFilter}
            onChange={setLocationFilter}
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          />
        )}
      </div>

      {allQuery.isLoading ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Loading insights…
        </p>
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} totalActive={active.length} />
      ) : (
        <div className="grid gap-5">
          {visible.map((insight) => (
            <InsightCard
              key={insight.insightId}
              insight={insight}
              showLocation={isHQView}
              onDismiss={handleDismiss}
              onTakeAction={(i) => setDrawerInsight(i)}
            />
          ))}
        </div>
      )}

      <DismissedInsightsView
        dismissed={dismissed}
        onRestore={handleRestore}
      />

      <InsightActionDrawer
        facilityId={FACILITY_ID}
        insight={drawerInsight}
        onClose={() => setDrawerInsight(null)}
      />
    </div>
  );
}

function EmptyState({
  filter,
  totalActive,
}: {
  filter: CategoryFilter;
  totalActive: number;
}) {
  if (totalActive === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
        <Sparkles className="mx-auto mb-3 size-8 text-amber-400" />
        <p className="font-medium">No active insights right now.</p>
        <p className="mt-1 text-sm">
          New recommendations are generated overnight at 3 AM facility local
          time.
        </p>
      </div>
    );
  }
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
      No insights in the{" "}
      <span className="font-medium capitalize">{filter}</span> category. Try
      another tab.
    </div>
  );
}

const CATEGORIES: InsightCategory[] = [
  "revenue",
  "operations",
  "customers",
  "staff",
  "marketing",
];

export { CATEGORIES };
