"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Utensils,
  Pill,
  AlertTriangle,
  CheckCircle,
  PawPrint,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import type { ScheduledTask, TaskExecution, GuestAlert } from "./guest-journal";
import type { BoardingGuest } from "@/data/boarding";

type Props = {
  guests: BoardingGuest[];
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  alerts: GuestAlert[];
};

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  done,
  total,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  done: number;
  total: number;
}) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  const isComplete = done === total;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className={`size-5 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-2xl font-bold leading-none mt-0.5">
              {done}
              <span className="text-muted-foreground text-base font-normal">
                /{total}
              </span>
            </p>
          </div>
          {isComplete ? (
            <CheckCircle className="size-5 text-green-500 shrink-0" />
          ) : (
            <Badge variant="secondary">{pct}%</Badge>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            data-complete={isComplete}
            className="h-full rounded-full bg-primary transition-all data-[complete=true]:bg-green-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GuestStatusRow({
  guest,
  tasks,
  executions,
  alerts,
}: {
  guest: BoardingGuest;
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  alerts: GuestAlert[];
}) {
  const guestTasks = tasks.filter((t) => t.guestId === guest.id);
  const guestExecs = executions.filter((e) => e.guestId === guest.id);
  const guestAlerts = alerts.filter((a) => a.guestId === guest.id);

  const pottyTasks = guestTasks.filter((t) => t.taskType === "potty");
  const feedingTasks = guestTasks.filter((t) => t.taskType === "feeding");
  const medTasks = guestTasks.filter((t) => t.taskType === "medication");

  const pottyDone = pottyTasks.filter((t) =>
    guestExecs.some((e) => e.taskId === t.id),
  ).length;
  const feedingDone = feedingTasks.filter((t) =>
    guestExecs.some(
      (e) => e.taskId === t.id && e.taskType === "feeding" && !!e.outcome,
    ),
  ).length;
  const medDone = medTasks.filter((t) =>
    guestExecs.some((e) => e.taskId === t.id),
  ).length;

  const hasRefusedMeal = guestExecs.some(
    (e) => e.taskType === "feeding" && e.outcome === "refused",
  );
  const hasMissedMed = guestExecs.some(
    (e) => e.taskType === "medication" && e.outcome === "missed",
  );
  const hasDigestiveIssue = guestExecs.some(
    (e) =>
      e.taskType === "potty" &&
      (e.outcome === "diarrhea" || e.outcome === "soft_stool"),
  );

  function MiniStat({
    icon: Icon,
    done,
    total,
    colorClass,
  }: {
    icon: React.ElementType;
    done: number;
    total: number;
    colorClass: string;
  }) {
    if (total === 0) return null;
    const ok = done === total;
    return (
      <div
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
      >
        <Icon className={`size-3 ${ok ? "text-green-600 dark:text-green-400" : colorClass}`} />
        {done}/{total}
      </div>
    );
  }

  return (
    <div
      data-concern={guestAlerts.length > 0}
      className="flex items-center gap-3 rounded-xl border p-3 transition-colors data-[concern=true]:border-red-200 data-[concern=true]:bg-red-50/40 dark:data-[concern=true]:border-red-800 dark:data-[concern=true]:bg-red-900/10"
    >
      {/* Avatar */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        {guest.petPhotoUrl ? (
          <img
            src={guest.petPhotoUrl}
            alt={guest.petName}
            className="size-10 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <PawPrint className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-sm">{guest.petName}</span>
          <span className="text-muted-foreground text-xs">{guest.kennelName}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <MiniStat
            icon={Droplets}
            done={pottyDone}
            total={pottyTasks.length}
            colorClass="text-blue-500"
          />
          <MiniStat
            icon={Utensils}
            done={feedingDone}
            total={feedingTasks.length}
            colorClass="text-green-500"
          />
          {medTasks.length > 0 && (
            <MiniStat
              icon={Pill}
              done={medDone}
              total={medTasks.length}
              colorClass="text-purple-500"
            />
          )}
        </div>
      </div>

      {/* Status / alerts */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {guestAlerts.length > 0 ? (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="mr-1 size-3" />
            {guestAlerts.length} alert{guestAlerts.length > 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-green-400 text-green-700 text-xs dark:text-green-400"
          >
            <CheckCircle className="mr-1 size-3" />
            All clear
          </Badge>
        )}
        {hasRefusedMeal && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Refused meal
          </span>
        )}
        {hasMissedMed && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Missed med
          </span>
        )}
        {hasDigestiveIssue && (
          <span className="text-xs text-orange-600 dark:text-orange-400">
            Digestive issue
          </span>
        )}
      </div>
    </div>
  );
}

// ── ManagerView ───────────────────────────────────────────────────────────────

export function ManagerView({ guests, tasks, executions, alerts }: Props) {
  const pottyTasks = tasks.filter((t) => t.taskType === "potty");
  const feedingTasks = tasks.filter((t) => t.taskType === "feeding");
  const medTasks = tasks.filter((t) => t.taskType === "medication");

  const pottyDone = pottyTasks.filter((t) =>
    executions.some((e) => e.taskId === t.id),
  ).length;
  const feedingDone = feedingTasks.filter((t) =>
    executions.some(
      (e) => e.taskId === t.id && e.taskType === "feeding" && !!e.outcome,
    ),
  ).length;
  const medDone = medTasks.filter((t) =>
    executions.some((e) => e.taskId === t.id),
  ).length;

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-6">
      {/* Daily summary */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="text-primary size-4" />
          <h2 className="font-semibold">Today's Progress</h2>
          <span className="text-muted-foreground text-sm">
            · {guests.length} guests in house
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Droplets}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            label="Potty Rounds"
            done={pottyDone}
            total={pottyTasks.length}
          />
          <StatCard
            icon={Utensils}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-100 dark:bg-green-900/30"
            label="Feedings"
            done={feedingDone}
            total={feedingTasks.length}
          />
          <StatCard
            icon={Pill}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            label="Medications"
            done={medDone}
            total={medTasks.length}
          />
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                  <ShieldAlert className="size-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-sm">Alerts</p>
                  <p className="text-2xl font-bold leading-none mt-0.5">
                    {criticalAlerts.length}
                    {warningAlerts.length > 0 && (
                      <span className="text-base font-normal text-muted-foreground">
                        +{warningAlerts.length}
                      </span>
                    )}
                  </p>
                </div>
                {alerts.length === 0 ? (
                  <CheckCircle className="size-5 text-green-500 shrink-0" />
                ) : (
                  <AlertTriangle className="size-5 text-red-500 shrink-0" />
                )}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${alerts.length === 0 ? "bg-green-500 w-full" : "bg-red-500"}`}
                  style={{
                    width: alerts.length === 0 ? "100%" : `${Math.min(alerts.length * 20, 100)}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4 text-red-500" />
            <h2 className="font-semibold">Active Alerts</h2>
            <Badge variant="destructive">{alerts.length}</Badge>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                data-critical={alert.severity === "critical"}
                className="flex items-start gap-3 rounded-xl border p-3 data-[critical=true]:border-red-300 data-[critical=true]:bg-red-50/50 data-[critical=false]:border-amber-200 data-[critical=false]:bg-amber-50/40 dark:data-[critical=true]:border-red-700 dark:data-[critical=true]:bg-red-900/10 dark:data-[critical=false]:border-amber-700 dark:data-[critical=false]:bg-amber-900/10"
              >
                <AlertTriangle
                  data-critical={alert.severity === "critical"}
                  className="mt-0.5 size-4 shrink-0 data-[critical=true]:text-red-500 data-[critical=false]:text-amber-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold text-sm">
                      {alert.petName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {alert.kennelName}
                    </span>
                  </div>
                  <p
                    data-critical={alert.severity === "critical"}
                    className="text-sm mt-0.5 data-[critical=true]:text-red-700 data-[critical=false]:text-amber-700 dark:data-[critical=true]:text-red-400 dark:data-[critical=false]:text-amber-400"
                  >
                    {alert.message}
                  </p>
                </div>
                <Badge
                  data-critical={alert.severity === "critical"}
                  variant="outline"
                  className="shrink-0 text-xs data-[critical=true]:border-red-400 data-[critical=true]:text-red-600 data-[critical=false]:border-amber-400 data-[critical=false]:text-amber-600"
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-guest status grid */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <PawPrint className="text-primary size-4" />
          <h2 className="font-semibold">Guest Status</h2>
        </div>
        <div className="space-y-2">
          {guests.map((guest) => (
            <GuestStatusRow
              key={guest.id}
              guest={guest}
              tasks={tasks}
              executions={executions}
              alerts={alerts.filter((a) => a.guestId === guest.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
