"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock,
  Hourglass,
  MapPin,
  PlayCircle,
  Users,
} from "lucide-react";
import type {
  TrainingSeries,
  TrainingSeriesSession,
} from "@/lib/training-series";

type SessionStatus = TrainingSeriesSession["status"];

const SESSION_STATUS_META: Record<
  SessionStatus,
  { label: string; cls: string; icon: typeof CalendarDays }
> = {
  scheduled: {
    label: "Scheduled",
    cls: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200",
    icon: Hourglass,
  },
  "in-progress": {
    label: "In Progress",
    cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200",
    icon: CircleSlash,
  },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Phrasing the attendance count to suit the session's lifecycle. */
function attendanceLabel(session: TrainingSeriesSession): string {
  if (session.status === "cancelled") return "—";
  if (session.status === "completed") {
    return `${session.enrolledCount} attended`;
  }
  if (session.status === "in-progress") {
    return `${session.enrolledCount} present`;
  }
  return `${session.enrolledCount} expected`;
}

export function SeriesSessionsTab({ series }: { series: TrainingSeries }) {
  function handleComplete(session: TrainingSeriesSession) {
    // The Session Completion flow is deferred — the caller asked for the
    // button to surface here while they finalize the spec for the flow.
    toast.message(
      `Session ${session.sessionNumber} — completion flow coming soon`,
      {
        description: `${formatDate(session.date)} · ${formatTimeLabel(session.startTime)} — staff will mark attendance, log notes, and unlock homework here.`,
      },
    );
  }

  if (series.sessions.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border bg-card px-4 py-10 text-center text-sm">
        No sessions are scheduled for this series yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {series.sessions.map((session) => {
        const meta = SESSION_STATUS_META[session.status];
        const StatusIcon = meta.icon;
        const canComplete =
          session.status === "scheduled" || session.status === "in-progress";

        return (
          <li
            key={session.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm",
              "md:flex-row md:items-center",
              session.status === "completed" && "opacity-90",
              session.status === "cancelled" && "opacity-70",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 ring-1 ring-indigo-200/60">
              {session.sessionNumber}
            </div>

            <div className="min-w-0 flex-1 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CalendarDays className="text-muted-foreground size-3.5" />
                <span className="font-semibold text-slate-800">
                  {formatDate(session.date)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="text-muted-foreground size-3.5" />
                <span className="tabular-nums">
                  {formatTimeLabel(session.startTime)}–
                  {formatTimeLabel(session.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="text-muted-foreground size-3.5" />
                {series.instructorName}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="text-muted-foreground size-3.5" />
                <span className="truncate">{series.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("gap-1 border", meta.cls)}
                title={`Status: ${meta.label}`}
              >
                <StatusIcon className="size-3" />
                {meta.label}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums",
                  session.status === "completed" && "bg-emerald-100 text-emerald-700",
                )}
                title="Attendance count"
              >
                <Users className="size-3" />
                {attendanceLabel(session)}
              </span>
            </div>

            <Button
              size="sm"
              disabled={!canComplete}
              onClick={() => handleComplete(session)}
              className={cn(
                canComplete
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "",
              )}
            >
              <CheckCircle2 className="mr-1 size-4" />
              Complete
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
