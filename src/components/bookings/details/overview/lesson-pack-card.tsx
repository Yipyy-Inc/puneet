"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { groomingQueries } from "@/lib/api/grooming";
import { isPluralOne } from "@/lib/i18n/format";

import { DetailsCard, DetailsCardHeader } from "../details-card";
import type { BookingDetails } from "../use-booking-details";

// ============================================================================
// A lesson pack the client holds — sessions left, and "Book the next session"
// on that program. For a private lesson, which belongs to no class, this is
// where the program's sessions are counted (the old page's pack card, in the
// mock's card).
// ============================================================================

export function LessonPackCard({
  d,
  onBookNext,
}: {
  d: BookingDetails;
  onBookNext: (programId: string) => void;
}) {
  const { t, fill, locale } = d.text;
  const { data } = useQuery(
    groomingQueries.customerPackagesForClient(d.client?.id),
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
    <DetailsCard id="lesson-pack">
      <DetailsCardHeader title={t("packTitle")} />
      <ul className="flex flex-col px-5 pt-1.5 pb-3.5">
        {pools.map((pool) => (
          <li
            key={pool.key}
            className="border-line-soft flex flex-wrap items-center justify-between gap-3 border-b py-2.5"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14px] font-medium tabular-nums">
                {fill(
                  isPluralOne(pool.left, locale)
                    ? "packSessionsLeftOne"
                    : "packSessionsLeftOther",
                  { count: pool.left },
                )}
              </span>
              <span className="text-ink-tertiary text-[12px]">{pool.name}</span>
            </span>
            <Button
              variant="quiet"
              size="bd-34"
              onClick={() => onBookNext(pool.programId)}
            >
              {t("packBookNext")}
            </Button>
          </li>
        ))}
      </ul>
    </DetailsCard>
  );
}
