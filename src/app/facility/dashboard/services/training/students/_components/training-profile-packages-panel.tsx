"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Package,
  RefreshCcw,
  Sparkles,
  User2,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  aggregateActivePackagesForPet,
  markRenewalReminderSent,
} from "@/lib/client-training-packages";

/** Full "Training packages" panel rendered on the Overview tab — shows each
 *  active package with its remaining-sessions progress bar, status badges,
 *  and the trainer-facing send-renewal-reminder action when the balance is
 *  low. Trainers can also stamp the reminder when they've nudged the owner
 *  out-of-band so the cooldown logic kicks in. */
export function TrainingProfilePackagesPanel({
  petId,
  petName,
  todayISO,
}: {
  petId: number;
  petName: string;
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

  function handleSendReminder(idx: number) {
    const row = rows[idx];
    if (!row) return;
    markRenewalReminderSent(queryClient, row.pkg);
    toast.success(
      `Reminder queued for ${row.pkg.petName}'s ${row.pkg.packageName}.`,
    );
  }

  return (
    <section className="bg-card rounded-xl border shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Package className="text-muted-foreground size-4" />
          <h3 className="text-sm font-bold tracking-tight text-slate-800">
            Training packages
          </h3>
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
          >
            {rows.length} active
          </Badge>
        </div>
        <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <Sparkles className="size-3" />
          Owner sees the same balance in their portal.
        </p>
      </header>

      <ul className="divide-y">
        {rows.map((row, idx) => {
          const pkg = row.pkg;
          const lowOrOut = row.lowBalance || row.exhausted;
          const ClassIcon = pkg.classType === "private" ? User2 : Users;
          return (
            <li key={pkg.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <ClassIcon className="text-muted-foreground size-3.5" />
                    {pkg.packageName}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Purchased {formatDate(pkg.purchaseDate)}
                    {pkg.expiresAt && (
                      <>
                        {" · "}Expires {formatDate(pkg.expiresAt)}
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
                      Out of sessions
                    </Badge>
                  ) : row.lowBalance ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                    >
                      <AlertTriangle className="size-3" />
                      Low balance
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                    >
                      <CheckCircle2 className="size-3" />
                      Active
                    </Badge>
                  )}
                  {row.expiringSoon && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                      title={`Expires ${pkg.expiresAt ? formatDate(pkg.expiresAt) : "soon"}`}
                    >
                      <CalendarClock className="size-3" />
                      Expiring soon
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider">
                    Sessions
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      lowOrOut ? "text-amber-700" : "text-slate-800",
                    )}
                  >
                    {row.sessionsRemaining}/{pkg.sessionsPurchased} left ·{" "}
                    {pkg.sessionsUsed} used
                  </span>
                </div>
                <Progress
                  value={row.progressPct}
                  className={cn("h-2", lowOrOut && "[&>div]:bg-amber-500")}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-muted-foreground text-[11px]">
                  {pkg.lastRenewalReminderAt
                    ? `Last reminder sent ${formatDate(pkg.lastRenewalReminderAt)}.`
                    : "No renewal reminder sent yet."}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.reminderDue && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-amber-200 px-2 text-[11px] text-amber-700 hover:bg-amber-50"
                      onClick={() => handleSendReminder(idx)}
                    >
                      <BellRing className="size-3" />
                      Send renewal reminder
                    </Button>
                  )}
                  {row.exhausted || row.lowBalance ? (
                    <Button
                      size="sm"
                      className="h-7 gap-1 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-700"
                      onClick={() =>
                        toast.info(
                          `Booking a renewal for ${petName}'s ${pkg.packageName} — coming soon.`,
                        )
                      }
                    >
                      <RefreshCcw className="size-3" />
                      Renew package
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
