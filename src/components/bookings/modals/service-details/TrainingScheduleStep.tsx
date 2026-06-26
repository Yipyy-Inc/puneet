"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Lock,
  MapPin,
  Plus,
  Repeat,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { trainingQueries } from "@/lib/api/training";
import { trainingPackages } from "@/data/training";
import { getDayName, type TrainingSeries } from "@/lib/training-series";
import {
  defaultTrainingCourseTypes,
  TRAINING_CLASS_FORMAT_LABELS,
  type TrainingCourseType,
} from "@/lib/training-config";
import {
  checkPrerequisitesWithProgress,
  type PrereqDetail,
} from "@/lib/training-program-prereqs";
import type { TrainingEnrollment } from "@/lib/training-enrollment";
import type { Pet } from "@/types/pet";
import type { Client } from "@/types/client";

interface Props {
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  /** Deep-link the flow to a specific Course Type from the Course Catalog —
   *  skips the course-type picker so a customer who tapped a catalog card
   *  lands straight on its series list. The single source of truth. */
  preSelectedCourseTypeId?: string;
  /** Legacy deep link by Program (Rates tab). Resolved to the program's
   *  course type so the customer `?program=` link keeps working. */
  preSelectedProgramId?: string;
  /** Pets picked in Step 1 — drives the per-series prereq check + who gets
   *  added to the waitlist. */
  selectedPets?: Pet[];
  /** Client picked in Step 1 — the owner attached to a waitlist entry. */
  selectedClient?: Client;
  /** Closes the booking modal — used by the "Create a series" shortcut so
   *  navigating to the Series tab doesn't leave the wizard mounted behind it. */
  onRequestClose?: () => void;
  /** Lifts the chosen series/course up to the booking modal (for the multi-dog
   *  enrollment cart). Called with the selection on enroll/drop-in, or null
   *  when the selection is cleared. */
  onSelectionChange?: (selection: TrainingSelection | null) => void;
}

const NEAR_WINDOW_DAYS = 14;

type Choice =
  | { kind: "enroll"; seriesId: string }
  | { kind: "drop-in"; seriesId: string; sessionId: string }
  | null;

/** The chosen series/course, lifted up to the booking modal so it can build a
 *  multi-dog enrollment cart (one line item per dog). */
export interface TrainingSelection {
  seriesId: string;
  courseTypeId: string;
  courseTypeName: string;
  seriesName: string;
  startDate: string;
  startTime: string;
  endTime: string;
  numberOfWeeks: number;
  price: number;
  kind: "enroll" | "drop-in";
  sessionId?: string;
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map((p) => Number(p));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO + "T00:00:00").getTime();
  const b = new Date(bISO + "T00:00:00").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function dropInPrice(series: TrainingSeries): number {
  const total = series.enrollmentRules.fullPaymentAmount || 0;
  const weeks = series.numberOfWeeks || 1;
  return Math.round(total / weeks);
}

/** Last session date on file for the series — used to know whether the
 *  selected date is "inside the run" (between start and last session). */
function lastSessionDate(series: TrainingSeries): string {
  if (series.sessions.length === 0) return series.startDate;
  return series.sessions[series.sessions.length - 1]!.date;
}

/** Returns true when the series is bookable from the booking flow's
 *  perspective: status is upcoming/active and there's still future life. */
function isBookable(series: TrainingSeries, todayISO: string): boolean {
  if (series.status === "cancelled" || series.status === "completed") {
    return false;
  }
  return lastSessionDate(series) >= todayISO;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function TrainingScheduleStep({
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  preSelectedCourseTypeId,
  preSelectedProgramId,
  selectedPets = [],
  selectedClient,
  onRequestClose,
  onSelectionChange,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: seriesList = [] } = useQuery(trainingQueries.series());
  const { data: allSeriesEnrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: courseTypes = [] } = useQuery(trainingQueries.courseTypes());
  const { data: disciplines = [] } = useQuery(trainingQueries.disciplines());

  const todayISO = useMemo(() => formatDateString(new Date()), []);

  const disciplineNameById = useMemo(
    () => new Map(disciplines.map((d) => [d.id, d.name])),
    [disciplines],
  );

  // Live spots-left per series — counts active enrollments.
  const spotsLeftBySeries = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of seriesList) {
      const enrolled = allSeriesEnrollments.filter(
        (e) => e.seriesId === s.id && e.status === "enrolled",
      ).length;
      m.set(s.id, Math.max(0, s.maxCapacity - enrolled));
    }
    return m;
  }, [seriesList, allSeriesEnrollments]);

  // Resolve a deep-linked course type: directly by id, or by mapping a
  // legacy Program id → the course type its series run (with a fuzzy
  // name fallback so `?program=` keeps landing on the right catalog entry).
  const deepLinkedCourseTypeId = useMemo<string | null>(() => {
    if (preSelectedCourseTypeId) return preSelectedCourseTypeId;
    if (preSelectedProgramId) {
      const viaSeries = seriesList.find(
        (s) => s.programId === preSelectedProgramId,
      )?.courseTypeId;
      if (viaSeries) return viaSeries;
      const program = trainingPackages.find(
        (p) => p.id === preSelectedProgramId,
      );
      if (program) {
        const target = normalize(program.name);
        const ct =
          courseTypes.find((c) => normalize(c.name) === target) ??
          courseTypes.find(
            (c) =>
              normalize(c.name).includes(target) ||
              target.includes(normalize(c.name)),
          );
        if (ct) return ct.id;
      }
    }
    return null;
  }, [preSelectedCourseTypeId, preSelectedProgramId, seriesList, courseTypes]);

  const isDeepLinked = !!(preSelectedCourseTypeId || preSelectedProgramId);

  const [selectedCourseTypeId, setSelectedCourseTypeId] = useState<
    string | null
  >(preSelectedCourseTypeId ?? null);

  // Adopt the deep-linked course type once it resolves (program → course
  // mapping needs the series query to have loaded first).
  const [prevDeepLink, setPrevDeepLink] = useState<string | null>(
    deepLinkedCourseTypeId,
  );
  if (deepLinkedCourseTypeId !== prevDeepLink) {
    setPrevDeepLink(deepLinkedCourseTypeId);
    if (deepLinkedCourseTypeId) setSelectedCourseTypeId(deepLinkedCourseTypeId);
  }

  const [choice, setChoice] = useState<Choice>(null);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  /** Acknowledgement set — series ids for which staff explicitly approved
   *  enrolling a pet that doesn't meet prereqs. */
  const [overriddenSeriesIds, setOverriddenSeriesIds] = useState<Set<string>>(
    () => new Set(),
  );

  const selectedCourseType = useMemo<TrainingCourseType | undefined>(() => {
    if (!selectedCourseTypeId) return undefined;
    return (
      courseTypes.find((c) => c.id === selectedCourseTypeId) ??
      defaultTrainingCourseTypes.find((c) => c.id === selectedCourseTypeId)
    );
  }, [selectedCourseTypeId, courseTypes]);

  function resetSeriesSelection() {
    setChoice(null);
    setStartDate("");
    setCheckInTime("");
    setCheckOutTime("");
    setWaitlistJoined(false);
    onSelectionChange?.(null);
  }

  /** Clear the in-progress series choice (kept times reset) and tell the
   *  parent the line item is gone. */
  function clearSelection() {
    setChoice(null);
    setCheckInTime("");
    setCheckOutTime("");
    onSelectionChange?.(null);
  }

  function handleSelectCourse(id: string) {
    setSelectedCourseTypeId(id);
    resetSeriesSelection();
  }

  function handleChangeCourse() {
    setSelectedCourseTypeId(null);
    resetSeriesSelection();
  }

  function goCreateSeries(courseTypeId: string) {
    onRequestClose?.();
    router.push(
      `/facility/dashboard/services/training/series?create=1&course=${encodeURIComponent(
        courseTypeId,
      )}`,
    );
  }

  const selectedISO = startDate || "";

  const selectedDates = useMemo(() => {
    if (!selectedISO) return [];
    const [y, m, d] = selectedISO.split("-").map(Number);
    return [new Date(y, m - 1, d)];
  }, [selectedISO]);

  // Bookable universe scoped to the chosen course type — the single source
  // of truth for every downstream state.
  const courseBookableSeries = useMemo(() => {
    if (!selectedCourseTypeId) return [];
    return seriesList
      .filter(
        (s) =>
          s.courseTypeId === selectedCourseTypeId && isBookable(s, todayISO),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [seriesList, selectedCourseTypeId, todayISO]);

  // Course-level states the spec calls out.
  const courseHasNoSeries =
    !!selectedCourseTypeId && courseBookableSeries.length === 0;
  const courseAllFull =
    !!selectedCourseTypeId &&
    courseBookableSeries.length > 0 &&
    courseBookableSeries.every((s) => (spotsLeftBySeries.get(s.id) ?? 0) === 0);

  // Series with startDate >= selectedISO — "enroll from start" candidates.
  const enrollableForDate = useMemo(() => {
    if (!selectedISO) return [];
    return courseBookableSeries
      .filter((s) => s.startDate >= selectedISO)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [courseBookableSeries, selectedISO]);

  const nearSeries = useMemo(
    () =>
      enrollableForDate.filter(
        (s) => daysBetween(selectedISO, s.startDate) <= NEAR_WINDOW_DAYS,
      ),
    [enrollableForDate, selectedISO],
  );

  const nextAvailableSeries = useMemo(() => {
    return courseBookableSeries
      .filter((s) => s.startDate >= (selectedISO || todayISO))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [courseBookableSeries, selectedISO, todayISO]);

  // Drop-in candidates — series already running (startDate ≤ selectedISO) but
  // not finished, allowing drop-ins, with a session on the exact selected date.
  const dropInCandidates = useMemo(() => {
    if (!selectedISO) return [];
    return courseBookableSeries
      .filter(
        (s) =>
          s.enrollmentRules.allowDropIns &&
          s.startDate <= selectedISO &&
          lastSessionDate(s) >= selectedISO,
      )
      .map((s) => ({
        series: s,
        session: s.sessions.find((sess) => sess.date === selectedISO),
      }))
      .filter((c) => !!c.session);
  }, [courseBookableSeries, selectedISO]);

  /** Per-series prereq lookup — resolves the program tied to the series then
   *  runs the prereq check for every selected pet. */
  function prereqIssueForSeries(
    series: TrainingSeries,
  ): { program: { id: string; name: string }; details: PrereqDetail[] } | null {
    if (selectedPets.length === 0) return null;
    const target = normalize(series.courseTypeName);
    const program =
      trainingPackages.find((p) => p.id === series.programId) ??
      trainingPackages.find((p) => normalize(p.name) === target);
    if (!program) return null;
    if ((program.prerequisitePackageIds?.length ?? 0) === 0) return null;
    const blocker: PrereqDetail[] = [];
    for (const pet of selectedPets) {
      const details = checkPrerequisitesWithProgress(
        pet.id,
        program,
        allSeriesEnrollments,
      );
      for (const d of details) {
        if (!d.satisfied && !blocker.some((b) => b.programId === d.programId)) {
          blocker.push(d);
        }
      }
    }
    if (blocker.length === 0) return null;
    return {
      program: { id: program.id, name: program.name },
      details: blocker,
    };
  }

  function applyEnrollChoice(series: TrainingSeries) {
    setChoice({ kind: "enroll", seriesId: series.id });
    setStartDate(series.startDate);
    setCheckInTime(series.startTime);
    setCheckOutTime(series.endTime);
    onSelectionChange?.({
      seriesId: series.id,
      courseTypeId: series.courseTypeId,
      courseTypeName: series.courseTypeName,
      seriesName: series.seriesName,
      startDate: series.startDate,
      startTime: series.startTime,
      endTime: series.endTime,
      numberOfWeeks: series.numberOfWeeks,
      price: series.enrollmentRules.fullPaymentAmount,
      kind: "enroll",
    });
  }

  function acknowledgePrereqOverride(seriesId: string) {
    setOverriddenSeriesIds((curr) => {
      const next = new Set(curr);
      next.add(seriesId);
      return next;
    });
  }

  function applyDropInChoice(
    series: TrainingSeries,
    session: { id: string; date: string; startTime: string; endTime: string },
  ) {
    setChoice({ kind: "drop-in", seriesId: series.id, sessionId: session.id });
    setStartDate(session.date);
    setCheckInTime(session.startTime);
    setCheckOutTime(session.endTime);
    onSelectionChange?.({
      seriesId: series.id,
      courseTypeId: series.courseTypeId,
      courseTypeName: series.courseTypeName,
      seriesName: series.seriesName,
      startDate: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      numberOfWeeks: series.numberOfWeeks,
      price: dropInPrice(series),
      kind: "drop-in",
      sessionId: session.id,
    });
  }

  /** Course-level waitlist join (every series for the course is full). Writes
   *  one `waitlisted` TrainingEnrollment per selected dog, hung off the
   *  earliest upcoming series that has waitlisting enabled (falling back to
   *  the earliest series), and fans it out through the series-enrollment
   *  caches so the trainer's Waitlist tab + Students roster see it instantly —
   *  the same pathway the customer-portal waitlist dialog uses. */
  function handleJoinCourseWaitlist() {
    if (!selectedCourseType || courseBookableSeries.length === 0) return;
    const upcoming = courseBookableSeries.filter(
      (s) => s.status === "upcoming",
    );
    const candidates = upcoming.length > 0 ? upcoming : courseBookableSeries;
    const sorted = candidates
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const host =
      sorted.find((s) => s.enrollmentRules.waitlistEnabled) ?? sorted[0];
    if (!host) return;

    // Training enrollments are dog-only; fall back to all selected pets if
    // none are tagged as dogs so the demo never silently no-ops.
    const dogs = selectedPets.filter((p) => p.type === "Dog");
    const petsToList = dogs.length > 0 ? dogs : selectedPets;

    if (petsToList.length === 0 || !selectedClient) {
      // No pet/owner context to attach a record to — still flip the UI so the
      // staffer sees the intent registered.
      setWaitlistJoined(true);
      toast.success(`Added to the waitlist for ${selectedCourseType.name}.`);
      return;
    }

    const nowISO = new Date().toISOString();
    const todayISO = nowISO.slice(0, 10);
    const newEntries: TrainingEnrollment[] = petsToList.map((pet, i) => ({
      id: `waitlist-${host.id}-${pet.id}-${Date.now()}-${i}`,
      seriesId: host.id,
      seriesName: host.seriesName,
      courseTypeId: host.courseTypeId,
      courseTypeName: host.courseTypeName,
      petId: pet.id,
      petName: pet.name,
      petBreed: pet.breed ?? "",
      ownerId: selectedClient.id,
      ownerName: selectedClient.name,
      ownerPhone: selectedClient.phone ?? "",
      ownerEmail: selectedClient.email ?? "",
      enrollmentDate: todayISO,
      status: "waitlisted",
      sessionsAttended: 0,
      totalSessions: host.numberOfWeeks,
      currentSessionNumber: 1,
      progress: 0,
      paymentStatus: "unpaid",
      notes: "",
      preferredTimeOfDay: "no-preference",
      createdAt: nowISO,
      updatedAt: nowISO,
    }));

    const cache = queryClient.getQueryCache();
    // All cross-series rollups (the "all" list the Students roster reads).
    cache
      .findAll({ queryKey: ["training", "series-enrollments"] })
      .forEach((q) => {
        queryClient.setQueryData<TrainingEnrollment[]>(
          q.queryKey,
          (prev = []) => [...prev, ...newEntries],
        );
      });
    // The host series' own enrollment list — drives its Waitlist tab.
    cache.findAll({ queryKey: ["training", "series"] }).forEach((q) => {
      if (q.queryKey[3] !== "enrollments") return;
      if (q.queryKey[2] !== host.id) return;
      queryClient.setQueryData<TrainingEnrollment[]>(
        q.queryKey,
        (prev = []) => [...prev, ...newEntries],
      );
    });

    setWaitlistJoined(true);
    const who =
      petsToList.length === 1
        ? petsToList[0].name
        : `${petsToList.length} dogs`;
    toast.success(
      `${who} added to the waitlist for ${selectedCourseType.name}.`,
      {
        description: "We'll text + email the moment a spot opens.",
        duration: 6_000,
      },
    );
  }

  // ── Phase 1: pick a course type from the Course Catalog ──────────────────
  if (!selectedCourseTypeId || !selectedCourseType) {
    return (
      <CourseTypePicker
        courseTypes={courseTypes}
        seriesList={seriesList}
        spotsLeftBySeries={spotsLeftBySeries}
        disciplineNameById={disciplineNameById}
        todayISO={todayISO}
        onSelect={handleSelectCourse}
      />
    );
  }

  // ── Phase 2: pick a series for the chosen course type ────────────────────
  return (
    <div className="space-y-5">
      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${selectedCourseType.color ?? "#6366f1"}1a`,
          }}
        >
          <GraduationCap
            className="size-5"
            style={{ color: selectedCourseType.color ?? "#6366f1" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{selectedCourseType.name}</h3>
            <Badge
              variant="outline"
              className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700"
            >
              <GraduationCap className="size-3" />
              Course type
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {courseHasNoSeries
              ? "No scheduled series for this course yet."
              : "Pick a date — we'll surface every series for this course starting on or after it."}
          </p>
        </div>
        {!isDeepLinked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1"
            onClick={handleChangeCourse}
          >
            <ArrowLeft className="size-3.5" />
            Change course
          </Button>
        )}
      </div>

      {courseHasNoSeries ? (
        <NoUpcomingSeriesForCourse
          courseType={selectedCourseType}
          onCreateSeries={() => goCreateSeries(selectedCourseType.id)}
        />
      ) : courseAllFull ? (
        <AllSeriesFullForCourse
          courseType={selectedCourseType}
          series={courseBookableSeries}
          spotsLeftBySeries={spotsLeftBySeries}
          joined={waitlistJoined}
          onJoinWaitlist={handleJoinCourseWaitlist}
        />
      ) : (
        <>
          {/* Calendar + series panel ──────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Calendar */}
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <DateSelectionCalendar
                mode="single"
                selectedDates={selectedDates}
                onSelectionChange={(dates) => {
                  if (dates.length > 0) {
                    setStartDate(formatDateString(dates[0]!));
                    setChoice(null);
                    setCheckInTime("");
                    setCheckOutTime("");
                  } else {
                    setStartDate("");
                    setCheckInTime("");
                    setCheckOutTime("");
                    setChoice(null);
                  }
                  // Either branch drops the active series choice.
                  onSelectionChange?.(null);
                }}
              />
            </div>

            {/* Series panel */}
            <div className="rounded-xl border bg-slate-50/40 p-3 dark:bg-slate-950/40">
              {!selectedISO ? (
                <EmptyHint
                  icon={CalendarDays}
                  title="Pick a date to see series"
                  text="Choose a date on the calendar. We'll show every series for this course running on or after that date."
                />
              ) : nearSeries.length === 0 && dropInCandidates.length === 0 ? (
                <NoSeriesNearDate
                  selectedISO={selectedISO}
                  nextSeries={nextAvailableSeries}
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Available series</h4>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {nearSeries.length} starting near{" "}
                      {formatLongDate(selectedISO)}
                    </span>
                  </div>

                  {nearSeries.map((series) => {
                    const spotsLeft = spotsLeftBySeries.get(series.id) ?? 0;
                    const isSelected =
                      choice?.kind === "enroll" &&
                      choice.seriesId === series.id;
                    const prereqIssue = prereqIssueForSeries(series);
                    const isAcknowledged = overriddenSeriesIds.has(series.id);
                    return (
                      <BookingSeriesCard
                        key={series.id}
                        series={series}
                        spotsLeft={spotsLeft}
                        isSelected={isSelected}
                        prereqIssue={prereqIssue}
                        prereqAcknowledged={isAcknowledged}
                        selectedPets={selectedPets}
                        onEnroll={() => applyEnrollChoice(series)}
                        onAcknowledgePrereq={() =>
                          acknowledgePrereqOverride(series.id)
                        }
                        onClear={clearSelection}
                      />
                    );
                  })}

                  {dropInCandidates.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          Drop-in for {formatLongDate(selectedISO)}
                        </h4>
                        <span className="text-muted-foreground text-[11px]">
                          Single session — already running
                        </span>
                      </div>
                      {dropInCandidates.map(({ series, session }) => {
                        if (!session) return null;
                        const isSelected =
                          choice?.kind === "drop-in" &&
                          choice.seriesId === series.id &&
                          choice.sessionId === session.id;
                        return (
                          <DropInSeriesCard
                            key={session.id}
                            series={series}
                            session={session}
                            isSelected={isSelected}
                            onBook={() => applyDropInChoice(series, session)}
                            onClear={() => {
                              setChoice(null);
                              setCheckInTime("");
                              setCheckOutTime("");
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confirmed selection summary ──────────────────────────────── */}
          {checkInTime && checkOutTime && choice && (
            <SelectionSummary
              choice={choice}
              seriesList={seriesList}
              selectedISO={selectedISO}
            />
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Phase 1 — Course type picker
// ============================================================================

function CourseTypePicker({
  courseTypes,
  seriesList,
  spotsLeftBySeries,
  disciplineNameById,
  todayISO,
  onSelect,
}: {
  courseTypes: TrainingCourseType[];
  seriesList: TrainingSeries[];
  spotsLeftBySeries: Map<string, number>;
  disciplineNameById: Map<string, string>;
  todayISO: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <BookOpen className="text-primary size-5" />
        </div>
        <div>
          <h3 className="font-semibold">Choose a course type</h3>
          <p className="text-muted-foreground text-sm">
            Pick a course from your Course Catalog. We&apos;ll show the
            scheduled series that run it.
          </p>
        </div>
      </div>

      {courseTypes.length === 0 ? (
        <EmptyHint
          icon={BookOpen}
          title="No course types yet"
          text="Add a course type in the Course Catalog before booking training."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courseTypes.map((ct) => {
            const series = seriesList.filter(
              (s) => s.courseTypeId === ct.id && isBookable(s, todayISO),
            );
            const total = series.length;
            const openCount = series.filter(
              (s) => (spotsLeftBySeries.get(s.id) ?? 0) > 0,
            ).length;
            const disciplineName = ct.disciplineId
              ? disciplineNameById.get(ct.disciplineId)
              : undefined;
            return (
              <CourseTypeCard
                key={ct.id}
                courseType={ct}
                disciplineName={disciplineName}
                totalSeries={total}
                openSeries={openCount}
                onSelect={() => onSelect(ct.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseTypeCard({
  courseType,
  disciplineName,
  totalSeries,
  openSeries,
  onSelect,
}: {
  courseType: TrainingCourseType;
  disciplineName?: string;
  totalSeries: number;
  openSeries: number;
  onSelect: () => void;
}) {
  const hint =
    totalSeries === 0
      ? { label: "No upcoming series", cls: "bg-slate-100 text-slate-600" }
      : openSeries === 0
        ? {
            label: "All series full — waitlist",
            cls: "bg-amber-100 text-amber-700",
          }
        : {
            label: `${openSeries} series available`,
            cls: "bg-emerald-100 text-emerald-700",
          };
  const format = courseType.classFormat
    ? TRAINING_CLASS_FORMAT_LABELS[courseType.classFormat]
    : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group hover:border-primary/50 bg-card flex h-full flex-col gap-2 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: courseType.color ?? "#6366f1" }}
          />
          <p className="leading-tight font-semibold">{courseType.name}</p>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {disciplineName && (
          <Badge variant="secondary" className="text-[11px]">
            {disciplineName}
          </Badge>
        )}
        {format && (
          <Badge variant="outline" className="text-[11px]">
            {format}
          </Badge>
        )}
        <Badge variant="outline" className="text-[11px]">
          {courseType.defaultWeeks} wks
        </Badge>
      </div>

      <p className="text-muted-foreground line-clamp-2 text-xs">
        {courseType.description}
      </p>

      <div className="mt-auto pt-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            hint.cls,
          )}
        >
          <Users className="size-3" />
          {hint.label}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Course-level empty / full states
// ============================================================================

function NoUpcomingSeriesForCourse({
  courseType,
  onCreateSeries,
}: {
  courseType: TrainingCourseType;
  onCreateSeries: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
      <CalendarDays className="mx-auto size-8 text-amber-500" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          No upcoming series for {courseType.name}.
        </p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          Ask staff to create one before this client can enroll. You can spin up
          a series for this course right now.
        </p>
      </div>
      <Button
        type="button"
        onClick={onCreateSeries}
        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <Plus className="size-4" />
        Create a series for this course
      </Button>
    </div>
  );
}

function AllSeriesFullForCourse({
  courseType,
  series,
  spotsLeftBySeries,
  joined,
  onJoinWaitlist,
}: {
  courseType: TrainingCourseType;
  series: TrainingSeries[];
  spotsLeftBySeries: Map<string, number>;
  joined: boolean;
  onJoinWaitlist: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Every series for {courseType.name} is full.
            </p>
            <p className="text-muted-foreground text-sm">
              {joined
                ? "You're on the waitlist — we'll reach out as soon as a spot opens or a new series is scheduled."
                : "All scheduled series are at capacity. Join the waitlist and we'll offer the next available spot."}
            </p>
          </div>
        </div>
        {joined ? (
          <Button
            type="button"
            variant="outline"
            disabled
            className="w-full gap-1.5"
          >
            <CheckCircle2 className="size-4 text-emerald-600" />
            Added to the waitlist
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onJoinWaitlist}
            className="w-full gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
          >
            <Clock className="size-4" />
            Join waitlist for {courseType.name}
          </Button>
        )}
      </div>

      {/* The full series, for context. */}
      <div className="space-y-2">
        {series.map((s) => {
          const spotsLeft = spotsLeftBySeries.get(s.id) ?? 0;
          return (
            <Card key={s.id} className="opacity-90">
              <CardContent className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {s.seriesName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {getDayName(s.dayOfWeek)}s · {formatTime12(s.startTime)} ·
                    starts {formatLongDate(s.startDate)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1 border-rose-200 bg-rose-50 text-rose-700"
                >
                  <Users className="size-3" />
                  Full — {s.maxCapacity}/{s.maxCapacity}
                  <span className="sr-only">{spotsLeft} spots left</span>
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Pieces (series-level)
// ============================================================================

function EmptyHint({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <Icon className="size-7 opacity-60" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs">{text}</p>
    </div>
  );
}

function NoSeriesNearDate({
  selectedISO,
  nextSeries,
}: {
  selectedISO: string;
  nextSeries: TrainingSeries | undefined;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-4 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
      <CalendarDays className="mx-auto size-7 text-amber-500" />
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          No sessions available near {formatLongDate(selectedISO)}.
        </p>
        {nextSeries ? (
          <p className="text-muted-foreground mt-1 text-sm">
            The next available series starts on{" "}
            <span className="text-foreground font-semibold">
              {formatLongDate(nextSeries.startDate)}
            </span>
            .
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            No upcoming series are open for enrollment right now.
          </p>
        )}
      </div>
      <Button variant="outline" className="w-full gap-1.5">
        <Clock className="size-4" />
        Join Waitlist
      </Button>
    </div>
  );
}

function BookingSeriesCard({
  series,
  spotsLeft,
  isSelected,
  prereqIssue,
  prereqAcknowledged,
  selectedPets,
  onEnroll,
  onAcknowledgePrereq,
  onClear,
}: {
  series: TrainingSeries;
  spotsLeft: number;
  isSelected: boolean;
  prereqIssue: {
    program: { id: string; name: string };
    details: PrereqDetail[];
  } | null;
  prereqAcknowledged: boolean;
  selectedPets: Pet[];
  onEnroll: () => void;
  onAcknowledgePrereq: () => void;
  onClear: () => void;
}) {
  const isFull = spotsLeft === 0;
  const isAlmostFull = !isFull && spotsLeft <= 3;
  const spotsCls = isFull
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : isAlmostFull
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const hasPrereqBlocker = !!prereqIssue;
  const needsAcknowledgement = hasPrereqBlocker && !prereqAcknowledged;

  return (
    <Card
      className={cn(
        "transition-colors",
        isSelected && "border-indigo-400 ring-2 ring-indigo-200",
        hasPrereqBlocker && "border-amber-300",
      )}
    >
      <CardContent className="space-y-2.5 p-3.5">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-base/tight font-semibold">{series.seriesName}</p>
            {hasPrereqBlocker && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                title="Selected dog hasn't completed required prerequisites."
              >
                <Lock className="size-3" />
                Prerequisite required
              </Badge>
            )}
          </div>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <li className="flex items-center gap-2">
              <Repeat className="text-muted-foreground size-3.5 shrink-0" />
              <span>
                {getDayName(series.dayOfWeek)}s ·{" "}
                {formatTime12(series.startTime)}
                {series.numberOfWeeks > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {series.numberOfWeeks} weeks
                  </span>
                )}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <User className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">{series.instructorName}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">{series.location}</span>
            </li>
            <li className="flex items-center gap-2">
              <CalendarDays className="text-muted-foreground size-3.5 shrink-0" />
              <span>
                Starts{" "}
                <span className="font-semibold">
                  {formatLongDate(series.startDate)}
                </span>
              </span>
            </li>
          </ul>
        </div>

        <Badge variant="outline" className={cn("w-fit gap-1 border", spotsCls)}>
          <Users className="size-3" />
          {isFull
            ? `Full — ${series.maxCapacity} of ${series.maxCapacity} enrolled`
            : `${spotsLeft} of ${series.maxCapacity} spots left`}
        </Badge>

        {/* Prereq warning — yellow banner that staff must acknowledge to
            enroll a dog who hasn't completed the required programs. */}
        {needsAcknowledgement && (
          <PrereqWarningBanner
            issue={prereqIssue!}
            series={series}
            selectedPets={selectedPets}
            onOverride={() => {
              onAcknowledgePrereq();
              onEnroll();
            }}
          />
        )}
        {hasPrereqBlocker && prereqAcknowledged && (
          <p className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="size-3" />
            Enrolling without prerequisite — override acknowledged.
          </p>
        )}

        {isSelected ? (
          <Button
            className="w-full gap-1.5"
            variant="outline"
            onClick={onClear}
          >
            <CheckCircle2 className="size-4 text-emerald-600" />
            Enrolled — click to change
          </Button>
        ) : isFull ? (
          <Button variant="outline" className="w-full gap-1.5">
            <Clock className="size-4" />
            Join Waitlist
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              if (needsAcknowledgement) {
                return;
              }
              onEnroll();
            }}
            disabled={needsAcknowledgement}
            variant={needsAcknowledgement ? "outline" : "default"}
            title={
              needsAcknowledgement
                ? "Acknowledge the prerequisite warning above to proceed."
                : undefined
            }
          >
            {needsAcknowledgement ? (
              <>
                <Lock className="mr-1 size-4" />
                Acknowledge to enroll
              </>
            ) : (
              "Enroll"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PrereqWarningBanner({
  issue,
  series,
  selectedPets,
  onOverride,
}: {
  issue: { program: { id: string; name: string }; details: PrereqDetail[] };
  series: TrainingSeries;
  selectedPets: Pet[];
  onOverride: () => void;
}) {
  const missingNames = issue.details
    .filter((d) => !d.satisfied)
    .map((d) => d.programName);
  const petNamesList =
    selectedPets.map((p) => p.name).join(", ") || "Selected dog";
  const prereqClause =
    missingNames.length === 1 ? missingNames[0] : missingNames.join(" and ");
  return (
    <div className="space-y-2 rounded-md border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="space-y-1 text-[12.5px]/relaxed text-amber-900 dark:text-amber-100">
          <p className="font-semibold">
            {petNamesList} has not completed {prereqClause}, which is required
            before enrolling in {issue.program.name}.
          </p>
          {issue.details
            .filter((d) => !d.satisfied && d.inProgress)
            .map((d) => (
              <p
                key={d.programId}
                className="text-amber-800 dark:text-amber-200"
              >
                Currently in{" "}
                <span className="font-medium">{d.inProgress!.seriesName}</span>{" "}
                — {d.inProgress!.sessionsAttended} of{" "}
                {d.inProgress!.totalSessions} sessions completed.
              </p>
            ))}
          <p className="text-amber-800 dark:text-amber-200">
            Some facilities allow exceptions for dogs with documented prior
            training. Continue only if that&apos;s the case here.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onOverride}
          className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
        >
          <AlertTriangle className="size-3.5" />
          Override and enroll in {series.seriesName.split("—")[0].trim()}
        </Button>
      </div>
    </div>
  );
}

function DropInSeriesCard({
  series,
  session,
  isSelected,
  onBook,
  onClear,
}: {
  series: TrainingSeries;
  session: {
    id: string;
    sessionNumber: number;
    startTime: string;
    endTime: string;
    date: string;
  };
  isSelected: boolean;
  onBook: () => void;
  onClear: () => void;
}) {
  const price = dropInPrice(series);

  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        isSelected && "border-indigo-400 ring-2 ring-indigo-200",
      )}
    >
      <CardContent className="space-y-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base/tight font-semibold">{series.seriesName}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-bold tracking-wider uppercase">
              Drop-in · Session {session.sessionNumber} of{" "}
              {series.numberOfWeeks}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-indigo-200 bg-indigo-50 text-indigo-700"
          >
            <Ticket className="mr-1 size-3" />${price}
          </Badge>
        </div>

        <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
          <li className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-3.5 shrink-0" />
            <span>
              {formatTime12(session.startTime)} –{" "}
              {formatTime12(session.endTime)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <User className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate">{series.instructorName}</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate">{series.location}</span>
          </li>
        </ul>

        {isSelected ? (
          <Button
            className="w-full gap-1.5"
            variant="outline"
            onClick={onClear}
          >
            <CheckCircle2 className="size-4 text-emerald-600" />
            Booked — click to change
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-1.5"
            onClick={onBook}
          >
            <Ticket className="size-4" />
            Book this drop-in
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SelectionSummary({
  choice,
  seriesList,
  selectedISO,
}: {
  choice: NonNullable<Choice>;
  seriesList: TrainingSeries[];
  selectedISO: string;
}) {
  const series = seriesList.find((s) => s.id === choice.seriesId);
  if (!series) return null;
  if (choice.kind === "enroll") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="size-4" />
          Enrolling in {series.seriesName}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {getDayName(series.dayOfWeek)}s · {formatTime12(series.startTime)} ·{" "}
          {series.numberOfWeeks} weeks · starts{" "}
          {formatLongDate(series.startDate)}.
        </p>
      </div>
    );
  }
  const session = series.sessions.find((s) => s.id === choice.sessionId);
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
      <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
        <CheckCircle2 className="size-4" />
        Drop-in: {series.seriesName}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {formatLongDate(selectedISO)} ·{" "}
        {session
          ? `${formatTime12(session.startTime)}–${formatTime12(session.endTime)}`
          : ""}{" "}
        · Session {session?.sessionNumber} of {series.numberOfWeeks}
      </p>
    </div>
  );
}
