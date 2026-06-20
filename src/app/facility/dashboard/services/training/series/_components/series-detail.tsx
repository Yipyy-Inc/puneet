"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CircleSlash,
  Clock,
  DollarSign,
  FileEdit,
  Hourglass,
  MapPin,
  MessageSquare,
  PlayCircle,
  Users,
  Wallet,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  getDayName,
  type SeriesStatus,
  type TrainingSeries,
} from "@/lib/training-series";
import { summarizeSeriesRevenue } from "@/lib/training-series-revenue";
import { distinctEnrolledForSeries } from "@/data/training-series";
import { SeriesSessionsTab } from "./series-sessions-tab";
import { SeriesStudentsTab } from "./series-students-tab";
import { SeriesWaitlistTab } from "./series-waitlist-tab";
import { SeriesMessageStudentsDialog } from "./series-message-students-dialog";

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

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
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
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
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
  const { data: seriesEnrollments = [] } = useQuery(
    trainingQueries.seriesEnrollments(seriesId),
  );

  const waitlistCount = useMemo(
    () => seriesEnrollments.filter((e) => e.status === "waitlisted").length,
    [seriesEnrollments],
  );

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

  const revenue = useMemo(
    () =>
      series
        ? summarizeSeriesRevenue(seriesEnrollments, series.enrollmentRules)
        : null,
    [seriesEnrollments, series],
  );

  const [messageOpen, setMessageOpen] = useState(false);

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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMessageOpen(true)}
            >
              <MessageSquare className="size-4" />
              Message Students
            </Button>
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
          <span className="font-semibold tabular-nums">
            {series.sessions.length}
          </span>{" "}
          total sessions
        </span>
        {summary && summary.completedSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="font-semibold tabular-nums">
              {summary.completedSessions}
            </span>{" "}
            completed
          </span>
        )}
        {summary && summary.scheduledSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Hourglass className="size-3.5 text-sky-500" />
            <span className="font-semibold tabular-nums">
              {summary.scheduledSessions}
            </span>{" "}
            upcoming
          </span>
        )}
        {summary && summary.cancelledSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CircleSlash className="size-3.5 text-rose-500" />
            <span className="font-semibold tabular-nums">
              {summary.cancelledSessions}
            </span>{" "}
            cancelled
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="size-3.5 text-slate-400" />
          <span className="font-semibold tabular-nums">
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

      {/* Revenue Summary — at-a-glance money picture so managers don't have to
          open Finance. */}
      {revenue && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <DollarSign className="size-4 text-emerald-600" />
            Revenue Summary
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <SeriesInfoTile icon={Users} label="Total enrolled">
              <span className="tabular-nums">{revenue.totalEnrolled}</span>{" "}
              paying student{revenue.totalEnrolled === 1 ? "" : "s"}
              {revenue.compedCount > 0 && (
                <span className="text-muted-foreground text-[11px] font-normal">
                  {" "}
                  · {revenue.compedCount} comped
                </span>
              )}
            </SeriesInfoTile>
            <SeriesInfoTile icon={CircleDollarSign} label="Total collected">
              <span className="text-emerald-700 tabular-nums">
                {formatMoney(revenue.totalCollected)}
              </span>
              <span className="text-muted-foreground text-[11px] font-normal">
                {" "}
                of {formatMoney(revenue.expectedTotal)}
              </span>
            </SeriesInfoTile>
            <SeriesInfoTile icon={Hourglass} label="Deposits outstanding">
              <span className="tabular-nums">
                {formatMoney(revenue.depositOutstanding)}
              </span>
              {revenue.depositOnlyCount > 0 && (
                <span className="text-muted-foreground text-[11px] font-normal">
                  {" "}
                  · {revenue.depositOnlyCount} on deposit
                </span>
              )}
            </SeriesInfoTile>
            <SeriesInfoTile icon={Wallet} label="Remaining balance">
              <span
                className={cn(
                  "tabular-nums",
                  revenue.remainingBalance > 0
                    ? "text-amber-700"
                    : "text-emerald-700",
                )}
              >
                {formatMoney(revenue.remainingBalance)}
              </span>
              {revenue.unpaidCount > 0 && (
                <span className="text-muted-foreground text-[11px] font-normal">
                  {" "}
                  · {revenue.unpaidCount} unpaid
                </span>
              )}
            </SeriesInfoTile>
          </div>
        </div>
      )}

      {/* Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <CalendarDays className="size-3.5" />
            Sessions
            <span className="text-muted-foreground ml-1 text-[11px] tabular-nums">
              {series.sessions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <Users className="size-3.5" />
            Students
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="gap-1.5">
            <Hourglass className="size-3.5" />
            Waitlist
            {waitlistCount > 0 && (
              <span
                className={cn(
                  "ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  "bg-amber-500 text-white",
                )}
              >
                {waitlistCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-3">
          <SeriesSessionsTab series={series} />
        </TabsContent>

        <TabsContent value="students" className="space-y-3">
          <SeriesStudentsTab series={series} />
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-3">
          <SeriesWaitlistTab series={series} />
        </TabsContent>
      </Tabs>

      <SeriesMessageStudentsDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        series={series}
        enrollments={seriesEnrollments}
      />
    </div>
  );
}
