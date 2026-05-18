"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlarmClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  BRIEFING_LEAD_MINUTES,
  generatePreSessionBriefingTasks,
  type PreSessionBriefingTask,
} from "@/lib/training-pre-session";
import { PreSessionBriefingPanel } from "./pre-session-briefing-panel";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string, nowMs: number): string {
  const today = new Date(nowMs);
  const tomorrow = new Date(nowMs);
  tomorrow.setDate(today.getDate() + 1);
  const target = new Date(iso);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(target, today)) return "Today";
  if (sameDay(target, tomorrow)) return "Tomorrow";
  return target.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function countdownLabel(iso: string, nowMs: number): string {
  const diffMs = new Date(iso).getTime() - nowMs;
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 0) {
    const past = -minutes;
    if (past === 0) return "starting now";
    if (past < 60) return `started ${past} min ago`;
    return `started ${Math.round(past / 60)}h ago`;
  }
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `in ${hours}h`;
}

export function TrainingPreSessionTasks() {
  // Pin "now" once at mount so the active-window classification is stable.
  // React Compiler purity would flag Date reads inside useMemo.
  const [nowMs] = useState(() => Date.now());

  const { data: sessions = [] } = useQuery(trainingQueries.sessions());
  const { data: classes = [] } = useQuery(trainingQueries.classes());
  const { data: briefedIds = [] } = useQuery(
    trainingQueries.preSessionBriefedSessionIds(),
  );

  const briefedSet = useMemo(() => new Set(briefedIds), [briefedIds]);

  const tasks = useMemo(
    () =>
      generatePreSessionBriefingTasks({
        sessions,
        classes,
        briefedSessionIds: briefedSet,
        nowMs,
      }),
    [sessions, classes, briefedSet, nowMs],
  );

  const [activeTask, setActiveTask] = useState<PreSessionBriefingTask | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useState(false);

  const activeCount = useMemo(
    () => tasks.filter((t) => t.status === "active").length,
    [tasks],
  );
  const briefedCount = useMemo(
    () => tasks.filter((t) => t.status === "briefed").length,
    [tasks],
  );

  if (tasks.length === 0) return null;

  function open(task: PreSessionBriefingTask) {
    setActiveTask(task);
    setPanelOpen(true);
  }

  return (
    <>
      <section className="bg-card rounded-xl border shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardCheck className="text-indigo-500 size-4" />
            <h2 className="text-sm font-bold tracking-tight text-slate-800">
              Student Notes Review
            </h2>
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
            >
              {tasks.length} upcoming
            </Badge>
            {activeCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
              >
                <AlarmClock className="size-3" />
                {activeCount} live now
              </Badge>
            )}
            {briefedCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                <CheckCircle2 className="size-3" />
                {briefedCount} done
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            <Sparkles className="size-3" />
            Auto-generated {BRIEFING_LEAD_MINUTES} min before each session.
          </p>
        </header>

        <ul className="divide-y">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                task.status === "active" && "bg-amber-50/40",
                task.status === "briefed" && "opacity-70",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                  task.status === "active"
                    ? "bg-amber-100 text-amber-700"
                    : task.status === "briefed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-100 text-indigo-700",
                )}
              >
                {task.status === "briefed" ? (
                  <CheckCircle2 className="size-4" />
                ) : task.status === "active" ? (
                  <AlarmClock className="size-4" />
                ) : (
                  <ClipboardCheck className="size-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {task.className}
                </p>
                <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                  <Clock className="size-3" />
                  {formatDayLabel(task.sessionStartAt, nowMs)} ·{" "}
                  {formatTime(task.sessionStartAt)}
                  <span className="text-muted-foreground/50">·</span>
                  <Users className="size-3" />
                  {task.studentCount} student
                  {task.studentCount === 1 ? "" : "s"}
                  <span className="text-muted-foreground/50">·</span>
                  {task.trainerName}
                  {task.location && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <MapPin className="size-3" />
                      {task.location}
                    </>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {task.status === "active" ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-300 bg-amber-100 text-[10px] text-amber-800"
                    title={`Briefing window opens 15 min before start.`}
                  >
                    <AlarmClock className="size-3" />
                    {countdownLabel(task.sessionStartAt, nowMs)}
                  </Badge>
                ) : task.status === "briefed" ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    Briefed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                  >
                    <Clock className="size-3" />
                    {countdownLabel(task.sessionStartAt, nowMs)}
                  </Badge>
                )}
                <Button
                  size="sm"
                  className={cn(
                    "h-8 gap-1 text-[12px]",
                    task.status === "active" &&
                      "bg-amber-600 text-white hover:bg-amber-700",
                  )}
                  variant={task.status === "active" ? "default" : "outline"}
                  onClick={() => open(task)}
                >
                  <ClipboardCheck className="size-3.5" />
                  Open briefing
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <PreSessionBriefingPanel
        open={panelOpen}
        onOpenChange={(o) => {
          setPanelOpen(o);
          if (!o) setActiveTask(null);
        }}
        task={activeTask}
      />
    </>
  );
}
