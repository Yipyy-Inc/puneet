"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  LayoutGrid,
  User,
  ShieldAlert,
  Printer,
} from "lucide-react";
import { getCurrentGuests } from "@/data/boarding";
import type { BoardingGuest, MedicationSchedule } from "@/data/boarding";
import type { MedFrequencyRule } from "@/types/boarding";
import { ShiftView } from "./shift-view";
import { GuestTimelineView } from "./guest-view";
import { ManagerView } from "./manager-view";
import { TaskLogModal } from "./task-log-modal";
import { CareModulesPanel } from "./care-modules-panel";
import { PrintKennelCardsModal } from "./kennel-card-print";

// ── Shared Types ──────────────────────────────────────────────────────────────

export type ShiftType = "morning" | "afternoon" | "evening";
export type ViewMode = "shift" | "guest" | "manager";
export type TaskBucket = "potty" | "feeding" | "medication" | "addons" | "alerts";

export type PottyOutcome =
  | "pee"
  | "poop"
  | "both"
  | "nothing"
  | "diarrhea"
  | "soft_stool"
  | "vomit_noticed";

export type FeedingOutcome =
  | "ate_all"
  | "ate_half"
  | "refused"
  | "vomited_after"
  | "slow_eater";

export type MedicationOutcome =
  | "administered"
  | "refused"
  | "spit_out"
  | "delayed"
  | "missed";

export type AddonOutcome =
  | "completed"
  | "partial"
  | "skipped"
  | "dog_refused"
  | "rescheduled";

// ── Care modules ───────────────────────────────────────────────────────────────

export type CareModuleType =
  | "water_refill"
  | "crate_clean"
  | "bedding_change"
  | "monitoring"
  | "heat_tracking";

export type CareModulesConfig = {
  waterRefill: boolean;
  crateCleaning: boolean;
  beddingChange: boolean;
  postSurgeryMonitoring: boolean;
  heatCycleTracking: boolean;
  behaviorIncidents: boolean;
};

export const DEFAULT_CARE_MODULES: CareModulesConfig = {
  waterRefill: true,
  crateCleaning: true,
  beddingChange: false,
  postSurgeryMonitoring: false,
  heatCycleTracking: false,
  behaviorIncidents: true,
};

export type BehaviorIncident = {
  id: string;
  guestId: string;
  petName: string;
  kennelName: string;
  reportedAt: string;
  staffInitials: string;
  incidentType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
};

export type MissedMedReason =
  | "dog_refused"
  | "out_of_stock"
  | "staff_forgot"
  | "vomited"
  | "other";

export type ScheduledTask = {
  id: string;
  guestId: string;
  petName: string;
  kennelName: string;
  petPhotoUrl?: string;
  taskType: "potty" | "feeding" | "medication" | "addon" | "care";
  subType?: string;
  scheduledTime: string;
  shift: ShiftType;
  details: string;
  subDetails?: string[];
  requiresPhotoProof?: boolean;
  frequencyNote?: string;
  behaviorTags: string[];
  alertTags: string[];
};

export type TaskExecution = {
  id: string;
  taskId: string;
  guestId: string;
  taskType: "potty" | "feeding" | "medication" | "addon" | "care";
  executedAt: string;
  staffInitials: string;
  outcome: string;
  servedAt?: string;
  notes?: string;
  missedReason?: string;
};

export type GuestAlert = {
  id: string;
  guestId: string;
  petName: string;
  kennelName: string;
  severity: "warning" | "critical";
  message: string;
  time: string;
};

export type LogModalState = {
  open: boolean;
  task: ScheduledTask | null;
  feedingStep: "serve" | "outcome" | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getShiftForTime(time: string): ShiftType {
  const h = parseInt(time.split(":")[0], 10);
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 21) return "afternoon";
  return "evening";
}

const POTTY_ROUNDS: { time: string; label: string }[] = [
  { time: "06:30", label: "Early Morning Round" },
  { time: "12:00", label: "Midday Round" },
  { time: "16:30", label: "Afternoon Round" },
  { time: "21:00", label: "Evening Round" },
];

// ── Care module schedule constants ────────────────────────────────────────────

const WATER_REFILL_TIMES = ["07:00", "14:00", "20:00"];
const CRATE_CLEAN_TIMES = ["09:00"];
const BEDDING_CHANGE_TIMES = ["08:30"];
const HEAT_TRACKING_TIMES = ["07:30", "18:30"];

function careTask(
  guest: BoardingGuest,
  subType: CareModuleType,
  time: string,
  details: string,
  subDetails: string[],
  behaviorTags: string[],
  alertTags: string[],
): ScheduledTask {
  return {
    id: `care-${subType}-${guest.id}-${time}`,
    guestId: guest.id,
    petName: guest.petName,
    kennelName: guest.kennelName,
    petPhotoUrl: guest.petPhotoUrl,
    taskType: "care",
    subType,
    scheduledTime: time,
    shift: getShiftForTime(time),
    details,
    subDetails,
    behaviorTags,
    alertTags,
  };
}

function getDayOfStay(checkInDate: string, today: Date): number {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  return Math.floor((todayMidnight.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
}

function shouldGiveMedToday(
  med: MedicationSchedule,
  guest: BoardingGuest,
  today: Date,
): boolean {
  const rule = med.frequencyRule as MedFrequencyRule | undefined;
  if (!rule) return true;
  const dayOfStay = getDayOfStay(guest.checkInDate, today);
  switch (rule.type) {
    case "daily": return true;
    case "every_other_day": return (dayOfStay - (rule.startDayOfStay ?? 0)) % 2 === 0;
    case "every_n_days": return (dayOfStay - (rule.startDayOfStay ?? 0)) % rule.n === 0;
    case "specific_days": return rule.daysOfWeek.includes(today.getDay());
    case "first_n_days": return dayOfStay < rule.days;
    case "last_n_days": return dayOfStay >= guest.totalNights - rule.days;
    case "as_needed": return false;
  }
}

function getFrequencyLabel(rule: MedFrequencyRule): string {
  switch (rule.type) {
    case "daily": return "Daily";
    case "every_other_day": return "Every other day";
    case "every_n_days": return `Every ${rule.n} days`;
    case "specific_days": {
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return rule.daysOfWeek.map((d) => names[d]).join(" & ") + " only";
    }
    case "first_n_days": return `First ${rule.days} days only`;
    case "last_n_days": return `Last ${rule.days} days only`;
    case "as_needed": return "As needed";
  }
}

export function generateScheduledTasks(
  guests: BoardingGuest[],
  careConfig?: CareModulesConfig,
  today: Date = new Date(),
): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  for (const guest of guests) {
    const alertTags: string[] = [];
    if (guest.allergies.length > 0) alertTags.push("Allergy");
    if (guest.medications.some((m) => m.times.length > 0)) alertTags.push("Meds");
    if (guest.postSurgery) alertTags.push("Post-Surgery");
    if (guest.heatCycle) alertTags.push("Heat Cycle");

    // Use explicit tags from guest data; fall back to empty array
    const behaviorTags: string[] = guest.tags ?? [];

    // Potty tasks
    for (const round of POTTY_ROUNDS) {
      tasks.push({
        id: `potty-${guest.id}-${round.time}`,
        guestId: guest.id,
        petName: guest.petName,
        kennelName: guest.kennelName,
        petPhotoUrl: guest.petPhotoUrl,
        taskType: "potty",
        scheduledTime: round.time,
        shift: getShiftForTime(round.time),
        details: round.label,
        behaviorTags,
        alertTags,
      });
    }

    // Feeding tasks
    for (const time of guest.feedingTimes) {
      const h = parseInt(time.split(":")[0], 10);
      const mealLabel =
        h < 11 ? "Breakfast" : h < 15 ? "Lunch" : "Dinner";
      const parts: string[] = [`${guest.feedingAmount} ${guest.foodBrand}`];
      if (guest.feedingInstructions) parts.push(guest.feedingInstructions);
      if (guest.allergies.length > 0)
        parts.push(`⚠ Avoid: ${guest.allergies.join(", ")}`);

      tasks.push({
        id: `feed-${guest.id}-${time}`,
        guestId: guest.id,
        petName: guest.petName,
        kennelName: guest.kennelName,
        petPhotoUrl: guest.petPhotoUrl,
        taskType: "feeding",
        scheduledTime: time,
        shift: getShiftForTime(time),
        details: mealLabel,
        subDetails: parts,
        behaviorTags,
        alertTags: guest.allergies.length > 0 ? ["Allergy"] : [],
      });
    }

    // Medication tasks
    for (const med of guest.medications) {
      if (!shouldGiveMedToday(med, guest, today)) continue;
      const frequencyNote = med.frequencyRule
        ? getFrequencyLabel(med.frequencyRule as MedFrequencyRule)
        : undefined;
      for (const time of med.times) {
        tasks.push({
          id: `med-${guest.id}-${med.id}-${time}`,
          guestId: guest.id,
          petName: guest.petName,
          kennelName: guest.kennelName,
          petPhotoUrl: guest.petPhotoUrl,
          taskType: "medication",
          scheduledTime: time,
          shift: getShiftForTime(time),
          details: `${med.medicationName} ${med.dosage}`,
          subDetails: [med.frequency, med.instructions].filter(Boolean),
          requiresPhotoProof: med.requiresPhotoProof,
          frequencyNote,
          behaviorTags,
          alertTags: ["Meds"],
        });
      }
    }

    // Add-on tasks
    for (const addon of guest.addOns ?? []) {
      tasks.push({
        id: `addon-${guest.id}-${addon.id}`,
        guestId: guest.id,
        petName: guest.petName,
        kennelName: guest.kennelName,
        petPhotoUrl: guest.petPhotoUrl,
        taskType: "addon",
        subType: addon.addonType,
        scheduledTime: addon.scheduledTime,
        shift: getShiftForTime(addon.scheduledTime),
        details: addon.name,
        subDetails: [
          `${addon.durationMinutes} min`,
          ...(addon.notes ? [addon.notes] : []),
        ],
        behaviorTags,
        alertTags,
      });
    }

    // Care module tasks
    if (careConfig) {
      if (careConfig.waterRefill) {
        for (const time of WATER_REFILL_TIMES) {
          tasks.push(careTask(guest, "water_refill", time, "Water Refill", [`${guest.kennelName}`], behaviorTags, alertTags));
        }
      }
      if (careConfig.crateCleaning) {
        for (const time of CRATE_CLEAN_TIMES) {
          tasks.push(careTask(guest, "crate_clean", time, "Crate Cleaning", [guest.kennelName], behaviorTags, alertTags));
        }
      }
      if (careConfig.beddingChange) {
        for (const time of BEDDING_CHANGE_TIMES) {
          tasks.push(careTask(guest, "bedding_change", time, "Bedding Change", [guest.kennelName], behaviorTags, alertTags));
        }
      }
      if (careConfig.postSurgeryMonitoring && guest.postSurgery) {
        const interval = guest.postSurgery.monitoringIntervalHours;
        const startH = 6;
        const times: string[] = [];
        for (let h = startH; h < 24; h += interval) {
          times.push(`${String(h).padStart(2, "0")}:00`);
        }
        for (const time of times) {
          tasks.push(careTask(
            guest, "monitoring", time,
            "Post-Surgery Check",
            [guest.postSurgery.procedureType, guest.postSurgery.vetInstructions.slice(0, 60) + "…"],
            behaviorTags, ["Post-Surgery"],
          ));
        }
      }
      if (careConfig.heatCycleTracking && guest.heatCycle) {
        for (const time of HEAT_TRACKING_TIMES) {
          tasks.push(careTask(
            guest, "heat_tracking", time,
            "Heat Cycle Check",
            [`Day ${guest.heatCycle.dayNumber}`, guest.heatCycle.notes ?? ""],
            behaviorTags, ["Heat Cycle"],
          ));
        }
      }
    }
  }

  return tasks.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

export function generateAlerts(
  tasks: ScheduledTask[],
  executions: TaskExecution[],
  currentTime: string,
  behaviorIncidents: BehaviorIncident[] = [],
): GuestAlert[] {
  const alerts: GuestAlert[] = [];
  const guestIds = [...new Set(tasks.map((t) => t.guestId))];

  for (const guestId of guestIds) {
    const guestTasks = tasks.filter((t) => t.guestId === guestId);
    const guestExecs = executions.filter((e) => e.guestId === guestId);
    const petName = guestTasks[0]?.petName ?? "";
    const kennelName = guestTasks[0]?.kennelName ?? "";

    const digestiveIssue = guestExecs.find(
      (e) =>
        e.taskType === "potty" &&
        (e.outcome === "diarrhea" || e.outcome === "soft_stool"),
    );
    if (digestiveIssue) {
      alerts.push({
        id: `digestive-${guestId}`,
        guestId,
        petName,
        kennelName,
        severity: "critical",
        message: "Digestive issue logged — supervisor review required",
        time: digestiveIssue.executedAt,
      });
    }

    const vomitIssue = guestExecs.find(
      (e) => e.taskType === "potty" && e.outcome === "vomit_noticed",
    );
    if (vomitIssue) {
      alerts.push({
        id: `vomit-${guestId}`,
        guestId,
        petName,
        kennelName,
        severity: "critical",
        message: "Vomiting noted during potty break",
        time: vomitIssue.executedAt,
      });
    }

    const refusedMeals = guestExecs.filter(
      (e) => e.taskType === "feeding" && e.outcome === "refused",
    );
    if (refusedMeals.length >= 2) {
      alerts.push({
        id: `meals-${guestId}`,
        guestId,
        petName,
        kennelName,
        severity: "critical",
        message: "Has refused 2+ meals — immediate attention required",
        time: refusedMeals[refusedMeals.length - 1].executedAt,
      });
    }

    const missedMeds = guestExecs.filter(
      (e) => e.taskType === "medication" && e.outcome === "missed",
    );
    if (missedMeds.length > 0) {
      alerts.push({
        id: `meds-${guestId}`,
        guestId,
        petName,
        kennelName,
        severity: "critical",
        message: "Missed medication — review required",
        time: missedMeds[0].executedAt,
      });
    }

    const [currentH] = currentTime.split(":").map(Number);
    if (currentH >= 14) {
      const poopLogged = guestExecs.some(
        (e) =>
          e.taskType === "potty" &&
          (e.outcome === "poop" || e.outcome === "both"),
      );
      if (!poopLogged) {
        alerts.push({
          id: `poop-${guestId}`,
          guestId,
          petName,
          kennelName,
          severity: "warning",
          message: "No bowel movement logged today",
          time: currentTime,
        });
      }
    }
  }

  // Behavior incident alerts — medium → warning, high/critical → critical
  for (const inc of behaviorIncidents) {
    if (inc.severity === "low") continue;
    alerts.push({
      id: `incident-${inc.id}`,
      guestId: inc.guestId,
      petName: inc.petName,
      kennelName: inc.kennelName,
      severity: inc.severity === "medium" ? "warning" : "critical",
      message: `Behavior incident: ${inc.incidentType.replace(/_/g, " ")} — ${inc.description.slice(0, 80)}${inc.description.length > 80 ? "…" : ""}`,
      time: inc.reportedAt,
    });
  }

  return alerts;
}

// ── GuestJournal ──────────────────────────────────────────────────────────────

export function GuestJournal() {
  const currentGuests = useMemo(() => getCurrentGuests(), []);

  const [careConfig, setCareConfig] = useState<CareModulesConfig>(DEFAULT_CARE_MODULES);
  const [behaviorIncidents, setBehaviorIncidents] = useState<BehaviorIncident[]>([]);

  const allTasks = useMemo(
    () => generateScheduledTasks(currentGuests, careConfig),
    [currentGuests, careConfig],
  );

  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("shift");
  const [activeShift, setActiveShift] = useState<ShiftType>("morning");
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string>(
    currentGuests[0]?.id ?? "",
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [logModal, setLogModal] = useState<LogModalState>({
    open: false,
    task: null,
    feedingStep: null,
  });

  const idRef = useRef(0);
  const newId = () => `exec-${++idRef.current}`;

  const currentTime = new Date().toTimeString().slice(0, 5);
  const alerts = useMemo(
    () => generateAlerts(allTasks, executions, currentTime, behaviorIncidents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTasks, executions, behaviorIncidents],
  );

  const getExecForTask = useCallback(
    (taskId: string) => executions.find((e) => e.taskId === taskId),
    [executions],
  );

  const isFeedingServed = useCallback(
    (taskId: string) =>
      executions.some(
        (e) =>
          e.taskId === taskId && e.taskType === "feeding" && !!e.servedAt,
      ),
    [executions],
  );

  const isFeedingComplete = useCallback(
    (taskId: string) =>
      executions.some(
        (e) =>
          e.taskId === taskId && e.taskType === "feeding" && !!e.outcome,
      ),
    [executions],
  );

  const openLogModal = useCallback(
    (task: ScheduledTask) => {
      if (task.taskType === "feeding") {
        const served = isFeedingServed(task.id);
        setLogModal({
          open: true,
          task,
          feedingStep: served ? "outcome" : "serve",
        });
      } else {
        setLogModal({ open: true, task, feedingStep: null });
      }
    },
    [isFeedingServed],
  );

  const handleLogSubmit = useCallback(
    (
      task: ScheduledTask,
      data: {
        outcome: string;
        staffInitials: string;
        notes?: string;
        missedReason?: string;
        isServeStep?: boolean;
      },
    ) => {
      const now = new Date().toTimeString().slice(0, 5);

      if (task.taskType === "feeding" && data.isServeStep) {
        setExecutions((prev) => [
          ...prev,
          {
            id: newId(),
            taskId: task.id,
            guestId: task.guestId,
            taskType: "feeding",
            executedAt: now,
            staffInitials: data.staffInitials,
            outcome: "",
            servedAt: now,
          },
        ]);
        setLogModal({ open: true, task, feedingStep: "outcome" });
        return;
      }

      if (task.taskType === "feeding") {
        setExecutions((prev) =>
          prev.map((e) =>
            e.taskId === task.id && e.taskType === "feeding"
              ? { ...e, outcome: data.outcome, notes: data.notes, executedAt: now }
              : e,
          ),
        );
      } else {
        setExecutions((prev) => [
          ...prev,
          {
            id: newId(),
            taskId: task.id,
            guestId: task.guestId,
            taskType: task.taskType,
            executedAt: now,
            staffInitials: data.staffInitials,
            outcome: data.outcome,
            notes: data.notes,
            missedReason: data.missedReason,
          },
        ]);
      }

      setLogModal({ open: false, task: null, feedingStep: null });
    },
    // newId is stable (ref-based)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleReportIncident = useCallback(
    (incident: Omit<BehaviorIncident, "id">) => {
      setBehaviorIncidents((prev) => [
        ...prev,
        { ...incident, id: `incident-${++idRef.current}` },
      ]);
    },
    [],
  );

  const toggleCareModule = useCallback(
    (module: keyof CareModulesConfig) => {
      setCareConfig((prev) => ({ ...prev, [module]: !prev[module] }));
    },
    [],
  );

  const formattedDate = new Date(
    selectedDate + "T12:00:00",
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const views = [
    { id: "shift" as const, icon: LayoutGrid, label: "Shift Dashboard" },
    { id: "guest" as const, icon: User, label: "Guest View" },
    { id: "manager" as const, icon: ShieldAlert, label: "Manager Overview" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary size-6" />
            <h1 className="text-2xl font-bold tracking-tight">
              Guest Journal
            </h1>
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {formattedDate} · {currentGuests.length} guests in house
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[160px]"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintOpen(true)}
          >
            <Printer className="mr-2 size-4" />
            Print
          </Button>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
        {views.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            data-active={viewMode === id}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all data-[active=false]:text-muted-foreground data-[active=true]:bg-background data-[active=true]:shadow-sm"
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Views */}
      {viewMode === "shift" && (
        <>
          <ShiftView
            guests={currentGuests}
            tasks={allTasks}
            executions={executions}
            alerts={alerts}
            activeShift={activeShift}
            onShiftChange={setActiveShift}
            onLogTask={openLogModal}
            getExecForTask={getExecForTask}
            isFeedingServed={isFeedingServed}
            isFeedingComplete={isFeedingComplete}
          />
          <CareModulesPanel
            config={careConfig}
            tasks={allTasks}
            executions={executions}
            activeShift={activeShift}
            guests={currentGuests}
            behaviorIncidents={behaviorIncidents}
            onToggleModule={toggleCareModule}
            onLogTask={openLogModal}
            onReportIncident={handleReportIncident}
            getExecForTask={getExecForTask}
          />
        </>
      )}
      {viewMode === "guest" && (
        <GuestTimelineView
          guests={currentGuests}
          tasks={allTasks}
          executions={executions}
          selectedGuestId={selectedGuestId}
          onSelectGuest={setSelectedGuestId}
          onLogTask={openLogModal}
          getExecForTask={getExecForTask}
        />
      )}
      {viewMode === "manager" && (
        <ManagerView
          guests={currentGuests}
          tasks={allTasks}
          executions={executions}
          alerts={alerts}
        />
      )}

      <TaskLogModal
        modal={logModal}
        onClose={() =>
          setLogModal({ open: false, task: null, feedingStep: null })
        }
        onSubmit={handleLogSubmit}
      />

      <PrintKennelCardsModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        guests={currentGuests}
      />
    </div>
  );
}
