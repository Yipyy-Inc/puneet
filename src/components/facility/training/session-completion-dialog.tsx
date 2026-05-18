"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Cloud,
  CloudRain,
  Flame,
  GraduationCap,
  Info,
  MapPin,
  PawPrint,
  Snowflake,
  StickyNote,
  Sun,
  Timer,
  User2,
  Users,
  Wind,
  Zap,
} from "lucide-react";
import type { TrainingClass, TrainingSession } from "@/types/training";
import type {
  DistractionLevel,
  SessionConditions,
  WeatherCondition,
} from "@/lib/training-enrollment";
import {
  SessionCompletionStepTwo,
  type PresentStudentRow,
  type SessionExerciseLog,
} from "./session-completion-step-two";
import {
  SessionCompletionHomework,
  type HomeworkAssignment,
} from "./session-completion-homework";

const WEATHER_OPTIONS: {
  value: WeatherCondition;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: "sunny", label: "Sunny", Icon: Sun },
  { value: "cloudy", label: "Cloudy", Icon: Cloud },
  { value: "rain", label: "Rain", Icon: CloudRain },
  { value: "hot", label: "Hot", Icon: Flame },
  { value: "cold", label: "Cold", Icon: Snowflake },
  { value: "windy", label: "Windy", Icon: Wind },
];

const DISTRACTION_OPTIONS: {
  value: DistractionLevel;
  label: string;
  activeCls: string;
}[] = [
  {
    value: "low",
    label: "Low",
    activeCls: "border-emerald-300 bg-emerald-100 text-emerald-700",
  },
  {
    value: "medium",
    label: "Medium",
    activeCls: "border-amber-300 bg-amber-100 text-amber-700",
  },
  {
    value: "high",
    label: "High",
    activeCls: "border-rose-300 bg-rose-100 text-rose-700",
  },
];

export type AttendanceChoice = "present" | "absent" | "late";
export type { SessionExerciseLog, HomeworkAssignment };

interface AttendanceRow {
  enrollmentId: string;
  petId: number;
  petName: string;
  petBreed: string;
  petPhotoUrl?: string;
  ownerName: string;
}

export interface SessionCompletionResult {
  attendance: Record<string, AttendanceChoice>;
  locationOverride: string;
  endTimeOverride: string;
  /** Exercise logs applied to every present student's attendance record. For
   *  group classes the same list is fanned out to each enrollment id; for
   *  private sessions the single student gets it. */
  exercisesByEnrollment: Record<string, SessionExerciseLog[]>;
  /** Overall session narrative. Group classes share one summary across every
   *  present student; private sessions carry one for the single dog. */
  sessionSummary: string;
  /** Optional per-dog narrative addendum. Only populated for group classes —
   *  private sessions roll the dog-specific story into `sessionSummary`. The
   *  board handler appends this to each pet's `trainerNotes` so it shows up
   *  only on that dog's training history. */
  individualNotesByEnrollment: Record<string, string>;
  /** Environment + distraction context for the session — applied to every
   *  present student's attendance record. */
  conditions: SessionConditions;
  /** Homework assignments dispatched to every present student's owner. */
  homework: HomeworkAssignment[];
}

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  session: TrainingSession | null;
  classRecord: TrainingClass | undefined;
  rows: AttendanceRow[];
  /** Pre-fill from board state — present/late/absent guesses based on the
   *  current check-in / no-show state on the activity board. Staff can flip
   *  any of them before confirming. */
  initialAttendance: Record<string, AttendanceChoice | undefined>;
  /** Series the session belongs to, when the link exists. */
  seriesName?: string;
  onConfirm: (result: SessionCompletionResult) => void;
}

const ATTENDANCE_META: Record<
  AttendanceChoice,
  {
    label: string;
    cls: string;
    activeCls: string;
    Icon: typeof CheckCircle2;
  }
> = {
  present: {
    label: "Present",
    cls: "border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
    activeCls: "border-emerald-300 bg-emerald-100 text-emerald-700",
    Icon: CheckCircle2,
  },
  late: {
    label: "Late",
    cls: "border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700",
    activeCls: "border-amber-300 bg-amber-100 text-amber-700",
    Icon: Timer,
  },
  absent: {
    label: "Absent",
    cls: "border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700",
    activeCls: "border-rose-300 bg-rose-100 text-rose-700",
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

/** Heuristic for surfacing the "outdoor class" hint on the conditions panel
 *  — keyword match against the (possibly overridden) location string. */
function isOutdoorClass(location: string): boolean {
  const v = location.toLowerCase();
  return (
    v.includes("outdoor") ||
    v.includes("yard") ||
    v.includes("park") ||
    v.includes("agility") ||
    v.includes("field")
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
          "bg-indigo-600 text-white",
        )}
      >
        1
      </span>
      <span className="font-semibold text-slate-700">Confirmation</span>
      <ChevronRight className="text-muted-foreground size-3" />
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
          step === 2
            ? "bg-indigo-600 text-white"
            : "bg-slate-200 text-slate-500",
        )}
      >
        2
      </span>
      <span
        className={cn(
          "font-semibold",
          step === 2 ? "text-slate-700" : "text-muted-foreground",
        )}
      >
        Details
      </span>
    </div>
  );
}

export function SessionCompletionDialog({
  open,
  onOpenChange,
  session,
  classRecord,
  rows,
  initialAttendance,
  seriesName,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [location, setLocation] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceChoice>
  >({});
  // Group classes log one shared list once; private sessions effectively do
  // the same since they have one student. The dialog fans the list out to
  // each present student on save so the per-pet Progress chart still gets
  // datapoints to plot.
  const [sharedExercises, setSharedExercises] = useState<
    SessionExerciseLog[]
  >([]);
  const [individualNotes, setIndividualNotes] = useState<
    Record<string, string>
  >({});
  const [sessionSummary, setSessionSummary] = useState("");
  const [weather, setWeather] = useState<WeatherCondition[]>([]);
  const [distractionLevel, setDistractionLevel] = useState<
    DistractionLevel | undefined
  >(undefined);
  const [homeworkAssignments, setHomeworkAssignments] = useState<
    HomeworkAssignment[]
  >([]);

  // Re-sync local state when the dialog opens against a different session.
  useEffect(() => {
    if (!open || !session) return;
    setStep(1);
    setLocation(classRecord?.location ?? "");
    setEndTime(session.endTime);
    const next: Record<string, AttendanceChoice> = {};
    for (const r of rows) {
      next[r.enrollmentId] =
        initialAttendance[r.enrollmentId] ?? "present";
    }
    setAttendance(next);
    setSharedExercises([]);
    setIndividualNotes({});
    setSessionSummary("");
    setWeather([]);
    setDistractionLevel(undefined);
    setHomeworkAssignments([]);
  }, [open, session, classRecord, rows, initialAttendance]);

  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const choice of Object.values(attendance)) {
      if (choice === "present") present++;
      else if (choice === "late") late++;
      else absent++;
    }
    return { present, late, absent, total: rows.length };
  }, [attendance, rows.length]);

  if (!session) return null;

  const isPrivate = classRecord?.classType === "private";

  function setChoice(enrollmentId: string, choice: AttendanceChoice) {
    setAttendance((prev) => ({ ...prev, [enrollmentId]: choice }));
  }

  function handleContinue() {
    setStep(2);
  }

  function handleSave() {
    // Strip empty rows from the shared exercise list (half-filled rows).
    const cleanedExercises = sharedExercises.filter((l) => l.exerciseId);
    // Fan the cleaned shared list out to every present/late student so the
    // existing per-pet save path on the board still works unchanged.
    const exercisesByEnrollment: Record<string, SessionExerciseLog[]> = {};
    for (const row of rows) {
      if (attendance[row.enrollmentId] === "absent") continue;
      exercisesByEnrollment[row.enrollmentId] = cleanedExercises;
    }
    // Filter individual notes — only keep present/late students with a
    // non-empty trimmed note. Private classes won't have any of these.
    const cleanedIndividualNotes: Record<string, string> = {};
    for (const [eid, note] of Object.entries(individualNotes)) {
      const trimmed = note.trim();
      if (!trimmed) continue;
      if (attendance[eid] === "absent") continue;
      cleanedIndividualNotes[eid] = trimmed;
    }
    // Drop any homework rows where the exercise pick is blank — those are
    // half-filled rows the staff abandoned.
    const cleanedHomework = homeworkAssignments.filter(
      (h) => h.exerciseId && h.exerciseName,
    );
    onConfirm({
      attendance,
      locationOverride: location,
      endTimeOverride: endTime,
      exercisesByEnrollment,
      sessionSummary: sessionSummary.trim(),
      individualNotesByEnrollment: cleanedIndividualNotes,
      conditions: { weather, distractionLevel },
      homework: cleanedHomework,
    });
    onOpenChange(false);
  }

  function toggleWeather(value: WeatherCondition) {
    setWeather((prev) =>
      prev.includes(value)
        ? prev.filter((w) => w !== value)
        : [...prev, value],
    );
  }

  /** Roster handed to Step 2 — only present/late students. */
  const presentStudents: PresentStudentRow[] = rows
    .filter((r) => attendance[r.enrollmentId] !== "absent")
    .map((r) => ({
      enrollmentId: r.enrollmentId,
      petId: r.petId,
      petName: r.petName,
      petBreed: r.petBreed,
      petPhotoUrl: r.petPhotoUrl,
      ownerName: r.ownerName,
      attendanceLabel:
        attendance[r.enrollmentId] === "late" ? "Late" : "Present",
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Complete session — {session.className}
          </DialogTitle>
          <DialogDescription>
            Confirm attendance and finalize this session&apos;s records.
          </DialogDescription>
          <div className="mt-2">
            <StepIndicator step={step} />
          </div>
        </DialogHeader>

        {/* ── Step 1: Session Confirmation ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 py-2">
            {/* Session metadata grid */}
            <div className="rounded-xl border bg-slate-50/40 p-3">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground size-3.5" />
                  <span className="font-semibold text-slate-700">
                    {formatDate(session.date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-muted-foreground size-3.5" />
                  <span>{session.trainerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isPrivate ? (
                    <User2 className="text-muted-foreground size-3.5" />
                  ) : (
                    <Users className="text-muted-foreground size-3.5" />
                  )}
                  <span>
                    {session.className}{" "}
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-1 gap-1 border text-[10px]",
                        isPrivate
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-indigo-200 bg-indigo-50 text-indigo-700",
                      )}
                    >
                      {isPrivate ? "Private 1-on-1" : "Group class"}
                    </Badge>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                    Series
                  </span>
                  <span className="text-sm">
                    {seriesName ?? (
                      <span className="text-muted-foreground/60 italic">
                        N/A
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable adjustments */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  <MapPin className="mr-1 inline size-3 align-text-bottom" />
                  Location
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Training Room A"
                />
                <p className="text-muted-foreground text-[11px]">
                  Adjust if the room changed at the last minute.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  <Timer className="mr-1 inline size-3 align-text-bottom" />
                  End time
                </Label>
                <TimePickerLux
                  value={endTime}
                  onValueChange={setEndTime}
                  displayMode="dialog"
                />
                <p className="text-muted-foreground text-[11px]">
                  Bump the end time if the class ran long.
                </p>
              </div>
            </div>

            {/* Attendance roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight text-slate-800">
                  Attendance
                </h3>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    {summary.present} present
                  </Badge>
                  {summary.late > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-50 text-amber-700"
                    >
                      <Timer className="size-3" />
                      {summary.late} late
                    </Badge>
                  )}
                  {summary.absent > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-rose-200 bg-rose-50 text-rose-700"
                    >
                      <CircleSlash className="size-3" />
                      {summary.absent} absent
                    </Badge>
                  )}
                </div>
              </div>

              {rows.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
                  No students enrolled in this session.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border">
                  {rows.map((row) => {
                    const choice = attendance[row.enrollmentId] ?? "present";
                    return (
                      <li
                        key={row.enrollmentId}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <div className="relative shrink-0">
                          {row.petPhotoUrl ? (
                            <div className="size-9 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                              <Image
                                src={row.petPhotoUrl}
                                alt={row.petName}
                                width={36}
                                height={36}
                                className="size-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm">
                              <PawPrint className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {row.petName}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {row.petBreed} · {row.ownerName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(
                            ["present", "late", "absent"] as AttendanceChoice[]
                          ).map((c) => {
                            const meta = ATTENDANCE_META[c];
                            const Icon = meta.Icon;
                            const active = choice === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setChoice(row.enrollmentId, c)}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                  active ? meta.activeCls : meta.cls,
                                )}
                              >
                                <Icon className="size-3" />
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {summary.absent > 0 && (
                <p className="bg-muted/40 text-muted-foreground flex items-start gap-1.5 rounded-md px-3 py-2 text-[11px]">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  Absent students still consume a session from their package
                  — the class itself ran, so it doesn&apos;t roll back the
                  series completion count.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Training Log ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-slate-50/40 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-800">
                Step 1 confirmed
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {summary.present} present
                {summary.late > 0 && ` · ${summary.late} late`}
                {summary.absent > 0 && ` · ${summary.absent} absent`}
                {" · "}
                {location}
                {" · ends "}
                {endTime}
              </p>
            </div>
            <SessionCompletionStepTwo
              className={session.className}
              isPrivate={isPrivate}
              students={presentStudents}
              sharedExercises={sharedExercises}
              setSharedExercises={setSharedExercises}
              individualNotes={individualNotes}
              setIndividualNote={(enrollmentId, note) =>
                setIndividualNotes((prev) => ({
                  ...prev,
                  [enrollmentId]: note,
                }))
              }
            />

            {/* Conditions — gives the ratings context when reviewed later. */}
            {presentStudents.length > 0 && (
              <div className="bg-card rounded-xl border shadow-sm">
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
                  <Cloud className="text-muted-foreground size-4" />
                  <h3 className="text-sm font-bold tracking-tight text-slate-800">
                    Conditions
                  </h3>
                  {isOutdoorClass(location) ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-sky-200 bg-sky-50 text-[10px] text-sky-700"
                      title="This class is in an outdoor location — weather matters."
                    >
                      Outdoor class
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">
                      Optional — useful when the dog had to work through
                      anything unusual.
                    </span>
                  )}
                </div>
                <div className="space-y-4 px-4 py-3">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Weather (select all that apply)
                    </Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {WEATHER_OPTIONS.map(({ value, label, Icon }) => {
                        const active = weather.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleWeather(value)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                              active
                                ? "border-sky-300 bg-sky-100 text-sky-700"
                                : "border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700",
                            )}
                          >
                            <Icon className="size-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <Zap className="mr-1 inline size-3 align-text-bottom" />
                      Distraction level
                    </Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {DISTRACTION_OPTIONS.map(
                        ({ value, label, activeCls }) => {
                          const active = distractionLevel === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setDistractionLevel(active ? undefined : value)
                              }
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                                active
                                  ? activeCls
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              {label}
                            </button>
                          );
                        },
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-[11px]">
                      How much the dog had to work through — other dogs,
                      sounds, smells, environment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Session summary — group shares one, private targets the dog. */}
            {presentStudents.length > 0 && (
              <div className="bg-card rounded-xl border shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-2.5">
                  <StickyNote className="text-muted-foreground size-4" />
                  <h3 className="text-sm font-bold tracking-tight text-slate-800">
                    Session summary
                  </h3>
                  {isPrivate ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-orange-200 bg-orange-50 text-[10px] text-orange-700"
                      title="One-on-one — summary is for this dog."
                    >
                      <User2 className="size-3" />
                      For {presentStudents[0].petName}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
                      title="Group class — same summary goes to every present student."
                    >
                      <Users className="size-3" />
                      Applies to {presentStudents.length} present student
                      {presentStudents.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
                <div className="px-4 py-3">
                  <Textarea
                    rows={4}
                    value={sessionSummary}
                    onChange={(e) => setSessionSummary(e.target.value)}
                    placeholder={
                      isPrivate
                        ? `e.g. ${presentStudents[0].petName} had a breakthrough on leash pressure today. We focused on heeling pattern work for 20 minutes and saw real improvement. Ready to add mild distractions next session.`
                        : "Overall narrative for the class — what was covered, how the group responded, themes to follow up on."
                    }
                  />
                  <p className="text-muted-foreground mt-1.5 text-[11px]">
                    {isPrivate
                      ? "Lands on this dog's attendance record as the session summary."
                      : "Copies onto every present student's attendance record — clients can see this in their portal."}
                  </p>
                </div>
              </div>
            )}

            {/* Homework — dispatched to each present student's owner. */}
            {presentStudents.length > 0 && (
              <SessionCompletionHomework
                className={session.className}
                isPrivate={isPrivate}
                privatePetName={presentStudents[0]?.petName}
                presentStudentCount={presentStudents.length}
                assignments={homeworkAssignments}
                setAssignments={setHomeworkAssignments}
              />
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={rows.length === 0}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Continue
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1 size-4" />
                Back
              </Button>
              <Button
                onClick={handleSave}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-1 size-4" />
                Save attendance
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
