"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Package,
  PawPrint,
  RefreshCcw,
  Sparkles,
  User2,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  aggregateActivePackagesForClient,
  totalSessionsRemainingForClient,
} from "@/lib/client-training-packages";
import { clients } from "@/data/clients";

interface Props {
  customerId: number;
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CustomerTrainingPackagesTab({ customerId }: Props) {
  const [nowMs] = useState(() => Date.now());
  const todayISO = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  const { data: packages = [] } = useQuery(
    trainingQueries.clientTrainingPackagesForClient(customerId),
  );

  const rows = useMemo(
    () => aggregateActivePackagesForClient(customerId, packages, todayISO),
    [customerId, packages, todayISO],
  );

  const petImageById = useMemo(() => {
    const m = new Map<number, string | undefined>();
    const customer = clients.find((c) => c.id === customerId);
    for (const pet of customer?.pets ?? []) m.set(pet.id, pet.imageUrl);
    return m;
  }, [customerId]);

  const totalSessions = useMemo(
    () => totalSessionsRemainingForClient(customerId, packages),
    [customerId, packages],
  );

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        No training packages yet — once you buy a pack of sessions, you&apos;ll
        track your balance here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Package className="text-indigo-500 size-4" />
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {totalSessions}
            </span>{" "}
            training session{totalSessions === 1 ? "" : "s"} remaining
          </span>
        </div>
        <p className="text-muted-foreground inline-flex items-center gap-1 text-[12px]">
          <Sparkles className="size-3" />
          Your balance updates the moment a session completes.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const pkg = row.pkg;
          const lowOrOut = row.lowBalance || row.exhausted;
          const ClassIcon = pkg.classType === "private" ? User2 : Users;
          const petImage = petImageById.get(pkg.petId);
          return (
            <li
              key={pkg.id}
              className={cn(
                "bg-card overflow-hidden rounded-xl border shadow-sm",
                row.exhausted && "ring-2 ring-rose-200",
                row.lowBalance && !row.exhausted && "ring-2 ring-amber-200",
              )}
            >
              <div className="space-y-3 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {petImage ? (
                      <div className="size-10 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
                        <Image
                          src={petImage}
                          alt={pkg.petName}
                          width={40}
                          height={40}
                          className="size-full object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
                        <PawPrint className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-slate-800">
                      {pkg.packageName}
                    </p>
                    <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-[11px]">
                      <PawPrint className="size-3" />
                      For {pkg.petName}
                      <span className="text-muted-foreground/50">·</span>
                      <ClassIcon className="size-3" />
                      {pkg.classType === "private" ? "Private" : "Group"}
                    </p>
                  </div>
                  {row.exhausted ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                    >
                      <AlertTriangle className="size-3" />
                      Out
                    </Badge>
                  ) : row.lowBalance ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                    >
                      <AlertTriangle className="size-3" />
                      Low
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
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums",
                        lowOrOut ? "text-amber-700" : "text-slate-900",
                      )}
                    >
                      {row.sessionsRemaining}
                      <span className="text-muted-foreground text-lg font-normal">
                        {" "}
                        / {pkg.sessionsPurchased}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      sessions left
                    </span>
                  </div>
                  <Progress
                    value={row.progressPct}
                    className={cn("mt-2 h-2", lowOrOut && "[&>div]:bg-amber-500")}
                  />
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span>
                    Purchased {formatDate(pkg.purchaseDate)}
                    {pkg.expiresAt && ` · Expires ${formatDate(pkg.expiresAt)}`}
                  </span>
                  {row.expiringSoon && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                    >
                      <CalendarClock className="size-3" />
                      Expiring soon
                    </Badge>
                  )}
                </div>

                {lowOrOut && (
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      row.exhausted
                        ? "border-rose-200 bg-rose-50/60"
                        : "border-amber-200 bg-amber-50/60",
                    )}
                  >
                    <p className="text-[12.5px]/relaxed text-slate-700">
                      {row.exhausted
                        ? `${pkg.petName} is out of sessions on this package. Renew to keep training going.`
                        : `Heads up — ${pkg.petName} has ${row.sessionsRemaining} session${row.sessionsRemaining === 1 ? "" : "s"} left. Renew now to avoid a gap.`}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2 h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() =>
                        toast.info(
                          `Renewal flow for ${pkg.packageName} — coming soon. Your instructor was notified.`,
                        )
                      }
                    >
                      <RefreshCcw className="size-3.5" />
                      Renew package
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
