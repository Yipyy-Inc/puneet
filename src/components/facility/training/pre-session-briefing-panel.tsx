"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  MapPin,
  PawPrint,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Syringe,
  Trophy,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import { vaccinationRecords } from "@/data/pet-data";
import {
  aggregateStudentBriefing,
  type PreSessionBriefingTask,
  type StudentBriefingRow,
} from "@/lib/training-pre-session";
import type { TrainerNoteCategory } from "@/types/training";

const NOTE_CATEGORY_META: Record<
  TrainerNoteCategory,
  { label: string; cls: string }
> = {
  concern: { label: "Concern", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  behavior: {
    label: "Behavior",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  achievement: {
    label: "Achievement",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  progress: {
    label: "Progress",
    cls: "border-sky-200 bg-sky-50 text-sky-700",
  },
  general: {
    label: "General",
    cls: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((today - target) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function countdownLabel(iso: string, nowMs: number): string {
  const diffMs = new Date(iso).getTime() - nowMs;
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 0) return "starting now";
  if (minutes < 60) return `starts in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `starts in ${hours}h`;
}

export function PreSessionBriefingPanel({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PreSessionBriefingTask | null;
}) {
  const queryClient = useQueryClient();
  const [nowMs] = useState(() => Date.now());
  const todayISO = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  // Pull the data needed to build the briefing rows. We rely on
  // already-cached queries when available, otherwise the underlying queryFn
  // is what produces the mock data anyway.
  const { data: classEnrollments = [] } = useQuery(
    trainingQueries.enrollments(),
  );
  const { data: trainerNotes = [] } = useQuery(trainingQueries.trainerNotes());
  const { data: attendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
  const { data: homework = [] } = useQuery(trainingQueries.allHomework());
  const { data: sessions = [] } = useQuery(trainingQueries.sessions());

  const sessionRecord = useMemo(
    () => (task ? sessions.find((s) => s.id === task.sessionId) : undefined),
    [task, sessions],
  );

  const pets = useMemo(() => clients.flatMap((c) => c.pets), []);
  const ownerByPetId = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clients) {
      for (const pet of c.pets) m.set(pet.id, c.name);
    }
    return m;
  }, []);

  const rows = useMemo<StudentBriefingRow[]>(() => {
    if (!task || !sessionRecord) return [];
    return aggregateStudentBriefing({
      session: sessionRecord,
      enrollments: classEnrollments,
      trainerNotes,
      vaccinations: vaccinationRecords,
      attendances,
      homework,
      pets,
      ownerLookup: (petId) => ownerByPetId.get(petId) ?? "Unknown",
      todayISO,
    });
  }, [
    task,
    sessionRecord,
    classEnrollments,
    trainerNotes,
    attendances,
    homework,
    pets,
    ownerByPetId,
    todayISO,
  ]);

  function markBriefed() {
    if (!task) return;
    const prev =
      queryClient.getQueryData<string[]>(
        trainingQueries.preSessionBriefedSessionIds().queryKey,
      ) ?? [];
    if (!prev.includes(task.sessionId)) {
      queryClient.setQueryData<string[]>(
        trainingQueries.preSessionBriefedSessionIds().queryKey,
        [...prev, task.sessionId],
      );
    }
    toast.success("Briefing reviewed. Have a great session!");
    onOpenChange(false);
  }

  if (!task) return null;

  const summary = summarize(rows);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader className="space-y-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 text-indigo-700 flex size-9 items-center justify-center rounded-xl">
              <ClipboardCheckIcon />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-lg">
                {task.className} — pre-session briefing
              </SheetTitle>
              <SheetDescription className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                <Clock className="size-3" />
                {formatDayTime(task.sessionStartAt)} →{" "}
                {formatTime(task.sessionEndAt)}
                <span className="text-muted-foreground/50">·</span>
                <span className="text-amber-700 inline-flex items-center gap-1 font-medium">
                  <AlarmClock className="size-3" />
                  {countdownLabel(task.sessionStartAt, nowMs)}
                </span>
              </SheetDescription>
              <SheetDescription className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                <Users className="size-3" />
                {task.studentCount} student{task.studentCount === 1 ? "" : "s"}
                <span className="text-muted-foreground/50">·</span>
                {task.trainerName}
                {task.location && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <MapPin className="size-3" />
                    {task.location}
                  </>
                )}
              </SheetDescription>
            </div>
          </div>

          {(summary.vaccineCount > 0 ||
            summary.concernCount > 0 ||
            summary.noShowCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                Heads-up
              </span>
              {summary.vaccineCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                >
                  <ShieldAlert className="size-3" />
                  {summary.vaccineCount} vaccine
                </Badge>
              )}
              {summary.concernCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                >
                  <AlertTriangle className="size-3" />
                  {summary.concernCount} behavior
                </Badge>
              )}
              {summary.noShowCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                >
                  <CalendarCheck className="size-3" />
                  {summary.noShowCount} no-show risk
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-3 py-3">
          {rows.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
              No enrolled students yet for this session.
            </div>
          ) : (
            rows.map((row) => (
              <StudentCard
                key={row.enrollmentId}
                row={row}
                todayISO={todayISO}
              />
            ))
          )}
        </div>

        <SheetFooter className="border-t bg-slate-50/40 pt-3">
          <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Sparkles className="size-3" />
              Yipyy auto-builds this briefing 15 min before each session.
            </p>
            <Button
              size="sm"
              className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={markBriefed}
            >
              <CheckCircle2 className="size-4" />
              Mark briefed
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function summarize(rows: StudentBriefingRow[]): {
  vaccineCount: number;
  concernCount: number;
  noShowCount: number;
} {
  let vaccineCount = 0;
  let concernCount = 0;
  let noShowCount = 0;
  for (const row of rows) {
    if (row.vaccineWarning.hasWarning) vaccineCount++;
    if (
      row.notes.some(
        (n) => n.category === "concern" || n.category === "behavior",
      )
    ) {
      concernCount++;
    }
    if (row.consecutiveNoShows >= 2) noShowCount++;
  }
  return { vaccineCount, concernCount, noShowCount };
}

function StudentCard({
  row,
  todayISO,
}: {
  row: StudentBriefingRow;
  todayISO: string;
}) {
  const [open, setOpen] = useState(
    row.vaccineWarning.hasWarning ||
      row.notes.some(
        (n) => n.category === "concern" || n.category === "behavior",
      ),
  );

  const alertCount =
    (row.vaccineWarning.hasWarning ? 1 : 0) +
    (row.notes.length > 0 ? 1 : 0) +
    (row.consecutiveNoShows >= 2 ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <div className="relative shrink-0">
          {row.petImageUrl ? (
            <div className="size-10 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
              <Image
                src={row.petImageUrl}
                alt={row.petName}
                width={40}
                height={40}
                className="size-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
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
        <div className="flex items-center gap-1.5">
          {row.vaccineWarning.hasWarning && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
              title={
                row.vaccineWarning.soonestName
                  ? `${row.vaccineWarning.soonestName} due in ${row.vaccineWarning.soonestDays ?? 0}d`
                  : undefined
              }
            >
              <ShieldAlert className="size-3" />
              Vaccine
            </Badge>
          )}
          {row.consecutiveNoShows >= 2 && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
            >
              <CalendarCheck className="size-3" />
              No-show risk
            </Badge>
          )}
          {alertCount === 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            >
              <CheckCircle2 className="size-3" />
              All clear
            </Badge>
          )}
          {open ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          {/* Behavioral notes */}
          <section className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <StickyNote className="size-3" />
              Trainer notes
            </p>
            {row.notes.length === 0 ? (
              <p className="text-muted-foreground text-[12px] italic">
                No notes on file for {row.petName} yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {row.notes.map((note) => {
                  const meta = NOTE_CATEGORY_META[note.category];
                  return (
                    <li
                      key={note.id}
                      className="rounded-md border bg-slate-50/40 px-2.5 py-1.5"
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", meta.cls)}
                        >
                          {meta.label}
                        </Badge>
                        <span className="text-muted-foreground text-[10px]">
                          {relativeDays(note.date, todayISO)} ·{" "}
                          {note.trainerName}
                          {note.isPrivate && " · Private"}
                        </span>
                      </div>
                      <p className="text-[12.5px]/relaxed text-slate-700">
                        {note.note}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Vaccine alert */}
          {row.vaccineWarning.hasWarning && (
            <section className="rounded-md border border-rose-200 bg-rose-50/60 px-2.5 py-2">
              <p className="text-rose-700 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Syringe className="size-3" />
                Vaccination alert
              </p>
              <p className="mt-0.5 text-[12.5px]/relaxed text-slate-700">
                {row.vaccineWarning.soonestName}
                {row.vaccineWarning.soonestDays !== null && (
                  <>
                    {" "}
                    is due in{" "}
                    <span className="font-semibold">
                      {row.vaccineWarning.soonestDays} day
                      {row.vaccineWarning.soonestDays === 1 ? "" : "s"}
                    </span>
                    .
                  </>
                )}{" "}
                Flag the owner before the session if you can.
              </p>
            </section>
          )}

          {/* Homework status */}
          <section className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <BookOpen className="size-3" />
              Homework
            </p>
            {row.homework.activeCount === 0 ? (
              <p className="text-muted-foreground text-[12px] italic">
                No active homework — they&apos;re between assignments.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
                >
                  <BookOpen className="size-3" />
                  {row.homework.activeCount} active
                </Badge>
                {row.homework.practicedTodayCount > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    {row.homework.practicedTodayCount} practiced today
                  </Badge>
                )}
                {row.homework.streakDays >= 2 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-orange-200 bg-orange-50 text-[10px] text-orange-700"
                  >
                    <Flame className="size-3" />
                    {row.homework.streakDays}-day streak
                  </Badge>
                )}
                {row.homework.overdueCount > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                  >
                    <AlertTriangle className="size-3" />
                    {row.homework.overdueCount} overdue
                  </Badge>
                )}
                {row.homework.lastPracticedISO && (
                  <span className="text-muted-foreground text-[10.5px]">
                    Last practiced{" "}
                    {relativeDays(row.homework.lastPracticedISO, todayISO)}
                  </span>
                )}
                {!row.homework.lastPracticedISO && (
                  <span className="text-rose-600 inline-flex items-center gap-1 text-[10.5px] italic">
                    <AlertTriangle className="size-3" />
                    Owner hasn&apos;t logged any practice
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Quick wins */}
          {row.notes.some((n) => n.category === "achievement") && (
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px] italic">
              <Trophy className="text-amber-500 size-3" />
              Don&apos;t forget to celebrate recent wins above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ClipboardCheckIcon() {
  // Small inline SVG so we don't add another lucide import just for this.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}
