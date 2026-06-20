"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  MoreHorizontal,
  Pause,
  PawPrint,
  Play,
  Plus,
  StickyNote,
  Trash2,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { autoPromoteNextWaitlist } from "@/lib/waitlist-auto-promote";
import type {
  SeriesPaymentStatus,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import { clients } from "@/data/clients";

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

const STATUS_META: Record<
  TrainingEnrollment["status"],
  { label: string; cls: string }
> = {
  enrolled: {
    label: "Enrolled",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  dropped: {
    // Displayed as "Withdrawn" per spec — the enum stays `dropped` for
    // backward compat with existing data + filters that already check
    // `status === "dropped"`.
    label: "Withdrawn",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
  },
  waitlisted: {
    label: "Waitlisted",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  paused: {
    label: "Paused",
    cls: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

export function SeriesStudentsTab({ series }: { series: TrainingSeries }) {
  const queryClient = useQueryClient();
  // Make-up session picker needs the full attendance catalog so it can
  // pin the makeup to the student's most-recent absent session.
  const { data: allAttendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
  // Pull every series enrollment too — drives capacity-aware filtering
  // when surfacing other cohorts for the picker.
  const { data: allSeriesEnrollmentsForMakeup = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: serverEnrollments = [] } = useQuery(
    trainingQueries.seriesEnrollments(series.id),
  );
  const { data: allSeries = [] } = useQuery(trainingQueries.series());

  // Mirror the series-list pattern: layer optimistic overrides on top of the
  // mock-driven server list so add/remove/drop/move read back immediately.
  const [overrides, setOverrides] = useState<
    Record<string, TrainingEnrollment | null>
  >({});

  const enrollments = useMemo(() => {
    const out: TrainingEnrollment[] = [];
    const seen = new Set<string>();
    for (const e of serverEnrollments) {
      if (overrides[e.id] === null) continue;
      out.push(overrides[e.id] ?? e);
      seen.add(e.id);
    }
    for (const [id, ov] of Object.entries(overrides)) {
      if (!ov) continue;
      if (seen.has(id)) continue;
      if (ov.seriesId !== series.id) continue;
      out.push(ov);
    }
    return out;
  }, [serverEnrollments, overrides, series.id]);

  // Add Student dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addPetKey, setAddPetKey] = useState<string>(""); // "<clientId>:<petId>"
  const [addPayment, setAddPayment] = useState<SeriesPaymentStatus>("deposit");
  const [addNotes, setAddNotes] = useState("");

  // Remove confirmation
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Drop confirmation
  const [droppingId, setDroppingId] = useState<string | null>(null);

  // Move-series dialog
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTargetSeriesId, setMoveTargetSeriesId] = useState("");

  // Pause dialog state — captures reason + optional expected return date.
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseReturnDate, setPauseReturnDate] = useState<string | undefined>(
    undefined,
  );

  // Resume confirmation — paused enrollments flip back to "enrolled".
  const [resumingId, setResumingId] = useState<string | null>(null);

  // Add make-up session dialog — staff pick a future session in another
  // cohort of the same course type that has capacity.
  const [makeupTargetId, setMakeupTargetId] = useState<string | null>(null);
  const [makeupPickedKey, setMakeupPickedKey] = useState<string>("");
  const [makeupNotes, setMakeupNotes] = useState("");

  // Remove-from-series dialog state — captures structured reason +
  // refund/credit decision per the spec.
  const [dropReasonCategory, setDropReasonCategory] = useState<
    "client-requested" | "no-show-policy" | "other"
  >("client-requested");
  const [dropReason, setDropReason] = useState("");
  const [dropRefund, setDropRefund] = useState<
    "full-refund" | "partial-refund" | "account-credit" | "no-refund"
  >("no-refund");

  // Dogs from the clients mock for the Add Student picker.
  const petOptions = useMemo(() => {
    const out: {
      key: string;
      petId: number;
      petName: string;
      petBreed: string;
      ownerId: number;
      ownerName: string;
      ownerPhone: string;
      ownerEmail: string;
    }[] = [];
    for (const c of clients) {
      for (const p of c.pets) {
        if (p.type !== "Dog") continue;
        out.push({
          key: `${c.id}:${p.id}`,
          petId: p.id,
          petName: p.name,
          petBreed: p.breed,
          ownerId: c.id,
          ownerName: c.name,
          ownerPhone: c.phone ?? "",
          ownerEmail: c.email,
        });
      }
    }
    return out.sort((a, b) => a.petName.localeCompare(b.petName));
  }, []);

  const otherSeriesOptions = useMemo(() => {
    return allSeries
      .filter(
        (s) =>
          s.id !== series.id &&
          s.courseTypeId === series.courseTypeId &&
          (s.status === "upcoming" || s.status === "active"),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [allSeries, series.id, series.courseTypeId]);

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: ["training", "series", series.id, "enrollments"],
    });
  }

  /** Fire auto-promote after a student leaves: scan the waitlist for the
   *  next eligible candidate, send them an Offer Spot invitation, and toast
   *  the staff. Wording matches the spec. */
  function runWaitlistAutoPromote(
    excludeEnrollmentId: string,
    triggerLabel: "removed" | "dropped" | "moved",
  ) {
    const holdHours = Math.max(
      1,
      queryClient.getQueryData<{ waitlistHoldHours: number }>(
        trainingQueries.moduleSettings().queryKey,
      )?.waitlistHoldHours ?? 24,
    );
    // Use the cache as the source of truth — the Students-tab overrides
    // live in local state and don't participate in cross-tab visibility.
    const cacheEnrollments =
      queryClient.getQueryData<TrainingEnrollment[]>(
        trainingQueries.seriesEnrollments(series.id).queryKey,
      ) ?? [];
    const { promoted } = autoPromoteNextWaitlist({
      queryClient,
      seriesId: series.id,
      enrollments: cacheEnrollments,
      excludeEnrollmentId,
      holdHours,
    });
    if (!promoted) return;
    void triggerLabel;
    toast.success(
      `1 waitlist client has been notified of the open spot in ${series.seriesName}.`,
      {
        description: `${promoted.petName} (${promoted.ownerName}) has ${holdHours}h to confirm before the spot moves on.`,
        duration: 8_000,
      },
    );
  }

  /** Mirror the local override into the shared series-enrollments cache so
   *  other tabs (Waitlist, HQ rollups) see the change immediately. Used by
   *  remove + drop so the freed seat is visible everywhere, not just here. */
  function applyEnrollmentToCache(
    enrollmentId: string,
    update: (e: TrainingEnrollment) => TrainingEnrollment | null,
  ) {
    const cache = queryClient.getQueryCache();
    const apply = (queryKey: readonly unknown[]) => {
      queryClient.setQueryData<TrainingEnrollment[]>(queryKey, (prev = []) => {
        const idx = prev.findIndex((e) => e.id === enrollmentId);
        if (idx === -1) return prev;
        const next = prev.slice();
        const updated = update(prev[idx]!);
        if (updated === null) {
          next.splice(idx, 1);
        } else {
          next[idx] = updated;
        }
        return next;
      });
    };
    cache
      .findAll({ queryKey: ["training", "series-enrollments"] })
      .forEach((q) => apply(q.queryKey));
    cache.findAll({ queryKey: ["training", "series"] }).forEach((q) => {
      if (q.queryKey[3] !== "enrollments") return;
      apply(q.queryKey);
    });
  }

  function handleAdd() {
    if (!addPetKey) {
      toast.error("Pick a dog to enroll.");
      return;
    }
    const pet = petOptions.find((p) => p.key === addPetKey);
    if (!pet) return;
    const id = `series-enroll-${series.id}-new-${Date.now()}`;
    const next: TrainingEnrollment = {
      id,
      seriesId: series.id,
      seriesName: series.seriesName,
      courseTypeId: series.courseTypeId,
      courseTypeName: series.courseTypeName,
      petId: pet.petId,
      petName: pet.petName,
      petBreed: pet.petBreed,
      ownerId: pet.ownerId,
      ownerName: pet.ownerName,
      ownerPhone: pet.ownerPhone,
      ownerEmail: pet.ownerEmail,
      enrollmentDate: new Date().toISOString().split("T")[0],
      status: "enrolled",
      sessionsAttended: 0,
      totalSessions: series.numberOfWeeks,
      currentSessionNumber: 1,
      progress: 0,
      paymentStatus: addPayment,
      notes: addNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setOverrides((prev) => ({ ...prev, [id]: next }));
    toast.success(`${pet.petName} enrolled in ${series.seriesName}.`);
    setAddOpen(false);
    setAddPetKey("");
    setAddPayment("deposit");
    setAddNotes("");
    invalidate();
  }

  function handleRemove() {
    if (!removingId) return;
    const target = enrollments.find((e) => e.id === removingId);
    // Was this an active enrollment (the kind that frees a seat)? Removing
    // a waitlisted entry should NOT trigger auto-promote.
    const freedSeat = target?.status === "enrolled";
    setOverrides((prev) => ({ ...prev, [removingId]: null }));
    applyEnrollmentToCache(removingId, () => null);
    toast.success("Student removed from this series.");
    const removedId = removingId;
    setRemovingId(null);
    invalidate();
    if (freedSeat) runWaitlistAutoPromote(removedId, "removed");
  }

  function handleDrop() {
    if (!droppingId) return;
    const target = enrollments.find((e) => e.id === droppingId);
    if (!target) return;
    const nowISO = new Date().toISOString();
    const freedSeat =
      target.status === "enrolled" || target.status === "paused";
    const dropPayload = {
      status: "dropped" as const,
      droppedAt: nowISO,
      dropReason: dropReason.trim() || undefined,
      dropReasonCategory,
      dropRefundDecision: dropRefund,
      updatedAt: nowISO,
    };
    setOverrides((prev) => ({
      ...prev,
      [droppingId]: { ...target, ...dropPayload },
    }));
    applyEnrollmentToCache(droppingId, (e) => ({ ...e, ...dropPayload }));
    const refundCopy =
      dropRefund === "full-refund"
        ? "Tagged for full refund — billing module handles the payout."
        : dropRefund === "partial-refund"
          ? "Tagged for partial refund — billing module handles the payout."
          : dropRefund === "account-credit"
            ? "Tagged for account credit — applied to the client's balance."
            : "No refund noted.";
    toast.success(`${target.petName} withdrawn from ${series.seriesName}.`, {
      description: `${refundCopy} Their calendar slot is now open.`,
    });
    const droppedId = droppingId;
    setDroppingId(null);
    setDropReason("");
    setDropReasonCategory("client-requested");
    setDropRefund("no-refund");
    invalidate();
    if (freedSeat) runWaitlistAutoPromote(droppedId, "dropped");
  }

  function handlePause() {
    if (!pausingId) return;
    const target = enrollments.find((e) => e.id === pausingId);
    if (!target) return;
    const nowISO = new Date().toISOString();
    const pausePayload = {
      status: "paused" as const,
      pauseReason: pauseReason.trim() || undefined,
      pauseExpectedReturnDate: pauseReturnDate,
      pausedAt: nowISO,
      updatedAt: nowISO,
    };
    setOverrides((prev) => ({
      ...prev,
      [pausingId]: { ...target, ...pausePayload },
    }));
    applyEnrollmentToCache(pausingId, (e) => ({ ...e, ...pausePayload }));
    toast.success(`${target.petName} is paused.`, {
      description: pauseReturnDate
        ? `Expected back ${formatHumanDate(pauseReturnDate)}.`
        : "No return date set.",
    });
    setPausingId(null);
    setPauseReason("");
    setPauseReturnDate(undefined);
    invalidate();
  }

  function handleResume() {
    if (!resumingId) return;
    const target = enrollments.find((e) => e.id === resumingId);
    if (!target) return;
    const nowISO = new Date().toISOString();
    const resumePayload = {
      status: "enrolled" as const,
      pauseReason: undefined,
      pauseExpectedReturnDate: undefined,
      pausedAt: undefined,
      updatedAt: nowISO,
    };
    setOverrides((prev) => ({
      ...prev,
      [resumingId]: { ...target, ...resumePayload },
    }));
    applyEnrollmentToCache(resumingId, (e) => ({ ...e, ...resumePayload }));
    toast.success(`${target.petName} resumed — back to active.`);
    setResumingId(null);
    invalidate();
  }

  function handleAddMakeup() {
    if (!makeupTargetId || !makeupPickedKey) return;
    const target = enrollments.find((e) => e.id === makeupTargetId);
    if (!target) return;
    // Parse the picker key — `${seriesId}::${sessionId}` — and resolve the
    // candidate series + session for record-keeping.
    const [pickedSeriesId, pickedSessionId] = makeupPickedKey.split("::");
    const pickedSeries = allSeries.find((s) => s.id === pickedSeriesId);
    if (!pickedSeries) return;
    const pickedSession = pickedSeries.sessions.find(
      (sess) => sess.id === pickedSessionId,
    );
    if (!pickedSession) return;

    const nowISO = new Date().toISOString();
    // Find the most recent absent attendance for this enrollment — that's
    // the missed session we're scheduling a make-up against.
    const missedAttendance = allAttendances
      .filter(
        (a) =>
          a.enrollmentId === target.id &&
          a.status === "absent" &&
          a.sessionDate <= nowISO.slice(0, 10),
      )
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0];

    // Append a make-up record to the shared catalog. Customer make-up tab
    // + the per-pet History view both read from this key.
    const makeupId = `makeup-${target.id}-${nowISO}`;
    queryClient.setQueryData<unknown[]>(
      trainingQueries.allMakeupSessions().queryKey,
      (prev = []) => [
        ...prev,
        {
          id: makeupId,
          enrollmentId: target.id,
          missedSessionId: missedAttendance?.sessionId ?? "",
          missedSessionNumber: missedAttendance?.sessionNumber ?? 0,
          missedSessionDate: missedAttendance?.sessionDate ?? "",
          status: "scheduled",
          scheduledDate: pickedSession.date,
          scheduledTime: pickedSession.startTime,
          price: 0,
          trainerId: pickedSeries.instructorId,
          trainerName: pickedSeries.instructorName,
          notes: makeupNotes.trim(),
          targetSeriesId: pickedSeries.id,
          targetSeriesName: pickedSeries.seriesName,
          createdAt: nowISO,
          updatedAt: nowISO,
        },
      ],
    );

    // Mark the missed attendance with an "Absent-Makeup" note so the
    // History view surfaces the make-up the next time it renders.
    if (missedAttendance) {
      const makeupNote = `Absent-Makeup: scheduled for ${pickedSession.date} (${pickedSeries.seriesName}, session ${pickedSession.sessionNumber})`;
      const updatedNotes = missedAttendance.trainerNotes
        ? `${makeupNote}\n${missedAttendance.trainerNotes}`
        : makeupNote;
      const cache = queryClient.getQueryCache();
      cache.findAll({ queryKey: ["training", "attendances"] }).forEach((q) => {
        queryClient.setQueryData<typeof allAttendances>(
          q.queryKey,
          (prev = []) =>
            prev.map((a) =>
              a.id === missedAttendance.id
                ? { ...a, trainerNotes: updatedNotes, updatedAt: nowISO }
                : a,
            ),
        );
      });
    }

    toast.success(
      `${target.petName} added as a make-up guest in ${pickedSeries.seriesName}.`,
      {
        description: `Scheduled for ${pickedSession.date} at ${pickedSession.startTime}. Owner notified.`,
      },
    );
    setMakeupTargetId(null);
    setMakeupPickedKey("");
    setMakeupNotes("");
  }

  function formatHumanDate(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleMove() {
    if (!movingId || !moveTargetSeriesId) return;
    const target = enrollments.find((e) => e.id === movingId);
    const dest = allSeries.find((s) => s.id === moveTargetSeriesId);
    if (!target || !dest) return;
    // Preserve completed session history per spec — sessionsAttended +
    // currentSessionNumber + progress all carry forward into the new series.
    const newId = `${target.id}-moved-${dest.id}`;
    const nowISO = new Date().toISOString();
    const transferred: TrainingEnrollment = {
      ...target,
      id: newId,
      seriesId: dest.id,
      seriesName: dest.seriesName,
      courseTypeId: dest.courseTypeId,
      courseTypeName: dest.courseTypeName,
      status: "enrolled",
      updatedAt: nowISO,
    };
    setOverrides((prev) => ({
      ...prev,
      [target.id]: null,
      [newId]: transferred,
    }));
    // Mirror into the shared cache so the destination series' Students tab
    // sees the new entry on next render — without this, the move only
    // appears in this tab's local overrides.
    applyEnrollmentToCache(target.id, () => null);
    const cache = queryClient.getQueryCache();
    const destKey = trainingQueries.seriesEnrollments(dest.id).queryKey;
    queryClient.setQueryData<TrainingEnrollment[]>(destKey, (prev = []) => [
      ...prev,
      transferred,
    ]);
    cache
      .findAll({ queryKey: ["training", "series-enrollments"] })
      .forEach((q) => {
        queryClient.setQueryData<TrainingEnrollment[]>(
          q.queryKey,
          (prev = []) => [...prev, transferred],
        );
      });

    toast.success(`${target.petName} transferred to ${dest.seriesName}.`, {
      description: `Completed session history preserved. ${target.ownerName} notified by SMS + email with the new schedule.`,
    });
    setMovingId(null);
    setMoveTargetSeriesId("");
    invalidate();
    queryClient.invalidateQueries({
      queryKey: ["training", "series", dest.id, "enrollments"],
    });
  }

  const columns: ColumnDef<TrainingEnrollment>[] = [
    {
      key: "ownerName",
      label: "Owner",
      sortable: true,
      render: (e) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{e.ownerName}</span>
          {e.ownerPhone && (
            <span className="text-muted-foreground text-[11px]">
              {e.ownerPhone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "petName",
      label: "Dog",
      sortable: true,
      render: (e) => (
        <div className="flex items-center gap-2">
          <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full">
            <PawPrint className="text-muted-foreground size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{e.petName}</span>
            <span className="text-muted-foreground text-[11px]">
              {e.petBreed}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "sessionsAttended",
      label: "Sessions Attended",
      sortable: true,
      sortValue: (e) => e.sessionsAttended / Math.max(e.totalSessions, 1),
      render: (e) => {
        const pct =
          e.totalSessions > 0
            ? Math.round((e.sessionsAttended / e.totalSessions) * 100)
            : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {e.sessionsAttended}/{e.totalSessions}
            </span>
            <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-all",
                  pct >= 80
                    ? "bg-emerald-500"
                    : pct >= 40
                      ? "bg-sky-500"
                      : "bg-amber-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "paymentStatus",
      label: "Payment",
      sortable: true,
      render: (e) => {
        const meta = PAYMENT_META[e.paymentStatus];
        return (
          <Badge variant="outline" className={cn("gap-1 border", meta.cls)}>
            <CircleDollarSign className="size-3" />
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (e) => {
        const meta = STATUS_META[e.status];
        return (
          <Badge variant="outline" className={cn("border", meta.cls)}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "notes",
      label: "Notes",
      sortable: false,
      render: (e) =>
        e.notes ? (
          <span
            className="text-muted-foreground line-clamp-2 max-w-[260px] text-xs"
            title={e.notes}
          >
            <StickyNote className="mr-1 inline size-3 align-text-bottom" />
            {e.notes}
          </span>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          <span className="font-semibold text-slate-800 tabular-nums">
            {enrollments.length}
          </span>{" "}
          of <span className="tabular-nums">{series.maxCapacity}</span> spots
          filled
        </p>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={series.status === "cancelled"}
        >
          <Plus className="mr-1.5 size-4" />
          Add Student
        </Button>
      </div>

      <DataTable
        data={enrollments}
        columns={columns}
        searchPlaceholder="Search students by owner, dog, or breed…"
        getSearchValue={(e) => [e.ownerName, e.petName, e.petBreed].join(" ")}
        itemsPerPage={10}
        actions={(e) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Student actions"
                onClick={(ev) => ev.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Student actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={e.status === "dropped"}
                onClick={() => setDroppingId(e.id)}
                className="gap-2"
              >
                <UserMinus className="size-4 text-rose-600" />
                Remove from series
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={e.status === "dropped"}
                onClick={() => setMakeupTargetId(e.id)}
                className="gap-2"
              >
                <Coins className="size-4 text-amber-600" />
                Add make-up session
              </DropdownMenuItem>
              {e.status === "paused" ? (
                <DropdownMenuItem
                  onClick={() => setResumingId(e.id)}
                  className="gap-2"
                >
                  <Play className="size-4 text-emerald-600" />
                  Resume enrollment
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={e.status === "dropped" || e.status === "completed"}
                  onClick={() => setPausingId(e.id)}
                  className="gap-2"
                >
                  <Pause className="size-4 text-purple-600" />
                  Pause enrollment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setMovingId(e.id)}
                className="gap-2"
              >
                <ArrowRightLeft className="size-4" />
                Transfer to different series
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setRemovingId(e.id)}
                className="text-destructive focus:text-destructive gap-2"
                title="Permanently delete this enrollment record. Use Remove from series instead when the student is leaving — that preserves history."
              >
                <Trash2 className="size-4" />
                Delete record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* Add Student dialog ──────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a student</DialogTitle>
            <DialogDescription>
              Enroll a dog into{" "}
              <span className="font-semibold text-slate-800">
                {series.seriesName}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Dog</Label>
              <Select value={addPetKey} onValueChange={setAddPetKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a dog…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {petOptions.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.petName} · {p.ownerName} ({p.petBreed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Payment</Label>
              <Select
                value={addPayment}
                onValueChange={(v) => setAddPayment(v as SeriesPaymentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid in full</SelectItem>
                  <SelectItem value="deposit">Deposit only</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="comped">Comped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Notes (optional)</Label>
              <Textarea
                value={addNotes}
                onChange={(ev) => setAddNotes(ev.target.value)}
                placeholder="Anything the instructor should know…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Enroll student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!movingId}
        onOpenChange={(open) => {
          if (!open) {
            setMovingId(null);
            setMoveTargetSeriesId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move student to another series</DialogTitle>
            <DialogDescription>
              Only active or upcoming series of the same course type are shown
              as destinations. Sessions attended in this series reset on move.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label className="text-sm font-semibold">Destination series</Label>
            <Select
              value={moveTargetSeriesId}
              onValueChange={setMoveTargetSeriesId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a series…" />
              </SelectTrigger>
              <SelectContent>
                {otherSeriesOptions.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    No other active or upcoming series for this course type.
                  </div>
                ) : (
                  otherSeriesOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.seriesName} · starts{" "}
                      {new Date(s.startDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMovingId(null);
                setMoveTargetSeriesId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!moveTargetSeriesId}>
              <CheckCircle2 className="mr-1 size-4" />
              Confirm move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove-from-series dialog ──────────────────────────────────── */}
      <Dialog
        open={!!droppingId}
        onOpenChange={(open) => !open && setDroppingId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="size-5 text-rose-600" />
              Remove from series
            </DialogTitle>
            <DialogDescription>
              Marks the student <span className="font-semibold">Withdrawn</span>{" "}
              in this series. Completed sessions and history are preserved.
              Their calendar slot opens immediately and the system auto-offers
              it to the top of the waitlist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Reason picker — structured category. */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reason</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { v: "client-requested", label: "Client requested" },
                    { v: "no-show-policy", label: "No-show policy" },
                    { v: "other", label: "Other" },
                  ] as const
                ).map((opt) => {
                  const isActive = dropReasonCategory === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDropReasonCategory(opt.v)}
                      className={cn(
                        "rounded-md border px-2 py-2 text-[12px] font-medium transition-colors",
                        isActive
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <Textarea
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="Anything else for the file? (optional)"
                className="min-h-[60px] text-sm"
              />
            </div>

            {/* Refund / credit decision. */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Refund unused sessions or apply credit
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    {
                      v: "no-refund",
                      label: "No refund",
                      tone: "border-slate-300 bg-slate-50 text-slate-700",
                    },
                    {
                      v: "partial-refund",
                      label: "Partial refund",
                      tone: "border-amber-300 bg-amber-50 text-amber-800",
                    },
                    {
                      v: "full-refund",
                      label: "Full refund",
                      tone: "border-emerald-300 bg-emerald-50 text-emerald-700",
                    },
                    {
                      v: "account-credit",
                      label: "Account credit",
                      tone: "border-sky-300 bg-sky-50 text-sky-700",
                    },
                  ] as const
                ).map((opt) => {
                  const isActive = dropRefund === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDropRefund(opt.v)}
                      className={cn(
                        "rounded-md border px-2 py-2 text-[12px] font-medium transition-colors",
                        isActive
                          ? `${opt.tone} ring-2 ring-offset-1`
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-[11px]">
                Informational only — the actual payout / credit lives in the
                billing module.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDroppingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDrop}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              <UserMinus className="mr-1.5 size-4" />
              Remove from series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!pausingId}
        onOpenChange={(open) => !open && setPausingId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="size-5 text-purple-600" />
              Pause this enrollment
            </DialogTitle>
            <DialogDescription>
              Temporarily holds the dog&apos;s spot — they keep their seat, and
              we&apos;ll skip them on session attendance + homework
              notifications until you resume. When they rejoin, they pick up
              from whichever session is current. Use Remove if they&apos;re
              leaving for good.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Reason{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="E.g. vacation through June, recovering from surgery…"
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Expected return date{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                type="date"
                value={pauseReturnDate ?? ""}
                onChange={(e) =>
                  setPauseReturnDate(e.target.value || undefined)
                }
                className="h-10"
              />
              <p className="text-muted-foreground text-[11px]">
                Informational only — used to remind staff when to follow up.
                Invoice adjustments are handled manually or via the existing
                credit system.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPausingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handlePause}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Pause className="mr-1.5 size-4" />
              Pause enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!resumingId}
        onOpenChange={(open) => !open && setResumingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume this enrollment?</AlertDialogTitle>
            <AlertDialogDescription>
              The dog flips back to Enrolled and is expected at upcoming
              sessions again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResume}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Play className="mr-1.5 size-4" />
              Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add make-up session dialog ─────────────────────────────────── */}
      <MakeupSessionPickerDialog
        open={!!makeupTargetId}
        onOpenChange={(open) => {
          if (!open) {
            setMakeupTargetId(null);
            setMakeupPickedKey("");
            setMakeupNotes("");
          }
        }}
        targetStudentName={
          enrollments.find((e) => e.id === makeupTargetId)?.petName ?? ""
        }
        currentSeries={series}
        allSeries={allSeries}
        seriesEnrollments={allSeriesEnrollmentsForMakeup}
        pickedKey={makeupPickedKey}
        onPickedKeyChange={setMakeupPickedKey}
        notes={makeupNotes}
        onNotesChange={setMakeupNotes}
        onConfirm={handleAddMakeup}
      />

      {/* Remove confirmation ────────────────────────────────────────── */}
      <AlertDialog
        open={!!removingId}
        onOpenChange={(open) => !open && setRemovingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from this series?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing a student erases their roster entry for this series. Use
              &quot;Mark as dropped&quot; if you want to keep the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Make-up session picker — lists future sessions of other cohorts with
// capacity. Staff picks one to add the student as a make-up guest.
// ============================================================================

function MakeupSessionPickerDialog({
  open,
  onOpenChange,
  targetStudentName,
  currentSeries,
  allSeries,
  seriesEnrollments,
  pickedKey,
  onPickedKeyChange,
  notes,
  onNotesChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStudentName: string;
  currentSeries: TrainingSeries;
  allSeries: TrainingSeries[];
  seriesEnrollments: TrainingEnrollment[];
  pickedKey: string;
  onPickedKeyChange: (key: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
}) {
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0]!, []);

  // Enrolled count per series — drives capacity-aware filtering.
  const enrolledBySeries = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of seriesEnrollments) {
      if (e.status !== "enrolled") continue;
      m.set(e.seriesId, (m.get(e.seriesId) ?? 0) + 1);
    }
    return m;
  }, [seriesEnrollments]);

  // Candidate sessions = future sessions in OTHER series with the same
  // course type that still have a free seat.
  const candidates = useMemo(() => {
    return allSeries
      .filter(
        (s) =>
          s.id !== currentSeries.id &&
          s.courseTypeId === currentSeries.courseTypeId &&
          (s.status === "active" || s.status === "upcoming"),
      )
      .flatMap((s) => {
        const enrolled = enrolledBySeries.get(s.id) ?? 0;
        const spotsLeft = Math.max(0, s.maxCapacity - enrolled);
        if (spotsLeft === 0) return [];
        return s.sessions
          .filter(
            (sess) => sess.date >= todayISO && sess.status === "scheduled",
          )
          .map((sess) => ({
            key: `${s.id}::${sess.id}`,
            series: s,
            session: sess,
            spotsLeft,
          }));
      })
      .sort((a, b) =>
        a.session.date !== b.session.date
          ? a.session.date.localeCompare(b.session.date)
          : a.session.startTime.localeCompare(b.session.startTime),
      );
  }, [allSeries, currentSeries, enrolledBySeries, todayISO]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b p-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Coins className="size-5 text-amber-600" />
            Add a make-up session
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Pick a future session in another cohort of{" "}
            <span className="font-medium">{currentSeries.courseTypeName}</span>{" "}
            that still has capacity. {targetStudentName} joins as a make-up
            guest, and the session appears on their Training History with an
            Absent-Makeup note.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {candidates.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
              No other cohorts have an open seat right now. Try the Transfer
              flow once a new series opens up.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {candidates.map((c) => {
                const isActive = pickedKey === c.key;
                return (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => onPickedKeyChange(c.key)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                        isActive
                          ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900/40",
                      )}
                    >
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                        <span className="text-xs font-bold tabular-nums">
                          S{c.session.sessionNumber}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-semibold">
                          {c.series.seriesName}
                        </p>
                        <p className="text-muted-foreground text-[11.5px]">
                          {new Date(
                            `${c.session.date}T00:00:00`,
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {c.session.startTime}–{c.session.endTime} ·{" "}
                          {c.series.instructorName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          c.spotsLeft >= 3
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {c.spotsLeft} spot{c.spotsLeft === 1 ? "" : "s"} left
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 space-y-1.5">
            <Label className="text-sm font-medium">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="E.g. dog was sick last week, owner asked for Saturday option…"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50/40 p-4 dark:bg-slate-950/40">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!pickedKey}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            <Coins className="mr-1.5 size-4" />
            Add as make-up guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
