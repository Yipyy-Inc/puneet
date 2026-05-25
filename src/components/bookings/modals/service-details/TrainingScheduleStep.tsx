"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  MapPin,
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
import { matchSeriesForCourse } from "@/app/customer/training/_components/customer-training-catalog";
import {
  checkPrerequisitesWithProgress,
  type PrereqDetail,
} from "@/lib/training-program-prereqs";
import type { Pet } from "@/types/pet";

interface Props {
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  /** When provided, the series list filters to instances of this Program so
   *  a customer who deep-linked from a catalog card sees only matching
   *  series instead of the entire training catalog. */
  preSelectedProgramId?: string;
  /** Pets picked in Step 1 — drives the per-series prereq check. When the
   *  selected pet doesn't meet a series' program prerequisites, the card
   *  shows a Lock badge + a yellow warning banner surfaces on click so
   *  staff has to actively acknowledge to proceed. */
  selectedPets?: Pet[];
}

const NEAR_WINDOW_DAYS = 14;

type Choice =
  | { kind: "enroll"; seriesId: string }
  | { kind: "drop-in"; seriesId: string; sessionId: string }
  | null;

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

export function TrainingScheduleStep({
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  preSelectedProgramId,
  selectedPets = [],
}: Props) {
  const { data: seriesList = [] } = useQuery(trainingQueries.series());
  const { data: allSeriesEnrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: packages = [] } = useQuery(trainingQueries.packages());

  const selectedProgram = useMemo(
    () =>
      preSelectedProgramId
        ? packages.find((p) => p.id === preSelectedProgramId)
        : undefined,
    [preSelectedProgramId, packages],
  );

  // Series eligible for this booking — if a program is locked in, restrict
  // to instances of that program (using both the direct `programId` link
  // and the fuzzy name matcher the catalog uses).
  const programScopedSeries = useMemo(() => {
    if (!selectedProgram) return seriesList;
    const matchedByName = new Set(
      matchSeriesForCourse(selectedProgram, seriesList).map((s) => s.id),
    );
    return seriesList.filter(
      (s) => s.programId === selectedProgram.id || matchedByName.has(s.id),
    );
  }, [selectedProgram, seriesList]);

  const [choice, setChoice] = useState<Choice>(null);

  /** Acknowledgement set — series ids for which staff explicitly approved
   *  enrolling a pet that doesn't meet prereqs. The warning banner stays
   *  visible until staff taps "Override and proceed." */
  const [overriddenSeriesIds, setOverriddenSeriesIds] = useState<Set<string>>(
    () => new Set(),
  );

  const todayISO = useMemo(() => formatDateString(new Date()), []);
  const selectedISO = startDate || "";

  const selectedDates = useMemo(() => {
    if (!selectedISO) return [];
    const [y, m, d] = selectedISO.split("-").map(Number);
    return [new Date(y, m - 1, d)];
  }, [selectedISO]);

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

  // Bookable universe — drops cancelled/completed series we'd never book into.
  const bookableSeries = useMemo(
    () => programScopedSeries.filter((s) => isBookable(s, todayISO)),
    [programScopedSeries, todayISO],
  );

  // Series with startDate >= selectedISO — these are the "enroll from start"
  // candidates per the spec.
  const enrollableForDate = useMemo(() => {
    if (!selectedISO) return [];
    return bookableSeries
      .filter((s) => s.startDate >= selectedISO)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [bookableSeries, selectedISO]);

  // "Near" gate — when there are no series starting within NEAR_WINDOW_DAYS,
  // surface the empty-state with the next available series.
  const nearSeries = useMemo(
    () =>
      enrollableForDate.filter(
        (s) => daysBetween(selectedISO, s.startDate) <= NEAR_WINDOW_DAYS,
      ),
    [enrollableForDate, selectedISO],
  );

  const nextAvailableSeries = useMemo(() => {
    return bookableSeries
      .filter((s) => s.startDate >= (selectedISO || todayISO))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [bookableSeries, selectedISO, todayISO]);

  // Drop-in candidates — series already running (startDate ≤ selectedISO) but
  // not finished yet (lastSessionDate ≥ selectedISO), AND the series allows
  // drop-ins, AND there's a session on the exact selected date.
  const dropInCandidates = useMemo(() => {
    if (!selectedISO) return [];
    return bookableSeries
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
  }, [bookableSeries, selectedISO]);

  /** Per-series prereq lookup — resolves the program tied to the series
   *  (via `programId` direct, or fuzzy course-type-name match) then runs
   *  the prereq check for every selected pet. Returns the union of missing
   *  prereqs across all selected pets, so the warning surfaces even when
   *  multiple pets are being enrolled at once. */
  function prereqIssueForSeries(
    series: TrainingSeries,
  ): { program: { id: string; name: string }; details: PrereqDetail[] } | null {
    if (selectedPets.length === 0) return null;
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
    // Set the booking dates to the series' first session — that's what the
    // owner is signing up for. Subsequent sessions are implicit in the series
    // and surfaced on the confirm step.
    setStartDate(series.startDate);
    setCheckInTime(series.startTime);
    setCheckOutTime(series.endTime);
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
  }

  return (
    <div className="space-y-5">
      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <GraduationCap className="text-primary size-5" />
        </div>
        <div className="min-w-0 flex-1">
          {selectedProgram ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">
                  Pick a series for {selectedProgram.name}
                </h3>
                <Badge
                  variant="outline"
                  className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700"
                >
                  <GraduationCap className="size-3" />
                  Program selected
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Showing only series that run this program. Pick a date —
                we&apos;ll surface every matching series starting on or after
                it.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-semibold">Pick a training series</h3>
              <p className="text-muted-foreground text-sm">
                Pick a date — we&apos;ll show you every series starting on or
                after that date. Each one runs at a fixed time on a fixed day
                of the week.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Calendar + series panel ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calendar */}
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <DateSelectionCalendar
            mode="single"
            selectedDates={selectedDates}
            onSelectionChange={(dates) => {
              if (dates.length > 0) {
                setStartDate(formatDateString(dates[0]!));
                // Clear any previous series choice — the trainer is picking a
                // new starting date, so any previously-set times should reset
                // until they re-pick a series.
                setChoice(null);
                setCheckInTime("");
                setCheckOutTime("");
              } else {
                setStartDate("");
                setCheckInTime("");
                setCheckOutTime("");
                setChoice(null);
              }
            }}
          />
        </div>

        {/* Series panel */}
        <div className="rounded-xl border bg-slate-50/40 p-3 dark:bg-slate-950/40">
          {!selectedISO ? (
            <EmptyHint
              icon={CalendarDays}
              title="Pick a date to see series"
              text="Choose a date on the calendar. We'll show every training series running on or after that date."
            />
          ) : nearSeries.length === 0 && dropInCandidates.length === 0 ? (
            <NoSeriesNearDate
              selectedISO={selectedISO}
              nextSeries={nextAvailableSeries}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  Available series
                </h4>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {nearSeries.length} starting near{" "}
                  {formatLongDate(selectedISO)}
                </span>
              </div>

              {nearSeries.map((series) => {
                const spotsLeft = spotsLeftBySeries.get(series.id) ?? 0;
                const isSelected =
                  choice?.kind === "enroll" && choice.seriesId === series.id;
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
                    onClear={() => {
                      setChoice(null);
                      setCheckInTime("");
                      setCheckOutTime("");
                    }}
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

      {/* Confirmed selection summary ────────────────────────────────────── */}
      {checkInTime && checkOutTime && choice && (
        <SelectionSummary
          choice={choice}
          seriesList={seriesList}
          selectedISO={selectedISO}
        />
      )}
    </div>
  );
}

// ============================================================================
// Pieces
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
      <CalendarDays className="text-amber-500 mx-auto size-7" />
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          No sessions available near {formatLongDate(selectedISO)}.
        </p>
        {nextSeries ? (
          <p className="text-muted-foreground mt-1 text-sm">
            The next available series starts on{" "}
            <span className="font-semibold text-foreground">
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
  prereqIssue:
    | { program: { id: string; name: string }; details: PrereqDetail[] }
    | null;
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
            <p className="text-base font-semibold leading-tight">
              {series.seriesName}
            </p>
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
                {getDayName(series.dayOfWeek)}s · {formatTime12(series.startTime)}
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

        <Badge
          variant="outline"
          className={cn("gap-1 border w-fit", spotsCls)}
        >
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
          <p className="text-amber-800 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
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
            <CheckCircle2 className="text-emerald-600 size-4" />
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
                // Staff has to actively acknowledge — the banner already
                // surfaces the override CTA, so the primary button stays
                // disabled-feeling and just scrolls to it. We render this
                // as an outline so the warning banner is clearly the
                // pathway forward.
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
  const petNamesList = selectedPets.map((p) => p.name).join(", ") || "Selected dog";
  const prereqClause =
    missingNames.length === 1
      ? missingNames[0]
      : missingNames.join(" and ");
  return (
    <div className="space-y-2 rounded-md border-2 border-amber-300 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-amber-600 mt-0.5 size-4 shrink-0" />
        <div className="space-y-1 text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-100">
          <p className="font-semibold">
            {petNamesList} has not completed {prereqClause}, which is required
            before enrolling in {issue.program.name}.
          </p>
          {issue.details
            .filter((d) => !d.satisfied && d.inProgress)
            .map((d) => (
              <p key={d.programId} className="text-amber-800 dark:text-amber-200">
                Currently in <span className="font-medium">
                  {d.inProgress!.seriesName}
                </span>{" "}
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
  session: { id: string; sessionNumber: number; startTime: string; endTime: string; date: string };
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
            <p className="text-base font-semibold leading-tight">
              {series.seriesName}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-bold uppercase tracking-wider">
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
              {formatTime12(session.startTime)} – {formatTime12(session.endTime)}
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
            <CheckCircle2 className="text-emerald-600 size-4" />
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
        <p className="text-emerald-900 dark:text-emerald-200 inline-flex items-center gap-1.5 font-semibold">
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
      <p className="text-emerald-900 dark:text-emerald-200 inline-flex items-center gap-1.5 font-semibold">
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

