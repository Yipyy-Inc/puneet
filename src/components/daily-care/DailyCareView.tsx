"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Printer,
} from "lucide-react";
import { getCurrentGuests } from "@/data/boarding";
import { logCareAction } from "@/data/incidents";
import { staffMembers } from "@/data/staff";
import { shiftNotesStore } from "@/data/shift-notes-store";
import { petFlagsStore } from "@/data/pet-flags-store";
import { headCountStore } from "@/data/head-count-store";
import { petCareNotesStore } from "@/data/pet-care-notes";
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { useCareLog, useDateCareLog } from "@/hooks/use-care-log";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  generateScheduledTasks,
  todayIso,
  format12h,
} from "@/lib/care-log-scheduler";
import { ProgressHeader } from "./ProgressHeader";
import { Section } from "./Section";
import { defaultOutcomeFor } from "./outcome-meta";
import { LogModalRouter } from "./log-modals/LogModalRouter";
import { HeadCountOverlay } from "./HeadCountOverlay";
import { DaySummaryView } from "./DaySummaryView";
import { HqView } from "./HqView";
import { DailyCarePrintSheet } from "./DailyCarePrintSheet";
import { ShiftNotes } from "./ShiftNotes";
import { ReservationJournalPanel } from "@/components/guest-journal/ReservationJournalPanel";
import { toast } from "sonner";
import type {
  ScheduledTask,
  TaskExecution,
  HealthObservation,
  CleaningDetail,
  AddonLogDetail,
  EnrichmentDetail,
} from "@/types/care-log";
import type { DailyCareStep } from "@/types/boarding";

// Single-facility mock — boarding/daily-care data isn't facility-scoped yet, so
// shift notes are keyed under the demo facility.
const FACILITY_ID = 11;
const FACILITY_NAME = "Yipyy";

// Roles that oversee the whole floor — they default to the All Tasks view.
// Everyone else (supervisor, employee) defaults to their own assigned tasks.
const MANAGER_ROLES = new Set<string>([
  "owner",
  "general_manager",
  "department_manager",
]);

function formatNoteTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DailyCareView() {
  const { config } = useDailyCareConfig();
  const { user } = useCurrentUser();
  // Selected day for the whole view — logs, executions, and the generated
  // schedule all follow it, so managers can review a past day or preview a
  // future one. Seeded from today.
  const [date, setDate] = useState(() => todayIso());
  const { executions, log } = useDateCareLog(date);

  const guests = useMemo(() => getCurrentGuests(), []);

  // Pets flagged for attention on any day (A8.2) — a stable snapshot from the
  // store; the ⚑ in the journal guest list reads this.
  const flaggedGuestIds = useSyncExternalStore(
    petFlagsStore.subscribe,
    petFlagsStore.getFlaggedGuestIds,
    petFlagsStore.getFlaggedGuestIds,
  );

  // Pets with a health observation logged anywhere in their stay (A5.5) — a
  // second attention signal alongside the pet-flags store (A4.3), in case a
  // concern was recorded on the log without the flag surviving.
  const { executions: allExecutions } = useCareLog();
  const healthObservedGuestIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of allExecutions) {
      if (e.healthObservation) ids.add(e.guestId);
    }
    return ids;
  }, [allExecutions]);
  const needsAttention = (guestId: string) =>
    flaggedGuestIds.has(guestId) || healthObservedGuestIds.has(guestId);

  // Stay-long per-pet care notes (A4.5) — a stable map that flips reference when
  // a note is edited, so the schedule re-derives careNote for the sticky-note.
  const careNotes = useSyncExternalStore(
    petCareNotesStore.subscribe,
    petCareNotesStore.getNotesMap,
    petCareNotesStore.getNotesMap,
  );

  const allTasks = useMemo(
    () =>
      generateScheduledTasks(
        guests,
        config,
        new Date(date + "T00:00:00"),
        careNotes,
      ),
    [guests, config, date, careNotes],
  );

  // Step the selected day by ±1 via the navigator arrows.
  const stepDay = (delta: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(todayIso(d));
  };

  // Shift-handoff notes for the selected day — subscribing to the store so a
  // note saved from the dialog appears in the banner immediately.
  const shiftNotes = useSyncExternalStore(
    shiftNotesStore.subscribe,
    () => shiftNotesStore.getSnapshot(FACILITY_ID, date),
    () => shiftNotesStore.getSnapshot(FACILITY_ID, date),
  );

  const [modalState, setModalState] = useState<{
    task: ScheduledTask | null;
    existing: TaskExecution | undefined;
    /** Medication step-through queue (rule a) — same pet + time, unlogged. */
    queue?: ScheduledTask[];
  }>({ task: null, existing: undefined });

  const [journalSheetOpen, setJournalSheetOpen] = useState(false);
  const [selectedJournalGuestId, setSelectedJournalGuestId] = useState<
    string | null
  >(null);

  const selectedJournalGuest = useMemo(
    () => guests.find((g) => g.id === selectedJournalGuestId) ?? null,
    [guests, selectedJournalGuestId],
  );

  // Group tasks under their source step (the step that produced them).
  // Tasks without a sourceStepId fall under a synthetic "Unscheduled" bucket
  // — keeps add-ons and feedings whose times don't match any step visible.
  const sortedSteps = useMemo(
    () =>
      [...config.steps]
        .filter((s) => s.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.steps],
  );

  // Last Call (F1): which requiresHeadCount steps have a recorded head count for
  // the selected day. The store returns a referentially-stable Set between
  // mutations, so it's a safe useSyncExternalStore snapshot.
  const headCountDoneStepIds = useSyncExternalStore(
    headCountStore.subscribe,
    () => headCountStore.getCompletedStepIds(FACILITY_ID, date),
    () => headCountStore.getCompletedStepIds(FACILITY_ID, date),
  );

  // The step whose head-count overlay is open, if any.
  const [headCountStep, setHeadCountStep] = useState<DailyCareStep | null>(
    null,
  );

  // Day Summary (read-only end-of-day report) — only offered for a past date.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const isPastDate = date < todayIso();

  // HQ View — manager monitoring mode over all blocks/staff.
  const [hqView, setHqView] = useState(false);

  // Print sheet: the time stamped on its header, and an optional single step to
  // print on its own (null = print the whole day).
  const [printedAt, setPrintedAt] = useState("");
  const [printStep, setPrintStep] = useState<DailyCareStep | null>(null);
  const stampAndPrint = () => {
    setPrintedAt(
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
    // Let React commit the sheet before the dialog opens.
    window.setTimeout(() => window.print(), 0);
  };
  const handlePrint = () => {
    setPrintStep(null);
    stampAndPrint();
  };
  const handlePrintStep = (step: DailyCareStep) => {
    setPrintStep(step);
    stampAndPrint();
  };

  // Staff Filter — "all" or a specific staff id. Reuses the facility staff
  // roster (src/data/staff.ts); the F2 identity source (useCurrentUser) exposes
  // only the current user, not a list.
  const staffList = useMemo(() => staffMembers.filter((s) => s.isActive), []);

  // F2 default: a signed-in staff member lands on THEIR tasks (assigned +
  // unassigned); managers land on All. We map the current user onto the roster
  // by id/name so the same A1.3 filter can seed from them. No roster match (or a
  // manager) → "all". The dropdown remains a visible toggle back to All Tasks,
  // so a new shift can review what the previous one completed vs. left pending.
  const currentStaff = useMemo(
    () => staffList.find((s) => s.id === user.id || s.name === user.name),
    [staffList, user.id, user.name],
  );
  const isManager = MANAGER_ROLES.has(user.role);
  const [staffFilter, setStaffFilter] = useState<string>(() =>
    !isManager && currentStaff ? currentStaff.id : "all",
  );
  const selectedStaff =
    staffFilter === "all"
      ? null
      : (staffList.find((s) => s.id === staffFilter) ?? null);

  // Steps visible for the selected staff: those assigned to this person or
  // their role, PLUS unassigned steps (first-come-first-served, so shown to
  // everyone). "All Staff" (selectedStaff === null) shows everything.
  const visibleSteps = useMemo(() => {
    if (!selectedStaff) return sortedSteps;
    return sortedSteps.filter((step) => {
      const a = step.assignedStaff;
      if (!a || a.kind === "unassigned") return true;
      if (a.kind === "person") return a.staffId === selectedStaff.id;
      return a.role === selectedStaff.role; // kind === "role"
    });
  }, [sortedSteps, selectedStaff]);

  const tasksByStep = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    for (const step of sortedSteps) map.set(step.id, []);

    for (const task of allTasks) {
      if (task.sourceStepId && map.has(task.sourceStepId)) {
        map.get(task.sourceStepId)!.push(task);
        continue;
      }
      // Match to nearest step by task type + time as fallback
      const fallback = sortedSteps.find(
        (s) =>
          (s.taskType === task.taskType ||
            (s.taskType === "addon" && task.taskType === "addon") ||
            (s.taskType === "medication" && task.taskType === "medication") ||
            (s.taskType === "feeding" && task.taskType === "feeding")) &&
          s.time === task.scheduledTime,
      );
      if (fallback) {
        map.get(fallback.id)!.push(task);
      } else {
        // Append to the closest step of the same type
        const sameType = sortedSteps.find((s) => s.taskType === task.taskType);
        if (sameType) map.get(sameType.id)!.push(task);
      }
    }
    return map;
  }, [allTasks, sortedSteps]);

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  // Summary is by task BLOCK (schedule step) over the CURRENTLY VISIBLE steps,
  // so the Staff Filter narrows the counts too. A block is complete when all
  // its tasks are logged; overdue when it still has unlogged tasks past
  // step.time + alertOverdueAfterMinutes.
  const blockTotal = visibleSteps.length;

  const blockComplete = useMemo(
    () =>
      visibleSteps.filter((step) => {
        if (headCountDoneStepIds.has(step.id)) return true;
        const stepTasks = tasksByStep.get(step.id) ?? [];
        return stepTasks.every((t) =>
          executions.some((e) => e.taskId === t.id),
        );
      }).length,
    [visibleSteps, tasksByStep, executions, headCountDoneStepIds],
  );

  const blockOverdue = useMemo(
    () =>
      visibleSteps.reduce((acc, step) => {
        if (headCountDoneStepIds.has(step.id)) return acc;
        const stepTasks = tasksByStep.get(step.id) ?? [];
        const hasUnlogged = stepTasks.some(
          (t) => !executions.some((e) => e.taskId === t.id),
        );
        const [h, m] = step.time.split(":").map((n) => parseInt(n, 10));
        const stepMin = (h ?? 0) * 60 + (m ?? 0);
        if (
          hasUnlogged &&
          nowMinutes > stepMin + config.alertOverdueAfterMinutes
        ) {
          return acc + 1;
        }
        return acc;
      }, 0),
    [
      visibleSteps,
      tasksByStep,
      executions,
      nowMinutes,
      config.alertOverdueAfterMinutes,
      headCountDoneStepIds,
    ],
  );

  // The first overdue block (in schedule order) — target for the header's
  // overdue chip "jump to it" action.
  const firstOverdueStepId = useMemo(() => {
    const overdue = visibleSteps.find((step) => {
      if (headCountDoneStepIds.has(step.id)) return false;
      const stepTasks = tasksByStep.get(step.id) ?? [];
      const hasUnlogged = stepTasks.some(
        (t) => !executions.some((e) => e.taskId === t.id),
      );
      const [h, m] = step.time.split(":").map((n) => parseInt(n, 10));
      const stepMin = (h ?? 0) * 60 + (m ?? 0);
      return (
        hasUnlogged && nowMinutes > stepMin + config.alertOverdueAfterMinutes
      );
    });
    return overdue?.id ?? null;
  }, [
    visibleSteps,
    tasksByStep,
    executions,
    nowMinutes,
    config.alertOverdueAfterMinutes,
    headCountDoneStepIds,
  ]);

  // Scroll to the first overdue task card and flash a brief pulse ring
  // (removed after ~1.5s). Owns the `step-${id}` anchor convention it shares
  // with Section.
  const handleScrollToOverdue = () => {
    if (!firstOverdueStepId) return;
    const el = document.getElementById(`step-${firstOverdueStepId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const pulse = ["ring-2", "ring-red-400", "animate-pulse"];
    el.classList.add(...pulse);
    window.setTimeout(() => el.classList.remove(...pulse), 1500);
  };

  // Lifted per-step collapse map (A3.2). Empty by default, so each completed
  // block uses Section's collapse-when-complete default and its own tap-to-
  // expand (A3.1). The global buttons and per-card toggle both write here.
  const [expandedOverrides, setExpandedOverrides] = useState<
    Record<string, boolean>
  >({});

  // Completed blocks in view (total > 0 && every task logged) — the collapsible
  // ones; also gates whether the collapse/expand controls appear.
  const completeStepIds = useMemo(
    () =>
      visibleSteps
        .filter((step) => {
          if (headCountDoneStepIds.has(step.id)) return true;
          const stepTasks = tasksByStep.get(step.id) ?? [];
          return (
            stepTasks.length > 0 &&
            stepTasks.every((t) => executions.some((e) => e.taskId === t.id))
          );
        })
        .map((s) => s.id),
    [visibleSteps, tasksByStep, executions, headCountDoneStepIds],
  );
  const anyComplete = completeStepIds.length > 0;

  const setStepExpanded = (stepId: string, next: boolean) => {
    setExpandedOverrides((prev) => ({ ...prev, [stepId]: next }));
  };
  const collapseAllCompleted = () => {
    setExpandedOverrides((prev) => {
      const next = { ...prev };
      for (const id of completeStepIds) next[id] = false;
      return next;
    });
  };
  const expandAll = () => {
    setExpandedOverrides((prev) => {
      const next = { ...prev };
      for (const id of completeStepIds) next[id] = true;
      return next;
    });
  };

  // In-stay care writeback (2B/2D): logging an incident-sourced task also
  // appends an incident careLog (2B.4), carrying the note + first photo.
  const writeIncidentCareLog = (
    task: ScheduledTask,
    opts: { note?: string; photoUrl?: string },
  ) => {
    if (!task.sourceIncidentId) return;
    logCareAction(task.sourceIncidentId, {
      careActionId: task.careActionId,
      medicationId: task.medicationId,
      loggedBy: user.name,
      note: opts.note,
      photoUrl: opts.photoUrl,
    });
  };

  function handleLog(task: ScheduledTask, existing?: TaskExecution) {
    // Medication (rule a): step through every not-yet-logged med for this pet
    // at this time. Editing a single logged med skips the queue.
    if (task.taskType === "medication" && !existing) {
      const siblings = allTasks
        .filter(
          (t) =>
            t.taskType === "medication" &&
            t.guestId === task.guestId &&
            t.scheduledTime === task.scheduledTime &&
            !executions.some((e) => e.taskId === t.id),
        )
        .sort((a, b) => a.details.localeCompare(b.details));
      // Start at the tapped med, then the remaining siblings.
      const queue = [task, ...siblings.filter((t) => t.id !== task.id)];
      setModalState({ task, existing, queue });
      return;
    }
    setModalState({ task, existing });
  }

  // Log a single medication as its own TaskExecution (the med modal advances
  // the queue itself between calls).
  const handleLogMedication = (
    task: ScheduledTask,
    entry: {
      outcome: string;
      notes?: string;
      staffInitials: string;
      staffName?: string;
      executedAt?: string;
      photoUrls?: string[];
    },
  ) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date,
      executedAt: entry.executedAt ?? `${hh}:${mm}`,
      outcome: entry.outcome,
      notes: entry.notes,
      staffInitials: entry.staffInitials,
      staffName: entry.staffName,
      photoUrls: entry.photoUrls,
      photoUrl: entry.photoUrls?.[0],
    });
    writeIncidentCareLog(task, {
      note: entry.notes,
      photoUrl: entry.photoUrls?.[0],
    });
    toast.success(
      `Logged ${task.medDetail?.name ?? "medication"} for ${task.petName}`,
    );
  };

  // Rule (c): tasks are re-derived from the booking on every render, so a
  // "reload" just closes the (stale) modal and lets the fresh list take over.
  const handleReloadMeds = () => {
    toast.info("Reloaded medication data from booking.");
    setModalState({ task: null, existing: undefined });
  };

  // One-tap quick log — writes the routine default outcome directly (no modal).
  const handleQuickLog = (task: ScheduledTask, outcome: string) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date,
      executedAt: `${hh}:${mm}`,
      outcome,
      staffInitials: user.initials,
      staffName: user.name,
    });
    writeIncidentCareLog(task, {});
    toast.success(`Logged for ${task.petName}`);
  };

  function handleSubmit(entry: {
    outcome: string;
    notes?: string;
    staffInitials: string;
    staffName?: string;
    executedAt?: string;
    servedAt?: string;
    photoUrls?: string[];
    healthObservation?: HealthObservation;
    cleaning?: CleaningDetail;
    waterVolume?: string;
    missedReason?: string;
    notifyOwner?: boolean;
    addon?: AddonLogDetail;
    enrichment?: EnrichmentDetail;
  }) {
    if (!modalState.task) return;
    const task = modalState.task;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    log({
      taskId: task.id,
      guestId: task.guestId,
      bookingId: task.bookingId,
      taskType: task.taskType,
      date,
      executedAt: entry.executedAt ?? `${hh}:${mm}`,
      outcome: entry.outcome,
      notes: entry.notes,
      staffInitials: entry.staffInitials,
      staffName: entry.staffName,
      servedAt: entry.servedAt,
      photoUrls: entry.photoUrls,
      photoUrl: entry.photoUrls?.[0],
      healthObservation: entry.healthObservation,
      cleaning: entry.cleaning,
      waterVolume: entry.waterVolume,
      missedReason: entry.missedReason,
      addon: entry.addon,
      enrichment: entry.enrichment,
    });
    writeIncidentCareLog(task, {
      note: entry.notes,
      photoUrl: entry.photoUrls?.[0],
    });

    // An escalating log (health concern or add-on incident) raises the pet flag
    // (A4.3) and notifies the on-shift manager (toast stands in for a real push).
    if (entry.healthObservation) {
      const obs = entry.healthObservation;
      petFlagsStore.raise(date, task.guestId, {
        reason: `Health concern: ${obs.type} · ${obs.severity}`,
        createdBy: entry.staffName ?? entry.staffInitials,
        createdAt: new Date().toISOString(),
      });
      toast.warning(
        `${task.petName} flagged for attention — manager notified of health concern.`,
      );
    } else if (entry.addon?.incident) {
      petFlagsStore.raise(date, task.guestId, {
        reason: `Add-on incident (${entry.addon.incident.severity}): ${task.details}`,
        createdBy: entry.staffName ?? entry.staffInitials,
        createdAt: new Date().toISOString(),
      });
      toast.warning(
        `${task.petName} flagged — incident logged, manager notified.`,
      );
    } else if (entry.missedReason) {
      toast.warning(
        `Logged ${task.details} as not delivered.${
          entry.notifyOwner ? " Owner notified." : ""
        }`,
      );
    } else {
      toast.success(`Logged for ${task.petName}`);
    }
    setModalState({ task: null, existing: undefined });
  }

  // Batch "Mark all as done" (A3.5) — log the default success outcome for every
  // not-yet-logged pet in a block. Section gates which task types may call this.
  const onLogAll = (step: DailyCareStep) => {
    const stepTasks = tasksByStep.get(step.id) ?? [];
    const notLogged = stepTasks.filter(
      (t) => !executions.some((e) => e.taskId === t.id),
    );
    if (notLogged.length === 0) return;
    const now = new Date();
    const executedAt = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    let count = 0;
    for (const t of notLogged) {
      const outcome = defaultOutcomeFor(t.taskType)?.value;
      if (!outcome) continue;
      // An incident task that requires a photo can't be batch-completed — its
      // photo gate is only satisfiable through the log modal.
      if (t.sourceIncidentId && t.requiresPhotoProof) continue;
      log({
        taskId: t.id,
        guestId: t.guestId,
        bookingId: t.bookingId,
        taskType: t.taskType,
        date,
        executedAt,
        outcome,
        staffInitials: user.initials,
        staffName: user.name,
      });
      writeIncidentCareLog(t, {});
      count += 1;
    }
    toast.success(
      `Logged ${step.name} for ${count} ${count === 1 ? "pet" : "pets"}.`,
    );
  };

  // Last Call (F1) — open the full-screen rollcall for a requiresHeadCount step.
  const handleStartHeadCount = (step: DailyCareStep) => {
    setHeadCountStep(step);
  };

  // Persist the completed head count (marks the step complete) and log the
  // human-readable summary line.
  const handleCompleteHeadCount = (
    step: DailyCareStep,
    result: {
      insideGuestIds: string[];
      cannotLocate: { guestId: string; note?: string }[];
      overrideNote?: string;
      completedAt: string;
      total: number;
    },
  ) => {
    headCountStore.complete(FACILITY_ID, date, step.id, {
      stepId: step.id,
      date,
      staffName: user.name,
      staffInitials: user.initials,
      completedAt: result.completedAt,
      insideGuestIds: result.insideGuestIds,
      cannotLocate: result.cannotLocate,
      total: result.total,
      overrideNote: result.overrideNote,
    });
    setHeadCountStep(null);
    const inside = result.insideGuestIds.length;
    toast.success(
      `${user.name} confirmed ${inside}/${result.total} dogs inside at ${format12h(
        result.completedAt,
      )}. Head count complete.`,
    );
  };

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Date navigator — review a past day or preview an upcoming one */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => stepDay(-1)}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <DatePicker
              value={date}
              onValueChange={(next) => {
                if (next) setDate(next);
              }}
              className="w-44"
              popoverAlign="center"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => stepDay(1)}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Button>
            {/* Past dates get a read-only end-of-day summary. */}
            {isPastDate && (
              <Button
                variant="outline"
                size="sm"
                className="ml-1"
                onClick={() => setSummaryOpen(true)}
              >
                <FileText className="mr-2 size-4" />
                Day Summary
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* HQ View — manager monitoring mode over all blocks + staff. */}
            <Button
              variant={hqView ? "default" : "outline"}
              size="sm"
              aria-pressed={hqView}
              onClick={() => setHqView((v) => !v)}
            >
              <Building2 className="mr-2 size-4" />
              HQ View
            </Button>
            {/* Staff Filter (A1.3) — the visible toggle between one person's
              tasks and All Tasks. Seeded from the current user (F2). */}
            <Select value={staffFilter} onValueChange={setStaffFilter}>
              <SelectTrigger
                className="w-44"
                aria-label="Filter tasks by staff"
              >
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {currentStaff?.id === s.id ? " (you)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedJournalGuestId(null);
                setJournalSheetOpen(true);
              }}
            >
              <BookOpen className="mr-2 size-4" />
              Guest Journals
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
            <ShiftNotes facilityId={FACILITY_ID} date={date} />
          </div>
        </div>

        {hqView ? (
          <HqView
            date={date}
            guests={guests}
            staffList={staffList}
            sortedSteps={sortedSteps}
            tasksByStep={tasksByStep}
            executions={executions}
            headCountDoneStepIds={headCountDoneStepIds}
            overdueAfterMinutes={config.alertOverdueAfterMinutes}
            nowMinutes={nowMinutes}
          />
        ) : (
          <>
            <ProgressHeader
              blockTotal={blockTotal}
              blockComplete={blockComplete}
              blockOverdue={blockOverdue}
              guestCount={guests.length}
              date={date}
              onOverdueClick={handleScrollToOverdue}
            />

            {shiftNotes.length > 0 && (
              <div className="space-y-2">
                {shiftNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30"
                  >
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      From {note.author} at {formatNoteTime(note.createdAt)}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {sortedSteps.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No daily care steps configured yet.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/facility/dashboard/daily-care/settings">
                    Set up your daily routine
                  </Link>
                </Button>
              </div>
            ) : visibleSteps.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No steps assigned to this staff member for the selected day.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {anyComplete && (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 text-xs"
                      onClick={collapseAllCompleted}
                    >
                      Collapse all completed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 text-xs"
                      onClick={expandAll}
                    >
                      Expand all
                    </Button>
                  </div>
                )}
                {visibleSteps.map((step) => (
                  <Section
                    key={step.id}
                    step={step}
                    tasks={tasksByStep.get(step.id) ?? []}
                    executions={executions}
                    overdueAfterMinutes={config.alertOverdueAfterMinutes}
                    nowMinutes={nowMinutes}
                    onLog={handleLog}
                    onQuickLog={handleQuickLog}
                    expanded={expandedOverrides[step.id]}
                    onToggle={setStepExpanded}
                    onLogAll={onLogAll}
                    headCountDone={headCountDoneStepIds.has(step.id)}
                    onStartHeadCount={handleStartHeadCount}
                    onPrintStep={handlePrintStep}
                    date={date}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {headCountStep && (
          <HeadCountOverlay
            guests={guests}
            stepName={headCountStep.name}
            facilityName={FACILITY_NAME}
            onComplete={(result) =>
              handleCompleteHeadCount(headCountStep, result)
            }
          />
        )}

        {summaryOpen && (
          <DaySummaryView
            date={date}
            facilityId={FACILITY_ID}
            facilityName={FACILITY_NAME}
            guests={guests}
            executions={executions}
            sortedSteps={sortedSteps}
            tasksByStep={tasksByStep}
            headCountDoneStepIds={headCountDoneStepIds}
            onClose={() => setSummaryOpen(false)}
          />
        )}

        <LogModalRouter
          open={modalState.task !== null}
          task={modalState.task}
          existing={modalState.existing}
          onOpenChange={(open) => {
            if (!open) setModalState({ task: null, existing: undefined });
          }}
          onSubmit={handleSubmit}
          medicationQueue={modalState.queue}
          onLogMedication={handleLogMedication}
          onReloadMedication={handleReloadMeds}
        />

        <Sheet open={journalSheetOpen} onOpenChange={setJournalSheetOpen}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {selectedJournalGuest && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 size-7"
                    onClick={() => setSelectedJournalGuestId(null)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                )}
                <BookOpen className="size-4" />
                {selectedJournalGuest
                  ? `${selectedJournalGuest.petName}'s Journal`
                  : "Guest Journals"}
              </SheetTitle>
            </SheetHeader>

            <div className="px-4 pb-6">
              {selectedJournalGuest ? (
                <ReservationJournalPanel
                  bookingId={selectedJournalGuest.bookingId ?? ""}
                  petIds={[selectedJournalGuest.petId]}
                />
              ) : (
                <div className="space-y-2">
                  {guests.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No guests in house.
                    </p>
                  ) : (
                    guests.map((guest) => {
                      const initial = guest.petName.charAt(0);
                      return (
                        <button
                          key={guest.id}
                          onClick={() => setSelectedJournalGuestId(guest.id)}
                          className="bg-card hover:bg-muted/50 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors"
                        >
                          <Avatar className="size-9 shrink-0">
                            {guest.petPhotoUrl && (
                              <AvatarImage
                                src={guest.petPhotoUrl}
                                alt={guest.petName}
                              />
                            )}
                            <AvatarFallback className="text-xs font-semibold">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {guest.petName}
                              </span>
                              {needsAttention(guest.id) && (
                                <Flag
                                  className="size-3.5 shrink-0 fill-red-600 text-red-600"
                                  aria-label={`${guest.petName} has a health flag`}
                                />
                              )}
                              <span className="text-muted-foreground text-xs">
                                {guest.kennelName}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              {guest.totalNights}{" "}
                              {guest.totalNights === 1 ? "night" : "nights"}
                              {guest.ownerName && ` · ${guest.ownerName}`}
                            </p>
                          </div>
                          <BookOpen className="text-muted-foreground size-4 shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <DailyCarePrintSheet
        facilityName={FACILITY_NAME}
        date={date}
        staffName={user.name}
        printedAt={printedAt}
        steps={printStep ? [printStep] : sortedSteps}
        tasksByStep={tasksByStep}
      />
    </>
  );
}
