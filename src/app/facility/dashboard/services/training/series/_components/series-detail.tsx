"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock,
  DollarSign,
  FileEdit,
  Hourglass,
  MapPin,
  PlayCircle,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  getDayName,
  type SeriesStatus,
  type TrainingSeries,
} from "@/lib/training-series";
import { distinctEnrolledForSeries } from "@/data/training-series";
import { SeriesSessionsTab } from "./series-sessions-tab";
import { SeriesStudentsTab } from "./series-students-tab";

const STATUS_META: Record<
  SeriesStatus,
  { label: string; cls: string; icon: typeof CalendarDays }
> = {
  draft: {
    label: "Draft",
    cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200",
    icon: FileEdit,
  },
  upcoming: {
    label: "Upcoming",
    cls: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200",
    icon: Hourglass,
  },
  active: {
    label: "Active",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    cls: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-200",
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

function endDateFromSeries(series: TrainingSeries): string | null {
  if (series.sessions.length === 0) return null;
  return series.sessions[series.sessions.length - 1].date;
}

function SeriesInfoTile({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800">
        {children}
      </div>
    </div>
  );
}

export function SeriesDetail({ seriesId }: { seriesId: string }) {
  const { data: series } = useQuery(trainingQueries.seriesDetail(seriesId));

  const summary = useMemo(() => {
    if (!series) return null;
    const enrolled = distinctEnrolledForSeries(series);
    const completedSessions = series.sessions.filter(
      (s) => s.status === "completed",
    ).length;
    const cancelledSessions = series.sessions.filter(
      (s) => s.status === "cancelled",
    ).length;
    const scheduledSessions =
      series.sessions.length - completedSessions - cancelledSessions;
    return {
      enrolled,
      completedSessions,
      cancelledSessions,
      scheduledSessions,
    };
  }, [series]);

  if (!series) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        Loading series…
      </div>
    );
  }

  const status = STATUS_META[series.status];
  const StatusIcon = status.icon;
  const endDate = endDateFromSeries(series);

  return (
    <div className="space-y-6">
      {/* Back link + header ─────────────────────────────────────────────── */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-slate-500 hover:text-slate-800"
        >
          <Link href="/facility/dashboard/services/training/series">
            <ArrowLeft className="mr-1 size-4" />
            Back to series list
          </Link>
        </Button>

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {series.seriesName}
              </h2>
              <Badge
                variant="outline"
                className={cn("gap-1 border", status.cls)}
              >
                <StatusIcon className="size-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {series.courseTypeName} · {series.numberOfWeeks} week
              {series.numberOfWeeks === 1 ? "" : "s"} · {series.duration} min
              per session
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Edit series
            </Button>
            {series.status === "draft" && (
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Publish for enrollment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info tiles ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <SeriesInfoTile icon={CalendarDays} label="Start date">
          {formatDate(series.startDate)}
        </SeriesInfoTile>
        <SeriesInfoTile icon={CalendarDays} label="End date">
          {endDate ? formatDate(endDate) : "—"}
        </SeriesInfoTile>
        <SeriesInfoTile icon={Clock} label="Schedule">
          {getDayName(series.dayOfWeek)}s ·{" "}
          <span className="tabular-nums">
            {formatTimeLabel(series.startTime)}
          </span>
        </SeriesInfoTile>
        <SeriesInfoTile icon={Users} label="Instructor">
          {series.instructorName}
        </SeriesInfoTile>
        <SeriesInfoTile icon={MapPin} label="Location">
          {series.location}
        </SeriesInfoTile>
        <SeriesInfoTile icon={BookOpen} label="Capacity">
          <span className="tabular-nums">
            {summary?.enrolled ?? 0}/{series.maxCapacity}
          </span>{" "}
          enrolled
        </SeriesInfoTile>
      </div>

      {/* Mini stats strip ────────────────────────────────────────────── */}
      <div className="bg-card flex flex-wrap gap-x-6 gap-y-2 rounded-xl border px-4 py-3 text-sm text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-slate-400" />
          <span className="tabular-nums font-semibold">
            {series.sessions.length}
          </span>{" "}
          total sessions
        </span>
        {summary && summary.completedSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="tabular-nums font-semibold">
              {summary.completedSessions}
            </span>{" "}
            completed
          </span>
        )}
        {summary && summary.scheduledSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Hourglass className="size-3.5 text-sky-500" />
            <span className="tabular-nums font-semibold">
              {summary.scheduledSessions}
            </span>{" "}
            upcoming
          </span>
        )}
        {summary && summary.cancelledSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CircleSlash className="size-3.5 text-rose-500" />
            <span className="tabular-nums font-semibold">
              {summary.cancelledSessions}
            </span>{" "}
            cancelled
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="size-3.5 text-slate-400" />
          <span className="tabular-nums font-semibold">
            ${series.enrollmentRules.fullPaymentAmount}
          </span>{" "}
          per student
          {series.enrollmentRules.depositRequired > 0 && (
            <span className="text-muted-foreground text-xs">
              {" "}
              (${series.enrollmentRules.depositRequired} deposit)
            </span>
          )}
        </span>
      </div>

      {/* Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <CalendarDays className="size-3.5" />
            Sessions
            <span className="text-muted-foreground ml-1 tabular-nums text-[11px]">
              {series.sessions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <Users className="size-3.5" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-3">
          <SeriesSessionsTab series={series} />
        </TabsContent>

        <TabsContent value="students" className="space-y-3">
          <SeriesStudentsTab series={series} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
