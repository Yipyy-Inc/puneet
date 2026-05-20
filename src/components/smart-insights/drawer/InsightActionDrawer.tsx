"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Construction } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { insightMutations } from "@/lib/api/smart-insights";
import type { Insight, InsightOutcome } from "@/types/smart-insights";
import { DrawerHeader } from "./shared/DrawerHeader";
import { getPanelForActionType } from "./actionPanelRegistry";

interface Props {
  facilityId: number;
  insight: Insight | null;
  onClose: () => void;
}

export function InsightActionDrawer({ facilityId, insight, onClose }: Props) {
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: insightMutations.markActionTaken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", facilityId] });
    },
  });

  const handleComplete = (outcome?: InsightOutcome) => {
    if (!insight) return;
    completeMutation.mutate(
      {
        facilityId,
        insightId: insight.insightId,
        outcome,
      },
      {
        onSuccess: () => {
          toast.success(
            outcome
              ? `${insight.title} — monitoring ${outcome.windowDays}-day outcome`
              : `${insight.title} — action taken`,
          );
          onClose();
        },
      },
    );
  };

  const Panel = insight ? getPanelForActionType(insight.actionType) : null;

  return (
    <Dialog open={insight !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        {insight && (
          <>
            <DrawerHeader insight={insight} />
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {Panel ? (
                <Panel
                  insight={insight}
                  onComplete={handleComplete}
                  onCancel={onClose}
                />
              ) : (
                <ComingSoonPanel actionType={insight.actionType} />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ComingSoonPanel({ actionType }: { actionType: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
      <Construction className="text-muted-foreground size-12" />
      <div>
        <p className="font-semibold">Action panel coming soon</p>
        <p className="text-muted-foreground mt-1 text-sm">
          The drawer for action type{" "}
          <code className="bg-muted rounded px-1 text-xs">{actionType}</code>{" "}
          arrives in Phase 5.
        </p>
      </div>
      <Button variant="outline" size="sm" disabled>
        Take Action
      </Button>
    </div>
  );
}
