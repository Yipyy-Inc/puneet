"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Package, Sparkles } from "lucide-react";
import { groomingQueries } from "@/lib/api/grooming";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { NO_ITEMS } from "@/lib/no-items";
import { trainingPackageRows } from "@/lib/training-owned-packages";
import { localToday } from "@/lib/vaccinations";

/** Slim "Training credits" widget on the customer dashboard — sessions left
 *  across the household's active training packages, and how many need
 *  renewing. Tapping it opens the training page's Packages tab.
 *
 *  It read `clientTrainingPackages`, a fixture, until 2026-09-12. It reads
 *  what the customer owns (/api/packages/owned) through the same rows as the
 *  Packages tab now, so the two cannot disagree. */
export function CustomerTrainingCreditsBanner() {
  const { t, fill } = useCustomerText("dashboard");
  const [todayISO] = useState(localToday);
  const { data } = useQuery(groomingQueries.customerPackages());

  const rows = trainingPackageRows(data ?? NO_ITEMS, todayISO);
  // Nothing to show until the customer owns a training package.
  if (rows.length === 0) return null;

  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const lowCount = rows.filter((row) => row.lowBalance || row.exhausted).length;
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
              <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {t("trainingCredits")}
              </p>
              <p className="text-lg/tight font-bold text-slate-900">
                {fill(
                  totalRemaining === 1 ? "sessionsLeftOne" : "sessionsLeftMany",
                  { count: totalRemaining },
                )}
              </p>
              <p className="text-muted-foreground text-[11px]">
                {fill(
                  rows.length === 1
                    ? "acrossPackagesOne"
                    : "acrossPackagesMany",
                  { count: rows.length },
                )}
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
                {fill(lowCount === 1 ? "needRenewalOne" : "needRenewalMany", {
                  count: lowCount,
                })}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                <Sparkles className="size-3" />
                {t("allSet")}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-[12px]"
              tabIndex={-1}
            >
              {t("viewPackages")}
              <ArrowRight className="size-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
