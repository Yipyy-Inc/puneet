"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useHydrated } from "@/hooks/use-hydrated";
import { clients } from "@/data/clients";
import {
  computeLifecycleFunnel,
  type FunnelStage,
} from "@/lib/loyalty/lifecycle-funnel";

const NOW_ISO = new Date().toISOString();

function clientName(id: number): string {
  return clients.find((c) => c.id === id)?.name ?? `Client #${id}`;
}

export function MemberLifecycleFunnel() {
  const hydrated = useHydrated();
  const { config, facilityId } = useLoyaltyProgram();
  const { data: accounts = [] } = useQuery(loyaltyQueries.accounts(facilityId));
  const { data: redemptions = [] } = useQuery(
    loyaltyQueries.redemptions(facilityId),
  );

  const tierDefinitions = config.tierDefinitions;
  const stages = useMemo(() => {
    const tierSortById = new Map(
      (tierDefinitions ?? []).map((t) => [t.id, t.sortOrder]),
    );
    return computeLifecycleFunnel({
      accounts,
      redemptions,
      tierSortById,
      now: NOW_ISO,
    });
  }, [accounts, redemptions, tierDefinitions]);

  const [openStage, setOpenStage] = useState<FunnelStage | null>(null);

  if (!hydrated) {
    return <div className="bg-muted/30 h-64 animate-pulse rounded-xl border" />;
  }

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => (
        <div key={stage.key}>
          {i > 0 && stage.dropFromPrev > 0 && (
            <div className="flex items-center justify-center gap-1 py-1 text-xs font-medium text-red-600 dark:text-red-400">
              <TrendingDown className="size-3.5" />
              {Math.round(stage.dropFromPrev * 100)}% drop-off
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpenStage(stage)}
            className="block w-full"
            aria-label={`${stage.label}: ${stage.count} members`}
          >
            <div
              className="bg-primary/85 hover:bg-primary text-primary-foreground mx-auto rounded-lg px-4 py-3 text-center shadow-sm transition-colors"
              style={{ width: `${Math.max(34, stage.pctOfEnrolled * 100)}%` }}
            >
              <div className="truncate text-sm font-medium">{stage.label}</div>
              <div className="text-lg font-bold tabular-nums">
                {stage.count}
                <span className="ml-1 text-xs font-normal opacity-80">
                  · {Math.round(stage.pctOfEnrolled * 100)}% of enrolled
                </span>
              </div>
            </div>
          </button>
        </div>
      ))}

      <p className="text-muted-foreground pt-2 text-center text-xs">
        Click any stage to see the customers in it.
      </p>

      <Sheet open={!!openStage} onOpenChange={(o) => !o && setOpenStage(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-md"
        >
          {openStage && (
            <>
              <SheetHeader>
                <SheetTitle>{openStage.label}</SheetTitle>
                <SheetDescription>
                  {openStage.count} member{openStage.count === 1 ? "" : "s"} ·{" "}
                  {Math.round(openStage.pctOfEnrolled * 100)}% of enrolled
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-0.5 px-4 pb-6">
                {openStage.members.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No customers at this stage.
                  </p>
                ) : (
                  openStage.members.map((id) => (
                    <Link
                      key={id}
                      href={`/facility/dashboard/clients/${id}`}
                      className={cn(
                        "hover:bg-muted block rounded-md px-2 py-1.5 text-sm transition-colors",
                      )}
                    >
                      {clientName(id)}
                    </Link>
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
