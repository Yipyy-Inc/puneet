"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, BellRing, Package } from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  aggregateActivePackagesForPet,
  markRenewalReminderSent,
} from "@/lib/client-training-packages";

/** Compact "Sessions Remaining" chips shown in the trainer Profile header
 *  alongside the No-Show Risk + other status badges. Each active package is
 *  one chip; low-balance ones flip amber and surface a "Send reminder"
 *  action. The same data feeds the larger Overview panel below. */
export function TrainingProfilePackageChips({
  petId,
  todayISO,
}: {
  petId: number;
  todayISO: string;
}) {
  const queryClient = useQueryClient();
  const { data: packages = [] } = useQuery(
    trainingQueries.clientTrainingPackagesForPet(petId),
  );

  const rows = useMemo(
    () => aggregateActivePackagesForPet(petId, packages, todayISO),
    [petId, packages, todayISO],
  );

  if (rows.length === 0) return null;

  function sendReminder(rowIdx: number) {
    const row = rows[rowIdx];
    if (!row) return;
    markRenewalReminderSent(queryClient, row.pkg);
    toast.success(
      `Renewal reminder queued for ${row.pkg.petName}'s ${row.pkg.packageName}.`,
    );
  }

  return (
    <>
      {rows.map((row, idx) => {
        const remainingLabel = `${row.sessionsRemaining}/${row.pkg.sessionsPurchased} left`;
        const tone = row.exhausted
          ? "rose"
          : row.lowBalance
            ? "amber"
            : "slate";
        const toneCls = {
          rose: "border-rose-200 bg-rose-50 text-rose-700",
          amber: "border-amber-200 bg-amber-50 text-amber-700",
          slate: "border-slate-200 bg-slate-50 text-slate-600",
        }[tone];
        const Icon = row.exhausted || row.lowBalance ? AlertTriangle : Package;
        return (
          <span
            key={row.pkg.id}
            className="inline-flex items-center gap-1"
          >
            <Badge
              variant="outline"
              className={cn("gap-1", toneCls)}
              title={`${row.pkg.packageName} · ${remainingLabel}`}
            >
              <Icon className="size-3" />
              {row.pkg.packageName}: {remainingLabel}
            </Badge>
            {row.reminderDue && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 gap-1 border-amber-200 px-2 text-[11px] text-amber-700 hover:bg-amber-50"
                onClick={() => sendReminder(idx)}
                title="Send the owner a renewal reminder (simulated email)"
              >
                <BellRing className="size-3" />
                Send reminder
              </Button>
            )}
          </span>
        );
      })}
    </>
  );
}
