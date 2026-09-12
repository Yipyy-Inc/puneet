"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Package,
  RefreshCcw,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SellPackageDialog } from "@/components/clients/packages/SellPackageDialog";
import { groomingQueries } from "@/lib/api/grooming";
import { NO_ITEMS } from "@/lib/no-items";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { trainingPackageRows } from "@/lib/training-owned-packages";

/** The "Training packages" panel on the trainer profile's Overview tab — each
 *  active training package the dog's household owns, with its sessions left.
 *
 *  ── WHAT CHANGED (2026-09-12) ────────────────────────────────────────────
 *
 *  It read `clientTrainingPackages`, a fixture of invented purchases. It reads
 *  /api/packages/owned now: packages belong to the CLIENT, so the panel is the
 *  household's. "Send renewal reminder" stamped a date in the query cache and
 *  toasted "Reminder queued" — nothing was queued, so it is gone. "Renew
 *  package" said "coming soon"; it opens the client file's own Sell a package
 *  dialog, which records the sale and its payment. And "Owner sees the same
 *  balance in their portal" was not true — the portal's training tab still
 *  reads the fixture — so it is not said. */
export function TrainingProfilePackagesPanel({
  ownerRef,
  ownerName,
  todayISO,
}: {
  ownerRef: number;
  ownerName: string;
  todayISO: string;
}) {
  const { t, fill, locale } = useStaffText("trainingPackages");
  const [selling, setSelling] = useState(false);
  const { data, error } = useQuery(
    groomingQueries.customerPackagesForClient(
      ownerRef > 0 ? ownerRef : undefined,
    ),
  );

  const rows = useMemo(
    () => trainingPackageRows(data ?? NO_ITEMS, todayISO),
    [data, todayISO],
  );

  // §6 rule 8: a date is written out, never numeric. Dates are the day the
  // package was bought or lapses, so they are read as calendar days.
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

  if (error) {
    return <p className="text-destructive text-sm">{t("loadFailed")}</p>;
  }
  if (rows.length === 0) return null;

  return (
    <section className="bg-card rounded-xl border shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Package className="text-muted-foreground size-4" />
          <h3 className="text-sm font-bold tracking-tight text-slate-800">
            {t("title")}
          </h3>
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
          >
            {fill("activeCount", { count: rows.length })}
          </Badge>
        </div>
        <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <Users className="size-3" />
          {fill("household", { owner: ownerName })}
        </p>
      </header>

      <ul className="divide-y">
        {rows.map((row) => {
          const lowOrOut = row.lowBalance || row.exhausted;
          return (
            <li key={row.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {row.packageName}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {fill("purchased", { date: formatDate(row.purchasedAt) })}
                    {row.expiresAt && (
                      <>
                        {" · "}
                        {fill("expires", { date: formatDate(row.expiresAt) })}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.exhausted ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                    >
                      <AlertTriangle className="size-3" />
                      {t("outOfSessions")}
                    </Badge>
                  ) : row.lowBalance ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                    >
                      <AlertTriangle className="size-3" />
                      {t("lowBalance")}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                    >
                      <CheckCircle2 className="size-3" />
                      {t("active")}
                    </Badge>
                  )}
                  {row.expiringSoon && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                    >
                      <CalendarClock className="size-3" />
                      {t("expiringSoon")}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                    {t("sessions")}
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      lowOrOut ? "text-amber-700" : "text-slate-800",
                    )}
                  >
                    {fill("remaining", {
                      remaining: row.remaining,
                      total: row.total,
                      used: row.used,
                    })}
                  </span>
                </div>
                <Progress
                  value={row.progressPct}
                  className={cn("h-2", lowOrOut && "[&>div]:bg-amber-500")}
                />
              </div>

              {lowOrOut && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setSelling(true)}
                  >
                    <RefreshCcw className="size-3" />
                    {t("renew")}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <SellPackageDialog
        open={selling}
        onOpenChange={setSelling}
        clientRef={ownerRef}
        clientName={ownerName}
      />
    </section>
  );
}
