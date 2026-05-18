"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CircleSlash,
  Clock,
  GraduationCap,
  Heart,
  Lightbulb,
  Lock,
  MapPin,
  PlayCircle,
  ShieldAlert,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import type { TrainerNote, TrainerNoteCategory } from "@/types/training";
import type {
  SeriesPaymentStatus,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type {
  TrainingSeries,
  TrainingSeriesSession,
} from "@/lib/training-series";

const PAYMENT_META: Record<
  SeriesPaymentStatus,
  { label: string; cls: string }
> = {
  paid: {
    label: "Paid",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  deposit: {
    label: "Deposit",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  unpaid: {
    label: "Unpaid",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
  },
  refunded: {
    label: "Refunded",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  },
  comped: {
    label: "Comped",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
  },
};

const NOTE_META: Record<
  TrainerNoteCategory,
  { label: string; cls: string; Icon: typeof Heart }
> = {
  behavior: {
    label: "Behavior",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    Icon: Heart,
  },
  progress: {
    label: "Progress",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: PlayCircle,
  },
  concern: {
    label: "Concern",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: TriangleAlert,
  },
  achievement: {
    label: "Achievement",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
    Icon: Award,
  },
  general: {
    label: "General",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: Lightbulb,
  },
};

const SESSION_STATUS_META: Record<
  TrainingSeriesSession["status"],
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  scheduled: {
    label: "Scheduled",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    Icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    Icon: CircleSlash,
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

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof CalendarDays;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" />
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface Props {
  petId: number;
  enrollments: TrainingEnrollment[];
  seriesById: Map<string, TrainingSeries>;
  primaryEnrollment: TrainingEnrollment | null;
  trainerNotes: TrainerNote[];
  todayISO: string;
}

export function TrainingProfileOverview({
  enrollments,
  seriesById,
  primaryEnrollment,
  trainerNotes,
  todayISO,
}: Props) {
  // Active series — the series record behind the primary enrollment.
  const activeSeries = useMemo(() => {
    if (!primaryEnrollment) return null;
    return seriesById.get(primaryEnrollment.seriesId) ?? null;
  }, [primaryEnrollment, seriesById]);

  // Upcoming sessions — future sessions from any series the pet is actively
  // enrolled in. Sorted soonest-first, capped to keep the panel tight.
  const upcomingSessions = useMemo(() => {
    const out: { session: TrainingSeriesSession; series: TrainingSeries }[] =
      [];
    for (const e of enrollments) {
      if (e.status !== "enrolled" && e.status !== "waitlisted") continue;
      const series = seriesById.get(e.seriesId);
      if (!series) continue;
      for (const sess of series.sessions) {
        if (sess.date < todayISO) continue;
        if (sess.status === "cancelled") continue;
        out.push({ session: sess, series });
      }
    }
    out.sort((a, b) => {
      if (a.session.date !== b.session.date)
        return a.session.date < b.session.date ? -1 : 1;
      return a.session.startTime < b.session.startTime ? -1 : 1;
    });
    return out.slice(0, 5);
  }, [enrollments, seriesById, todayISO]);

  // Last three sessions — past sessions from any series the pet was enrolled
  // in. Cancelled sessions kept (staff want to see them); sorted most-recent
  // first.
  const recentSessions = useMemo(() => {
    const out: { session: TrainingSeriesSession; series: TrainingSeries }[] =
      [];
    for (const e of enrollments) {
      const series = seriesById.get(e.seriesId);
      if (!series) continue;
      for (const sess of series.sessions) {
        if (sess.date >= todayISO) continue;
        out.push({ session: sess, series });
      }
    }
    out.sort((a, b) => {
      if (a.session.date !== b.session.date)
        return a.session.date < b.session.date ? 1 : -1;
      return a.session.startTime < b.session.startTime ? 1 : -1;
    });
    return out.slice(0, 3);
  }, [enrollments, seriesById, todayISO]);

  // Next session date — used inside the package progress panel.
  const nextSessionDate = upcomingSessions[0]?.session.date ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Active enrollment ────────────────────────────────────────────── */}
      <Panel title="Active enrollment" icon={GraduationCap}>
        {!primaryEnrollment || !activeSeries ? (
          <p className="text-muted-foreground text-sm">
            No active enrollment. This pet has no current training series.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-800">
                  {activeSeries.seriesName}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {activeSeries.courseTypeName}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/facility/dashboard/services/training/series/${activeSeries.id}`}
                >
                  Open series
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="text-muted-foreground size-3.5" />
                {activeSeries.instructorName}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="text-muted-foreground size-3.5" />
                <span className="truncate">{activeSeries.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground size-3.5" />
                Starts {formatShortDate(activeSeries.startDate)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground size-3.5" />
                {activeSeries.numberOfWeeks} week
                {activeSeries.numberOfWeeks === 1 ? "" : "s"} ·{" "}
                {activeSeries.duration}m
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {primaryEnrollment.paymentStatus && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 border",
                    PAYMENT_META[primaryEnrollment.paymentStatus].cls,
                  )}
                >
                  <CircleDollarSign className="size-3" />
                  {PAYMENT_META[primaryEnrollment.paymentStatus].label}
                </Badge>
              )}
              {primaryEnrollment.handlerName && (
                <Badge
                  variant="outline"
                  className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                >
                  Handler: {primaryEnrollment.handlerName}
                </Badge>
              )}
              {primaryEnrollment.status === "waitlisted" && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-200 bg-amber-50 text-amber-700"
                >
                  <Lock className="size-3" />
                  Waitlisted
                </Badge>
              )}
            </div>
            {primaryEnrollment.notes && (
              <p className="bg-muted/40 rounded-md px-3 py-2 text-xs text-slate-600">
                <StickyNote className="mr-1.5 inline size-3 align-text-bottom" />
                {primaryEnrollment.notes}
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* Package progress ────────────────────────────────────────────── */}
      <Panel title="Package progress" icon={BookOpen}>
        {!primaryEnrollment || primaryEnrollment.totalSessions === 0 ? (
          <p className="text-muted-foreground text-sm">
            No package in progress right now.
          </p>
        ) : (
          (() => {
            const pct = Math.round(
              (primaryEnrollment.sessionsAttended /
                primaryEnrollment.totalSessions) *
                100,
            );
            return (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold tabular-nums text-slate-900">
                    {primaryEnrollment.sessionsAttended}
                    <span className="text-muted-foreground text-base font-normal">
                      {" "}
                      / {primaryEnrollment.totalSessions} sessions
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-700">
                    {pct}%
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      pct >= 80
                        ? "bg-emerald-500"
                        : pct >= 40
                          ? "bg-sky-500"
                          : "bg-amber-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      Next session
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                      {nextSessionDate
                        ? formatShortDate(nextSessionDate)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      Currently on
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                      Session{" "}
                      {Math.min(
                        primaryEnrollment.currentSessionNumber,
                        primaryEnrollment.totalSessions,
                      )}{" "}
                      of {primaryEnrollment.totalSessions}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </Panel>

      {/* Upcoming sessions ───────────────────────────────────────────── */}
      <Panel
        title="Upcoming sessions"
        icon={Clock}
        action={
          upcomingSessions.length > 0 ? (
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {upcomingSessions.length}
            </span>
          ) : null
        }
      >
        {upcomingSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing scheduled. Enroll this pet in a series to add sessions.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcomingSessions.map(({ session, series }) => {
              const meta = SESSION_STATUS_META[session.status];
              const StatusIcon = meta.Icon;
              return (
                <li
                  key={session.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="bg-indigo-100 flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-indigo-700">
                    {session.sessionNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {formatDate(session.date)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatTimeLabel(session.startTime)} ·{" "}
                      {series.instructorName} · {series.location}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("gap-1 border text-[10px]", meta.cls)}
                  >
                    <StatusIcon className="size-3" />
                    {meta.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Last three sessions ─────────────────────────────────────────── */}
      <Panel title="Last three sessions" icon={CheckCircle2}>
        {recentSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No past sessions yet — this pet hasn&apos;t attended training.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentSessions.map(({ session, series }) => {
              const meta = SESSION_STATUS_META[session.status];
              const StatusIcon = meta.Icon;
              return (
                <li
                  key={session.id}
                  className={cn(
                    "rounded-lg border border-slate-100 px-3 py-2",
                    session.status === "cancelled" && "opacity-70",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-slate-700">
                      {session.sessionNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {formatDate(session.date)}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {series.seriesName} · {series.instructorName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("gap-1 border text-[10px]", meta.cls)}
                    >
                      <StatusIcon className="size-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  {session.notes && (
                    <p className="bg-muted/40 mt-2 rounded-md px-2.5 py-1.5 text-[11px]/relaxed text-slate-600">
                      <StickyNote className="mr-1 inline size-3 align-text-bottom" />
                      {session.notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Instructor notes feed ───────────────────────────────────────── */}
      <Panel
        title="Instructor notes"
        icon={StickyNote}
        action={
          trainerNotes.length > 0 ? (
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {trainerNotes.length}
            </span>
          ) : null
        }
      >
        {trainerNotes.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldAlert className="size-4 text-slate-300" />
            No trainer notes have been logged yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {trainerNotes.slice(0, 6).map((n) => {
              const meta = NOTE_META[n.category];
              const NoteIcon = meta.Icon;
              return (
                <li
                  key={n.id}
                  className="rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("gap-1 border text-[10px]", meta.cls)}
                      >
                        <NoteIcon className="size-3" />
                        {meta.label}
                      </Badge>
                      {n.isPrivate && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                          title="Private — not visible to clients"
                        >
                          <Lock className="size-2.5" />
                          Private
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {formatShortDate(n.date)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px]/relaxed text-slate-700">
                    {n.note}
                  </p>
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    — {n.trainerName}
                    {n.className ? ` · ${n.className}` : ""}
                  </p>
                </li>
              );
            })}
            {trainerNotes.length > 6 && (
              <li className="text-muted-foreground text-center text-xs">
                +{trainerNotes.length - 6} older note
                {trainerNotes.length - 6 === 1 ? "" : "s"} — see the Notes tab
                when it ships.
              </li>
            )}
          </ul>
        )}
      </Panel>
    </div>
  );
}
