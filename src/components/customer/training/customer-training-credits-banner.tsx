"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Package,
  Sparkles,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  aggregateActivePackagesForClient,
  totalSessionsRemainingForClient,
} from "@/lib/client-training-packages";

/** Slim "Training Credits" widget shown on the customer dashboard between
 *  the summary tiles and the loyalty rewards section. Designed to read at a
 *  glance — total sessions remaining + a "Low balance on N package" callout
 *  when applicable. Tapping it deep-links to the customer training page's
 *  Packages tab. */
export function CustomerTrainingCreditsBanner({
  customerId,
}: {
  customerId: number;
}) {
  const [nowMs] = useState(() => Date.now());
  const todayISO = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  const { data: packages = [] } = useQuery(
    trainingQueries.clientTrainingPackagesForClient(customerId),
  );

  const totalRemaining = useMemo(
    () => totalSessionsRemainingForClient(customerId, packages),
    [customerId, packages],
  );

  const rows = useMemo(
    () => aggregateActivePackagesForClient(customerId, packages, todayISO),
    [customerId, packages, todayISO],
  );

  const lowCount = useMemo(
    () => rows.filter((r) => r.lowBalance || r.exhausted).length,
    [rows],
  );

  // Don't show anything if the customer has no active training packages.
  if (rows.length === 0) return null;

  const hasAlert = lowCount > 0;

  return (
    <Link href="/customer/training?tab=packages" className="group block">
      <Card
        className={cn(
          "relative cursor-pointer overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
          hasAlert
            ? "border-amber-200/70 bg-linear-to-br from-white via-white to-amber-50/70"
            : "border-violet-100/70 bg-linear-to-br from-white via-white to-violet-50/70",
        )}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl shadow-sm",
                hasAlert
                  ? "bg-amber-100 text-amber-700"
                  : "bg-violet-100 text-violet-700",
              )}
            >
              <Package className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Training credits
              </p>
              <p className="text-lg/tight font-bold text-slate-900">
                {totalRemaining} session{totalRemaining === 1 ? "" : "s"} left
              </p>
              <p className="text-muted-foreground text-[11px]">
                Across {rows.length} active package
                {rows.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasAlert ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-200 bg-amber-50 text-amber-700"
              >
                <AlertTriangle className="size-3" />
                {lowCount} need{lowCount === 1 ? "s" : ""} renewal
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                <Sparkles className="size-3" />
                All set
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-[12px]"
              tabIndex={-1}
            >
              View packages
              <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
