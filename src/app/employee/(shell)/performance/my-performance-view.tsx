"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  CheckCircle2,
  Timer,
  Star,
  Camera,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { staffPerformance } from "@/data/staff-tasks";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { usePerformanceVisibility } from "@/lib/staff-performance-visibility";

export function MyPerformanceView() {
  // Both visibility (toggled by the manager on C2) and the metrics themselves
  // are keyed by the facility staff id of the signed-in employee.
  const { viewer } = useFacilityViewer();
  const staffId = viewer.id;
  const visible = usePerformanceVisibility(staffId);

  const perf = useMemo(
    () => staffPerformance.find((p) => p.staffId === staffId),
    [staffId],
  );

  // Report cards still carry a numeric author id from the legacy user roster,
  // so there is no way to attribute them to a staff profile yet — the tile
  // says so rather than reporting a zero that reads as "no ratings".
  const ratings = { avg: 0, count: 0 };

  if (!visible) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
          <EyeOff className="size-8 opacity-40" />
          <p className="text-sm font-medium">
            Performance isn&apos;t shared yet
          </p>
          <p className="max-w-xs text-xs">
            Your manager hasn&apos;t enabled performance visibility for you.
            When they do, your metrics will appear here.
          </p>
        </div>
      </div>
    );
  }

  const onTimeRate =
    perf && perf.onTimeCompletions + perf.lateCompletions > 0
      ? Math.round(
          (perf.onTimeCompletions /
            (perf.onTimeCompletions + perf.lateCompletions)) *
            100,
        )
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <TrendingUp className="text-primary size-6" /> My Performance
        </h1>
        <p className="text-muted-foreground text-sm">
          Shared with you by your manager.
        </p>
      </div>

      {!perf ? (
        <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-1.5 rounded-xl border border-dashed py-10 text-center">
          <BarChart3 className="size-7 opacity-40" />
          <p className="text-sm">No performance data recorded yet.</p>
        </div>
      ) : (
        <>
          {/* Task completion */}
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Task completion rate
                </span>
                <span className="text-lg font-bold">
                  {perf.completionRate}%
                </span>
              </div>
              <Progress value={perf.completionRate} className="h-2" />
              <p className="text-muted-foreground text-xs">
                {perf.tasksCompleted} of {perf.totalTasksAssigned} tasks
                completed · {perf.tasksPending} pending
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Punctuality */}
            <StatCard
              icon={Timer}
              tone="text-amber-600 dark:text-amber-400"
              value={String(perf.lateCompletions)}
              label={`late shift${perf.lateCompletions === 1 ? "" : "s"}`}
              hint={onTimeRate !== null ? `${onTimeRate}% on time` : undefined}
            />
            {/* Client ratings */}
            <StatCard
              icon={Star}
              tone="text-yellow-500"
              value={ratings.count > 0 ? ratings.avg.toFixed(1) : "—"}
              label="avg client rating"
              hint={
                ratings.count > 0
                  ? `${ratings.count} rating${ratings.count === 1 ? "" : "s"}`
                  : "Not linked to your profile yet"
              }
              stars={ratings.count > 0 ? ratings.avg : undefined}
            />
            {/* Photo proof */}
            <StatCard
              icon={Camera}
              tone="text-sky-600 dark:text-sky-400"
              value={`${perf.photoProofCompliance}%`}
              label="photo compliance"
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
  hint,
  stars,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  value: string;
  label: string;
  hint?: string;
  stars?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={cn("size-5", tone)} />
        <div className="mt-1.5 text-2xl font-bold">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
        {stars !== undefined && (
          <div className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "size-3.5",
                  n <= Math.round(stars)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30",
                )}
              />
            ))}
          </div>
        )}
        {hint && (
          <div className="text-muted-foreground mt-1 text-[11px]">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
