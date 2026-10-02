"use client";

import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groomingQueries } from "@/lib/api/grooming";
import { isPluralOne } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// "2 sessions left — Book the next session" (the booking wizard, 2026-10-01).
//
// A lesson pack books its first session and leaves the rest as passes the
// client owns (/api/training/lesson-packs). This is where they are booked
// from: the wizard opens on the program, and Confirm offers the pass.
// ============================================================================

export function TrainingPackCard({
  clientRef,
  onBookNext,
}: {
  clientRef: number;
  /** Opens the booking wizard on that program. */
  onBookNext: (programId: string) => void;
}) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const { data } = useQuery(
    groomingQueries.customerPackagesForClient(clientRef),
  );
  const pools = (data ?? [])
    .filter((pkg) => pkg.status === "active")
    .flatMap((pkg) =>
      pkg.passes
        .filter(
          (pool) =>
            pool.moduleId === "training" && pool.totalPasses > pool.usedPasses,
        )
        .map((pool) => ({
          key: `${pkg.id}:${pool.packageId}`,
          name: pkg.packageName,
          programId: pool.packageId,
          left: pool.totalPasses - pool.usedPasses,
        })),
    );
  if (pools.length === 0) return null;

  return (
    <Card id="lesson-pack" className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
          <Gift className="size-4" aria-hidden />
          {t("packTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-1">
        {pools.map((pool) => (
          <div
            key={pool.key}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-strong text-body-ink tabular-nums">
                {fill(
                  isPluralOne(pool.left, locale)
                    ? "packSessionsLeftOne"
                    : "packSessionsLeftOther",
                  { count: pool.left },
                )}
              </span>
              <span className="text-meta text-ink-tertiary">{pool.name}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => onBookNext(pool.programId)}
            >
              {t("packBookNext")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
