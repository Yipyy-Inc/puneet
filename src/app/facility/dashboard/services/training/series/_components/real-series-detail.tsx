"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  Clock,
  DollarSign,
  Hourglass,
  MapPin,
  PlayCircle,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { getDayName } from "@/lib/training-series";
import {
  useTrainingSeriesDetail,
  useTrainingSeriesEnrollments,
  useEnrollInTrainingSeries,
  useWithdrawFromTrainingSeries,
} from "@/lib/api/training-series";
import type { RealTrainingSeries } from "@/types/training-series";
import { RealSeriesEditDialog } from "./real-series-edit-dialog";

// ============================================================================
// A real series' detail page. Smaller than the mock SeriesDetail it replaces
// -- no waitlist promotion UI beyond what the enroll RPC already does, no
// messaging (no real training-messaging integration exists), no revenue
// summary (deposit/comped concepts don't have a real counterpart; every
// session is a real booking already visible on the regular Reports page and
// the check-in board). Two tabs collapse into one roster list here since the
// real model doesn't distinguish a "sessions" concept worth a separate tab
// beyond what's already shown in the header stats.
// ============================================================================

type DisplayStatus = "upcoming" | "active" | "completed" | "cancelled";

const STATUS_META: Record<
  DisplayStatus,
  { label: string; cls: string; icon: typeof CalendarDays }
> = {
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

function displayStatus(s: RealTrainingSeries): DisplayStatus {
  if (s.status === "cancelled" || s.status === "completed") return s.status;
  const today = new Date().toISOString().slice(0, 10);
  return s.startDate > today ? "upcoming" : "active";
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** `date`/`time` already read on the facility's own clock -- see wallClockParts. */
function formatSessionDateTime(date: string, time: string): string {
  const d = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${d}, ${formatTimeLabel(`${time}:00`)}`;
}

function formatTimeLabel(hhmmss: string): string {
  const [h, m] = hhmmss.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function InfoTile({
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

export function RealSeriesDetail({ seriesId }: { seriesId: string }) {
  const { data, isPending, error } = useTrainingSeriesDetail(seriesId);
  const { data: enrollments = [] } = useTrainingSeriesEnrollments(seriesId);
  const enroll = useEnrollInTrainingSeries();
  const withdraw = useWithdrawFromTrainingSeries();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [clientRef, setClientRef] = useState("");
  const [petRef, setPetRef] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        Loading series…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="py-12 text-center text-sm text-red-600">
        {error?.message ?? "Series not found."}
      </div>
    );
  }

  const { series, sessions } = data;
  const status = STATUS_META[displayStatus(series)];
  const StatusIcon = status.icon;
  const endDate = sessions.at(-1)?.startDate ?? null;
  const completedSessions = sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const cancelledSessions = sessions.filter(
    (s) => s.status === "cancelled",
  ).length;
  const scheduledSessions =
    sessions.length - completedSessions - cancelledSessions;

  const enrolled = enrollments.filter((e) => e.status === "enrolled");
  const waitlisted = enrollments.filter((e) => e.status === "waitlisted");
  // A withdrawn pet leaves the roster rather than lingering with no badge and
  // no action -- the partial-unique index lets the same pet re-enroll later.
  const roster = enrollments.filter((e) => e.status !== "cancelled");

  function submitAdd() {
    setAddError(null);
    const client = Number(clientRef);
    const pet = Number(petRef);
    if (!client || !pet) {
      setAddError(
        "Enter a real client # and pet # (from the client's record).",
      );
      return;
    }
    enroll.mutate(
      { seriesId, clientId: client, petId: pet },
      {
        onSuccess: (result) => {
          toast.success(
            result.enrollment.status === "waitlisted"
              ? "Added to the waitlist"
              : `Enrolled — ${result.bookings.length} session${result.bookings.length === 1 ? "" : "s"} booked`,
          );
          setAddOpen(false);
          setClientRef("");
          setPetRef("");
        },
        onError: (err: Error) => setAddError(err.message),
      },
    );
  }

  function handleWithdraw(enrollmentId: string) {
    withdraw.mutate(
      { enrollmentId, seriesId },
      {
        onSuccess: () => toast.success("Withdrawn"),
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-6">
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
                {series.name}
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
              {series.courseTypeName || "No course type"} ·{" "}
              {series.numberOfSessions} session
              {series.numberOfSessions === 1 ? "" : "s"} ·{" "}
              {series.durationMinutes} min per session
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="size-4" />
              Add Student
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              Edit series
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <InfoTile icon={CalendarDays} label="Start date">
          {formatDate(series.startDate)}
        </InfoTile>
        <InfoTile icon={CalendarDays} label="End date">
          {endDate ? formatDate(endDate) : "—"}
        </InfoTile>
        <InfoTile icon={Clock} label="Schedule">
          {getDayName(series.dayOfWeek)}s ·{" "}
          <span className="tabular-nums">
            {formatTimeLabel(series.startTime)}
          </span>
        </InfoTile>
        <InfoTile icon={Users} label="Instructor">
          {series.staffName ?? "Unassigned"}
        </InfoTile>
        <InfoTile icon={MapPin} label="Location">
          {series.locationName ?? "Any location"}
        </InfoTile>
        <InfoTile icon={BookOpen} label="Capacity">
          <span className="tabular-nums">
            {series.enrolledCount}/{series.capacity}
          </span>{" "}
          enrolled
        </InfoTile>
      </div>

      <div className="bg-card flex flex-wrap gap-x-6 gap-y-2 rounded-xl border px-4 py-3 text-sm text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-slate-400" />
          <span className="font-semibold tabular-nums">
            {sessions.length}
          </span>{" "}
          total sessions
        </span>
        {completedSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="font-semibold tabular-nums">
              {completedSessions}
            </span>{" "}
            completed
          </span>
        )}
        {scheduledSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Hourglass className="size-3.5 text-sky-500" />
            <span className="font-semibold tabular-nums">
              {scheduledSessions}
            </span>{" "}
            upcoming
          </span>
        )}
        {cancelledSessions > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CircleSlash className="size-3.5 text-rose-500" />
            <span className="font-semibold tabular-nums">
              {cancelledSessions}
            </span>{" "}
            cancelled
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="size-3.5 text-slate-400" />
          <span className="font-semibold tabular-nums">
            ${series.totalPrice.toLocaleString()}
          </span>{" "}
          per student total
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <CalendarDays className="size-4" />
            Sessions
          </div>
          <div className="divide-y rounded-xl border bg-white">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>
                  Session {s.sessionNumber} ·{" "}
                  {formatSessionDateTime(s.startDate, s.startTime)}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    s.status === "completed" &&
                      "border-emerald-200 bg-emerald-100 text-emerald-700",
                    s.status === "cancelled" &&
                      "border-rose-200 bg-rose-100 text-rose-700",
                    s.status === "scheduled" &&
                      "border-sky-200 bg-sky-100 text-sky-700",
                  )}
                >
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Users className="size-4" />
            Students
            <span className="text-muted-foreground text-[11px] font-normal">
              {enrolled.length} enrolled
              {waitlisted.length > 0 && ` · ${waitlisted.length} waitlisted`}
            </span>
          </div>
          <div className="divide-y rounded-xl border bg-white">
            {roster.length === 0 && (
              <p className="text-muted-foreground p-3 text-sm">
                No one enrolled yet.
              </p>
            )}
            {roster.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {e.petName ?? "Pet"}{" "}
                    <span className="text-muted-foreground font-normal">
                      · {e.clientName ?? "Client"}
                    </span>
                  </p>
                  {e.status === "waitlisted" && (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-100 text-[10px] text-amber-700"
                    >
                      Waitlisted
                    </Badge>
                  )}
                </div>
                {(e.status === "enrolled" || e.status === "waitlisted") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleWithdraw(e.id)}
                    title="Withdraw"
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <RealSeriesEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={series}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Enter the client and pet numbers from their record. Every
              remaining session is booked for real.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Client #</Label>
              <Input
                value={clientRef}
                onChange={(e) => setClientRef(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label>Pet #</Label>
              <Input
                value={petRef}
                onChange={(e) => setPetRef(e.target.value)}
                inputMode="numeric"
              />
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={submitAdd}
              disabled={enroll.isPending}
            >
              {enroll.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
