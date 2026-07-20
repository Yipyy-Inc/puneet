"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarPlus,
  CreditCard,
  Hourglass,
  MoreVertical,
  Send,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trialsQueries } from "@/lib/api/trials";
import type { Trial, TrialReminder } from "@/types/trials";
import { CancelTrialDialog } from "./cancel-trial-dialog";
import { ConvertTrialDialog } from "./convert-trial-dialog";
import { ExtendTrialDialog } from "./extend-trial-dialog";
import { NudgeTrialDialog } from "./nudge-trial-dialog";
import { daysBandClass, formatDate } from "./trials-utils";

type ActionType = "extend" | "convert" | "cancel" | "nudge";
const DAY = 86_400_000;

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ReminderTrack({ reminders }: { reminders: TrialReminder[] }) {
  return (
    <div className="flex items-center gap-1">
      {reminders.map((r) => (
        <span
          key={r.step}
          title={`Day-${r.step} reminder ${r.status}`}
          className={cn(
            "flex h-4 items-center rounded-full border px-1.5 text-[9px] font-medium",
            r.status === "sent"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-muted text-muted-foreground",
          )}
        >
          {r.step}d
        </span>
      ))}
    </div>
  );
}

export function TrialsClient() {
  const { data, isLoading } = useQuery(trialsQueries.list());

  const [now] = useState(() => new Date());
  const [overrides, setOverrides] = useState<Record<string, Trial>>({});
  const [removed, setRemoved] = useState<
    Record<string, "converted" | "cancelled">
  >({});
  const [action, setAction] = useState<{
    type: ActionType;
    trial: Trial;
  } | null>(null);

  const baseTrials = useMemo(() => data?.trials ?? [], [data]);
  const visible = useMemo(
    () =>
      baseTrials.map((t) => overrides[t.id] ?? t).filter((t) => !removed[t.id]),
    [baseTrials, overrides, removed],
  );
  const tableData = useMemo(
    () => [...visible].sort((a, b) => a.daysRemaining - b.daysRemaining),
    [visible],
  );

  const kpis = useMemo(() => {
    const active = visible.filter((t) => t.status === "active");
    const convertedLocal = Object.values(removed).filter(
      (r) => r === "converted",
    ).length;
    const cancelledLocal = Object.values(removed).filter(
      (r) => r === "cancelled",
    ).length;
    const converted =
      (data?.summary.convertedThisQuarter ?? 0) + convertedLocal;
    const ended =
      (data?.summary.endedThisQuarter ?? 0) + convertedLocal + cancelledLocal;
    return {
      totalActive: active.length,
      expiring7: active.filter(
        (t) => t.daysRemaining > 0 && t.daysRemaining <= 7,
      ).length,
      conversionRate:
        ended > 0
          ? Math.round((converted / ended) * 100)
          : (data?.summary.conversionRateQuarter ?? 0),
      converted,
      ended,
    };
  }, [visible, removed, data]);

  function close() {
    setAction(null);
  }

  function handleExtend(trial: Trial, newEnd: string) {
    const newDays = Math.round(
      (new Date(newEnd).getTime() - now.getTime()) / DAY,
    );
    const reminders: TrialReminder[] = trial.reminders.map((r) => ({
      ...r,
      scheduledAt: isoDate(new Date(new Date(newEnd).getTime() - r.step * DAY)),
      status: newDays <= r.step ? "sent" : "pending",
    }));
    setOverrides((prev) => ({
      ...prev,
      [trial.id]: {
        ...trial,
        trialEnd: newEnd,
        daysRemaining: newDays,
        status: newDays > 0 ? "active" : "expired",
        readOnly: newDays <= 0,
        reminders,
      },
    }));
    toast.success(
      `${trial.facilityName} trial extended to ${formatDate(newEnd)}`,
    );
    close();
  }
  function handleConvert(trial: Trial, tierName: string, cycle: string) {
    setRemoved((prev) => ({ ...prev, [trial.id]: "converted" }));
    toast.success(`${trial.facilityName} converted to ${tierName} (${cycle})`);
    close();
  }
  function handleCancel(trial: Trial) {
    setRemoved((prev) => ({ ...prev, [trial.id]: "cancelled" }));
    toast.success(`${trial.facilityName} trial cancelled`);
    close();
  }
  function handleNudge(trial: Trial) {
    toast.success(`Nudge sent to ${trial.adminName}`);
    close();
  }

  const columns: ColumnDef<Trial>[] = [
    {
      key: "facilityName",
      label: "Facility Name",
      sortable: true,
      render: (t) => (
        <div>
          <p className="font-medium">{t.facilityName}</p>
          <p className="text-muted-foreground text-xs">{t.adminEmail}</p>
        </div>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      sortable: true,
      render: (t) => <Badge variant="secondary">{t.plan}</Badge>,
    },
    {
      key: "trialStart",
      label: "Trial Start",
      sortable: true,
      render: (t) => formatDate(t.trialStart),
    },
    {
      key: "trialEnd",
      label: "Trial End",
      sortable: true,
      render: (t) => formatDate(t.trialEnd),
    },
    {
      key: "daysRemaining",
      label: "Days Remaining",
      sortable: true,
      sortValue: (t) => t.daysRemaining,
      render: (t) =>
        t.status === "expired" ? (
          <div className="space-y-1">
            <Badge
              variant="outline"
              className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
            >
              Expired
            </Badge>
            <p className="text-muted-foreground text-[10px]">
              Access read-only
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <Badge
              variant="outline"
              className={cn("tabular-nums", daysBandClass(t.daysRemaining))}
            >
              {t.daysRemaining}d left
            </Badge>
            <ReminderTrack reminders={t.reminders} />
          </div>
        ),
    },
  ];

  const rowActions = (t: Trial) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => setAction({ type: "extend", trial: t })}
        >
          <CalendarPlus className="mr-2 size-4" />
          Extend
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAction({ type: "convert", trial: t })}
        >
          <CreditCard className="mr-2 size-4" />
          Convert to Paid
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAction({ type: "nudge", trial: t })}
        >
          <Send className="mr-2 size-4" />
          Send Nudge
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => setAction({ type: "cancel", trial: t })}
        >
          <XCircle className="mr-2 size-4" />
          Cancel Trial
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trials</h1>
        <p className="text-muted-foreground">
          Active free trials, expiry reminders and conversions.
        </p>
      </div>

      {/* Automation notice */}
      <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sm">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="text-muted-foreground">
          Expiry reminders send automatically at{" "}
          <span className="text-foreground font-medium">14, 7 and 3 days</span>{" "}
          before the trial end date (Trial Expiry template). On the end date the
          facility&apos;s access is restricted to read-only.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          label="Total Active Trials"
          value={kpis.totalActive}
          icon={Hourglass}
          tone="indigo"
        />
        <KpiTile
          label="Expiring in 7 Days"
          value={kpis.expiring7}
          icon={CalendarClock}
          tone="amber"
          alert={
            kpis.expiring7 > 0
              ? { label: "Follow up soon", tone: "amber" }
              : undefined
          }
        />
        <KpiTile
          label="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          hint={`${kpis.converted}/${kpis.ended} this quarter`}
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          searchKeys={["facilityName", "plan", "adminEmail"]}
          searchPlaceholder="Search facility, plan, or admin…"
          itemsPerPage={12}
          actions={rowActions}
          emptyState={{
            icon: Hourglass,
            title: "No active trials",
            description:
              "There are no free trials in progress right now. New trials will appear here as facilities sign up.",
          }}
        />
      )}

      {/* Action dialogs */}
      {action?.type === "extend" && (
        <ExtendTrialDialog
          key={action.trial.id}
          trial={action.trial}
          onOpenChange={(o) => !o && close()}
          onConfirm={handleExtend}
        />
      )}
      {action?.type === "convert" && (
        <ConvertTrialDialog
          key={action.trial.id}
          trial={action.trial}
          onOpenChange={(o) => !o && close()}
          onConfirm={handleConvert}
        />
      )}
      {action?.type === "cancel" && (
        <CancelTrialDialog
          key={action.trial.id}
          trial={action.trial}
          onOpenChange={(o) => !o && close()}
          onConfirm={handleCancel}
        />
      )}
      {action?.type === "nudge" && (
        <NudgeTrialDialog
          key={action.trial.id}
          trial={action.trial}
          onOpenChange={(o) => !o && close()}
          onConfirm={handleNudge}
        />
      )}
    </div>
  );
}
