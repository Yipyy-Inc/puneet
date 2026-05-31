"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  NotebookPen,
  PlayCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  buildPreSessionBriefingTask,
  type PreSessionBriefingTask,
} from "@/lib/training-pre-session";
import { PreSessionBriefingPanel } from "./pre-session-briefing-panel";

/** Format an `HH:MM` 24h time as a 12h label. Pure (no Date) so it's safe to
 *  call during render under the React Compiler. */
function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${period}`;
}

/**
 * Today's Sessions — the trainer's operational daily checklist on the Tasks
 * tab. Lists every session scheduled for today in chronological order; each
 * carries two auto-generated tasks: a "Student Notes Review" (opens the
 * pre-session briefing) and a "Session Complete" (links straight to the live
 * Session View). When a session is completed (status flips to "completed" via
 * the Session View), both of its tasks check off automatically. Keeps trainers
 * on track without navigating the whole module.
 */
export function TrainingTodayTasks() {
  // Pin "now" once at mount (React Compiler purity — no Date reads in render).
  const [nowMs] = useState(() => Date.now());
  const todayStr = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  const { data: sessions = [] } = useQuery(trainingQueries.sessions());
  const { data: classes = [] } = useQuery(trainingQueries.classes());
  const { data: briefedIds = [] } = useQuery(
    trainingQueries.preSessionBriefedSessionIds(),
  );

  const briefedSet = useMemo(() => new Set(briefedIds), [briefedIds]);
  const classById = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes],
  );

  // Every session scheduled for today (cancelled ones drop out), earliest
  // first — completed sessions stay in the list so they read as checked off.
  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.date === todayStr && s.status !== "cancelled")
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, todayStr],
  );

  const completedCount = useMemo(
    () => todaySessions.filter((s) => s.status === "completed").length,
    [todaySessions],
  );

  const [activeTask, setActiveTask] = useState<PreSessionBriefingTask | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useState(false);

  function openBriefing(task: PreSessionBriefingTask) {
    setActiveTask(task);
    setPanelOpen(true);
  }

  return (
    <>
      <section className="bg-card rounded-xl border shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarCheck className="text-indigo-500 size-4" />
            <h2 className="text-sm font-bold tracking-tight text-slate-800">
              Today&apos;s Sessions
            </h2>
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
            >
              {todaySessions.length} session
              {todaySessions.length === 1 ? "" : "s"}
            </Badge>
            {todaySessions.length > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                <CheckCircle2 className="size-3" />
                {completedCount}/{todaySessions.length} complete
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            <Sparkles className="size-3" />
            Review notes, then complete each session — checks off as you go.
          </p>
        </header>

        {todaySessions.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-1.5 px-4 py-10 text-center text-sm">
            <CalendarCheck className="text-muted-foreground/40 size-7" />
            No training sessions scheduled today.
          </div>
        ) : (
          <ul className="divide-y">
            {todaySessions.map((session) => {
              const completed = session.status === "completed";
              // A completed session implicitly clears both tasks; otherwise the
              // briefing task reflects whether it's been marked briefed.
              const briefed = completed || briefedSet.has(session.id);
              const task = buildPreSessionBriefingTask(
                session,
                classById.get(session.classId),
                { briefed, nowMs },
              );
              return (
                <li
                  key={session.id}
                  className={cn(
                    "px-4 py-3",
                    completed && "bg-emerald-50/30",
                  )}
                >
                  {/* Session header */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold tabular-nums text-slate-700">
                      <Clock className="text-slate-400 size-3" />
                      {formatTime(session.startTime)}
                    </span>
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {session.className}
                    </span>
                    {completed && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                      >
                        <CheckCircle2 className="size-3" />
                        Complete
                      </Badge>
                    )}
                    <span className="text-muted-foreground inline-flex flex-wrap items-center gap-x-1.5 text-[11px]">
                      <Users className="size-3" />
                      {session.attendees.length} student
                      {session.attendees.length === 1 ? "" : "s"}
                      <span className="text-muted-foreground/50">·</span>
                      {session.trainerName}
                      {classById.get(session.classId)?.location && (
                        <>
                          <span className="text-muted-foreground/50">·</span>
                          <MapPin className="size-3" />
                          {classById.get(session.classId)?.location}
                        </>
                      )}
                    </span>
                  </div>

                  {/* The two auto-generated tasks for this session */}
                  <div className="mt-2 space-y-1.5 sm:pl-5">
                    <TaskRow
                      done={briefed}
                      icon={NotebookPen}
                      label="Student Notes Review"
                      sublabel="Pre-session briefing"
                      actionLabel={briefed ? "View briefing" : "Open briefing"}
                      onAction={() => openBriefing(task)}
                    />
                    <TaskRow
                      done={completed}
                      icon={PlayCircle}
                      label="Session Complete"
                      sublabel={completed ? "Completed" : "Run today's session"}
                      actionLabel={completed ? "View session" : "Start session"}
                      href={`/facility/dashboard/services/training/session/${session.id}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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

function TaskRow({
  done,
  icon: Icon,
  label,
  sublabel,
  actionLabel,
  onAction,
  href,
}: {
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  actionLabel: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <CheckCircle2 className="text-emerald-600 size-4 shrink-0" />
      ) : (
        <Circle className="text-slate-300 size-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[12.5px] font-medium",
            done
              ? "text-muted-foreground line-through"
              : "text-slate-700",
          )}
        >
          {label}
        </p>
        <p className="text-muted-foreground text-[10.5px]">{sublabel}</p>
      </div>
      {href ? (
        <Button
          asChild
          size="sm"
          variant={done ? "outline" : "default"}
          className={cn(
            "h-7 shrink-0 gap-1 text-[11.5px]",
            !done && "bg-emerald-600 text-white hover:bg-emerald-700",
          )}
        >
          <Link href={href}>
            <Icon className="size-3.5" />
            {actionLabel}
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1 text-[11.5px]"
          onClick={onAction}
        >
          <Icon className="size-3.5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
