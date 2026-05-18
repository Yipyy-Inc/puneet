"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import type { TrainingSession } from "@/types/training";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import { TrainingCalendarSidebar } from "./training-calendar-sidebar";
import { TrainingCalendarDayView } from "./training-calendar-day-view";
import { TrainingCalendarWeekView } from "./training-calendar-week-view";
import { TrainingCalendarMonthView } from "./training-calendar-month-view";
import { TrainingSessionPanel } from "./training-session-panel";
import { NewTrainingSessionDialog } from "./new-training-session-dialog";
import { SmartSchedulingDialog } from "./smart-scheduling-dialog";
import {
  EMPTY_TRAINING_FILTERS,
  TrainingCalendarFilters,
  applyTrainingCalendarFilters,
  type TrainingCalendarFilterState,
} from "./training-calendar-filters";
import {
  formatISODate,
  getWeekDays,
  type TrainingViewMode,
} from "./training-calendar-utils";

const VIEW_MODES: { id: TrainingViewMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export function TrainingCalendar() {
  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState<TrainingViewMode>("day");
  const [filters, setFilters] = useState<TrainingCalendarFilterState>(
    EMPTY_TRAINING_FILTERS,
  );
  const [search, setSearch] = useState("");
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(
    null,
  );
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionDefaults, setNewSessionDefaults] = useState<{
    date?: string;
    time?: string;
    trainerId?: string;
  }>({});
  const [smartSchedulingOpen, setSmartSchedulingOpen] = useState(false);

  const { data: trainers = [] } = useQuery(trainingQueries.trainers());
  const { data: trainingClasses = [] } = useQuery(trainingQueries.classes());
  const { data: trainingSessions = [] } = useQuery(trainingQueries.sessions());
  const { data: enrollmentList = [] } = useQuery(trainingQueries.enrollments());

  const classesById = useMemo(() => {
    const map: Record<string, (typeof trainingClasses)[number] | undefined> =
      {};
    for (const c of trainingClasses) map[c.id] = c;
    return map;
  }, [trainingClasses]);

  // Live enrolled count per class (rather than the static enrolledCount field).
  const enrolledCountByClassId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enrollmentList) {
      if (e.status !== "enrolled") continue;
      map[e.classId] = (map[e.classId] ?? 0) + 1;
    }
    return map;
  }, [enrollmentList]);

  // Waitlist count per class — drives the rose "+N wait" capacity state on
  // group blocks. Only enrollments explicitly flagged as "waitlisted" count.
  const waitlistCountByClassId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enrollmentList) {
      if (e.status !== "waitlisted") continue;
      map[e.classId] = (map[e.classId] ?? 0) + 1;
    }
    return map;
  }, [enrollmentList]);

  // For private sessions, find the single attendee's pet + owner name.
  const enrollmentsById = useMemo(() => {
    const map: Record<string, (typeof enrollmentList)[number] | undefined> = {};
    for (const e of enrollmentList) map[e.id] = e;
    return map;
  }, [enrollmentList]);

  const privateAttendeeBySessionId = useMemo(() => {
    const map: Record<
      string,
      { petName: string; ownerName: string } | undefined
    > = {};
    for (const sess of trainingSessions) {
      const cls = classesById[sess.classId];
      if (cls?.classType !== "private") continue;
      const enroll = sess.attendees
        .map((id) => enrollmentsById[id])
        .find(Boolean);
      if (enroll) {
        map[sess.id] = {
          petName: enroll.petName,
          ownerName: enroll.ownerName,
        };
      } else if (sess.attendees.length > 0) {
        // Fallback: look up via clients data using the petId on enrollment is
        // already handled above; if no enrollment record matches, leave blank.
        map[sess.id] = undefined;
      }
    }
    return map;
  }, [trainingSessions, classesById, enrollmentsById]);

  const filteredSessions = useMemo(() => {
    const afterFilters = applyTrainingCalendarFilters(
      trainingSessions,
      classesById,
      filters,
    );
    if (!search.trim()) return afterFilters;
    const q = search.trim().toLowerCase();
    return afterFilters.filter((s) => {
      if (s.className.toLowerCase().includes(q)) return true;
      if (s.trainerName.toLowerCase().includes(q)) return true;
      // Search attendee pet/owner names via enrollments.
      for (const aId of s.attendees) {
        const enroll = enrollmentsById[aId];
        if (!enroll) continue;
        if (enroll.petName.toLowerCase().includes(q)) return true;
        if (enroll.ownerName.toLowerCase().includes(q)) return true;
      }
      // Also search clients/pets directly in case a private session hasn't
      // been formalized as an enrollment yet.
      for (const c of clients) {
        if (c.name.toLowerCase().includes(q)) {
          // Only count if any of their dogs are in this session — skip otherwise
          // to avoid noisy false positives.
          continue;
        }
      }
      return false;
    });
  }, [trainingSessions, classesById, filters, search, enrollmentsById]);

  const dateHeader = useMemo(() => {
    if (viewMode === "day") {
      return new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const days = getWeekDays(selectedDate);
      const start = days[0];
      const end = days[6];
      const sameMonth = start.getMonth() === end.getMonth();
      const startLabel = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endLabel = end.toLocaleDateString("en-US", {
        month: sameMonth ? undefined : "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startLabel} – ${endLabel}`;
    }
    return new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, viewMode]);

  function step(direction: -1 | 1) {
    const d = new Date(selectedDate + "T00:00:00");
    if (viewMode === "day") d.setDate(d.getDate() + direction);
    else if (viewMode === "week") d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setSelectedDate(formatISODate(d));
  }

  function openNewSession(defaults: typeof newSessionDefaults = {}) {
    setNewSessionDefaults({ date: selectedDate, ...defaults });
    setNewSessionOpen(true);
  }

  return (
    <div className="flex h-[calc(100vh-180px)] gap-4">
      <TrainingCalendarSidebar
        selectedDate={selectedDate}
        todayStr={todayStr}
        sessions={trainingSessions}
        onDateChange={setSelectedDate}
        onOpenSmartScheduling={() => setSmartSchedulingOpen(true)}
      />

      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => step(-1)}
              aria-label={`Previous ${viewMode}`}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold",
                selectedDate === todayStr
                  ? "text-indigo-700"
                  : "text-slate-600 hover:text-slate-800",
              )}
            >
              Today
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => step(1)}
              aria-label={`Next ${viewMode}`}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <h2 className="text-base font-bold tracking-tight text-slate-800">
            {dateHeader}
          </h2>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search class, trainer, dog…"
                className="h-10 w-56 rounded-full border-slate-200 bg-white pl-9 text-sm shadow-sm"
              />
            </div>

            <TrainingCalendarFilters
              filters={filters}
              onChange={setFilters}
              trainers={trainers}
            />

            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
              {VIEW_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewMode(m.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    viewMode === m.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => openNewSession()}
              className="h-10 rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="mr-1.5 size-4" />
              New Session
            </Button>
          </div>
        </div>

        {/* Views ─────────────────────────────────────────────────────────── */}
        {viewMode === "day" && (
          <TrainingCalendarDayView
            selectedDate={selectedDate}
            sessions={filteredSessions}
            trainers={trainers}
            allClasses={trainingClasses}
            classesById={classesById}
            enrolledCountByClassId={enrolledCountByClassId}
            waitlistCountByClassId={waitlistCountByClassId}
            privateAttendeeBySessionId={privateAttendeeBySessionId}
            onBlockClick={setActiveSession}
            onNew={() => openNewSession()}
            onSlotClick={(trainerId, time) =>
              openNewSession({ trainerId, time })
            }
          />
        )}
        {viewMode === "week" && (
          <TrainingCalendarWeekView
            selectedDate={selectedDate}
            today={todayStr}
            sessions={filteredSessions}
            classesById={classesById}
            onDayClick={(ds) => {
              setSelectedDate(ds);
              setViewMode("day");
            }}
          />
        )}
        {viewMode === "month" && (
          <TrainingCalendarMonthView
            selectedDate={selectedDate}
            today={todayStr}
            sessions={filteredSessions}
            classesById={classesById}
            onDayClick={(ds) => {
              setSelectedDate(ds);
              setViewMode("day");
            }}
          />
        )}
      </div>

      <TrainingSessionPanel
        session={activeSession}
        onClose={() => setActiveSession(null)}
      />

      <NewTrainingSessionDialog
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        defaultDate={newSessionDefaults.date}
        defaultTime={newSessionDefaults.time}
        defaultTrainerId={newSessionDefaults.trainerId}
      />

      <SmartSchedulingDialog
        open={smartSchedulingOpen}
        onOpenChange={setSmartSchedulingOpen}
        onPickSlot={(slot) => {
          setSelectedDate(slot.date);
          setViewMode("day");
          openNewSession({
            date: slot.date,
            time: slot.time,
            trainerId: slot.trainerId,
          });
        }}
      />
    </div>
  );
}
