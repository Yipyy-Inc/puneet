"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { groomingQueries } from "@/lib/api/grooming";
import { NO_ITEMS } from "@/lib/no-items";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { trainingPackageRows } from "@/lib/training-owned-packages";

/** Compact "sessions left" chips in the trainer profile header — one per
 *  active training package the dog's household owns, low or empty ones in
 *  the warning ink. The larger Overview panel reads the same rows.
 *
 *  They read what the client really owns (/api/packages/owned). Until
 *  2026-09-12 they read `clientTrainingPackages`, a fixture of invented
 *  purchases, and "Send reminder" stamped a date in the query cache and
 *  toasted "Renewal reminder queued" — nothing was queued, so it is gone. */
export function TrainingProfilePackageChips({
  ownerRef,
  todayISO,
}: {
  ownerRef: number;
  todayISO: string;
}) {
  const { fill } = useStaffText("trainingPackages");
  const { data } = useQuery(
    groomingQueries.customerPackagesForClient(
      ownerRef > 0 ? ownerRef : undefined,
    ),
  );

  const rows = useMemo(
    () => trainingPackageRows(data ?? NO_ITEMS, todayISO),
    [data, todayISO],
  );

  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row) => {
        const label = fill("chip", {
          name: row.packageName,
          remaining: row.remaining,
          total: row.total,
        });
        const toneCls = row.exhausted
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : row.lowBalance
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-50 text-slate-600";
        const Icon = row.exhausted || row.lowBalance ? AlertTriangle : Package;
        return (
          <Badge
            key={row.id}
            variant="outline"
            className={cn("gap-1", toneCls)}
            title={label}
          >
            <Icon className="size-3" />
            {label}
          </Badge>
        );
      })}
    </>
  );
}
