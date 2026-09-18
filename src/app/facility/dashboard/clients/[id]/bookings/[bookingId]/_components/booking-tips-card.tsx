"use client";

import { HandCoins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { BookingTips } from "@/lib/api/booking-tips";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// The tip on a paid booking, where it was taken, and who it went to.
//
// Moved out of the page as it was translated. The split it shows is the one
// RECORDED (`tip_allocations`). Beside it the page also drew a split worked out
// from a fixture `invoice.items` blob, proportional to each item's price — a
// branch no real booking reached, and a figure nobody had decided on.
// ============================================================================

export function BookingTipsCard({
  tips,
  staff,
  onEditSplit,
}: {
  tips: BookingTips | undefined;
  /** Staff row ids to names, for the recorded split. */
  staff: { id: string; name: string }[];
  onEditSplit: () => void;
}) {
  const { t, locale } = useStaffText("bookingDetail");
  const money = (amount: number) => formatMoney(amount, locale);
  const total = tips?.tipCollected ?? 0;
  const terminal = tips?.bySource.terminal ?? 0;
  const online = tips?.bySource.online ?? 0;

  return (
    <Card id="tips" className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-ink-tertiary flex items-center gap-2 text-xs font-bold tracking-[.06em] uppercase">
            <HandCoins className="size-4" />
            {t("tipsTitle")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEditSplit}>
            {t("tipsEditSplit")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {total > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-ink-secondary text-sm">
                {t("tipsTotal")}
              </span>
              <span className="text-body-ink text-lg font-bold tabular-nums">
                {money(total)}
              </span>
            </div>

            {/* Where it was taken, only when both exist: labelling a single
                figure "card reader" distinguishes it from nothing. */}
            {terminal > 0 && online > 0 && (
              <dl className="text-ink-secondary space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <dt>{t("tipsTerminal")}</dt>
                  <dd className="tabular-nums">{money(terminal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("tipsOnline")}</dt>
                  <dd className="tabular-nums">{money(online)}</dd>
                </div>
              </dl>
            )}

            {(tips?.allocations.length ?? 0) > 0 && (
              <>
                <Separator />
                <p className="text-ink-tertiary text-xs font-bold tracking-[.06em] uppercase">
                  {t("tipsDistribution")}
                </p>
                <ul className="space-y-1.5">
                  {tips!.allocations.map((allocation) => (
                    <li
                      key={allocation.id}
                      className="border-line flex items-center justify-between gap-3 rounded-2xl border px-3 py-2"
                    >
                      <span className="text-body-ink min-w-0 text-sm font-semibold">
                        {staff.find((s) => s.id === allocation.staffId)?.name ??
                          allocation.authorName ??
                          "—"}
                      </span>
                      <span className="text-body-ink text-sm font-semibold tabular-nums">
                        {money(allocation.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p className="text-ink-tertiary py-2 text-center text-sm">
            {t("tipsNone")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
