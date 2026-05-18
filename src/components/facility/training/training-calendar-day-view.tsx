"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  SkillLevel,
  Trainer,
  TrainingClass,
  TrainingSession,
} from "@/types/training";
import { TrainingSessionBlock } from "./training-session-block";
import {
  HOURS,
  HOUR_HEIGHT,
  START_HOUR,
  colorForTrainer,
  formatHour,
} from "./training-calendar-utils";

interface Props {
  selectedDate: string;
  sessions: TrainingSession[];
  trainers: Trainer[];
  /** All classes (needed for skill-level fallback when a trainer has no sessions today). */
  allClasses: TrainingClass[];
  classesById: Record<string, TrainingClass | undefined>;
  enrolledCountByClassId: Record<string, number>;
  waitlistCountByClassId: Record<string, number>;
  privateAttendeeBySessionId: Record<
    string,
    { petName: string; ownerName: string } | undefined
  >;
  onBlockClick: (session: TrainingSession) => void;
  onNew: () => void;
  onSlotClick: (trainerId: string, time: string) => void;
}

const SKILL_BADGE: Record<
  SkillLevel | "mixed",
  { label: string; cls: string }
> = {
  beginner: {
    label: "Beginner",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  intermediate: {
    label: "Intermediate",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  },
  advanced: {
    label: "Advanced",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  },
  "all-levels": {
    label: "All Levels",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  },
  mixed: {
    label: "Mixed",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  },
};

/** Resolve a single skill-level badge for a trainer:
 *  - prefer the union of skill levels they're teaching TODAY,
 *  - falling back to the union across all their active classes,
 *  - returning "mixed" when more than one level is in play. */
function resolveTrainerLevel(
  trainerSessions: TrainingSession[],
  classesById: Record<string, TrainingClass | undefined>,
  allClasses: TrainingClass[],
  trainerId: string,
): SkillLevel | "mixed" | null {
  const todayLevels = new Set<SkillLevel>();
  for (const s of trainerSessions) {
    const cls = classesById[s.classId];
    if (cls) todayLevels.add(cls.skillLevel);
  }
  if (todayLevels.size === 1) return [...todayLevels][0];
  if (todayLevels.size > 1) return "mixed";

  const fallbackLevels = new Set<SkillLevel>();
  for (const c of allClasses) {
    if (c.trainerId !== trainerId) continue;
    if (c.status !== "active") continue;
    fallbackLevels.add(c.skillLevel);
  }
  if (fallbackLevels.size === 1) return [...fallbackLevels][0];
  if (fallbackLevels.size > 1) return "mixed";
  return null;
}

export function TrainingCalendarDayView({
  selectedDate,
  sessions,
  trainers,
  allClasses,
  classesById,
  enrolledCountByClassId,
  waitlistCountByClassId,
  privateAttendeeBySessionId,
  onBlockClick,
  onNew,
  onSlotClick,
}: Props) {
  const activeTrainers = trainers.filter((t) => t.status === "active");

  const dateSessions = useMemo(
    () => sessions.filter((s) => s.date === selectedDate),
    [sessions, selectedDate],
  );

  // Per-trainer session list for the selected date — reused in header (count
  // + skill level) and column body (block rendering).
  const sessionsByTrainerId = useMemo(() => {
    const map: Record<string, TrainingSession[]> = {};
    for (const s of dateSessions) {
      if (!map[s.trainerId]) map[s.trainerId] = [];
      map[s.trainerId].push(s);
    }
    return map;
  }, [dateSessions]);

  if (activeTrainers.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
          <GraduationCap className="text-muted-foreground size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">No active trainers</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Add a trainer before scheduling sessions.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onNew}>
          <Plus className="mr-1.5 size-4" />
          New Session
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card flex-1 overflow-auto rounded-xl border shadow-sm">
      <div style={{ minWidth: `${64 + activeTrainers.length * 200}px` }}>
        {/* Trainer column headers */}
        <div
          className="bg-card/95 sticky top-0 z-20 flex border-b backdrop-blur-sm"
          style={{ paddingLeft: "4rem" }}
        >
          {activeTrainers.map((trainer) => {
            const headerColor = colorForTrainer(trainer.id);
            const trainerSessions = sessionsByTrainerId[trainer.id] ?? [];
            const sessionCount = trainerSessions.length;
            const level = resolveTrainerLevel(
              trainerSessions,
              classesById,
              allClasses,
              trainer.id,
            );
            const badge = level ? SKILL_BADGE[level] : null;
            return (
              <div
                key={trainer.id}
                className="min-w-[200px] flex-1 border-l px-3 py-2.5"
                style={{ borderTop: `2px solid ${headerColor}` }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: headerColor }}
                  >
                    {trainer.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs/tight font-semibold">
                      {trainer.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {badge && (
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            badge.cls,
                          )}
                          title={`Teaching ${badge.label.toLowerCase()} today`}
                        >
                          {badge.label}
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                          sessionCount > 0
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400",
                        )}
                        title={
                          sessionCount === 0
                            ? "No sessions today"
                            : `${sessionCount} session${sessionCount === 1 ? "" : "s"} today`
                        }
                      >
                        <span className="tabular-nums">{sessionCount}</span>
                        <span className="uppercase tracking-wide">
                          {sessionCount === 1 ? "session" : "sessions"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Hour gutter */}
          <div className="w-16 shrink-0 select-none" aria-hidden>
            {HOURS.map((h) => (
              <div
                key={h}
                className="relative"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-muted-foreground/70 absolute -top-[9px] right-2 text-[10px] leading-none">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Trainer columns */}
          {activeTrainers.map((trainer) => {
            const trainerSessions = sessionsByTrainerId[trainer.id] ?? [];
            const trainerColor = colorForTrainer(trainer.id);

            const slotTimeFromEvent = (
              e: React.MouseEvent<HTMLDivElement>,
            ): string | null => {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const slotsFromStart = Math.max(
                0,
                Math.floor((y / HOUR_HEIGHT) * 2),
              );
              const totalMinutes = START_HOUR * 60 + slotsFromStart * 30;
              const h = Math.floor(totalMinutes / 60);
              const m = totalMinutes % 60;
              return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            };

            const handleColumnClick = (
              e: React.MouseEvent<HTMLDivElement>,
            ) => {
              const time = slotTimeFromEvent(e);
              if (time) onSlotClick(trainer.id, time);
            };

            return (
              <div
                key={trainer.id}
                className="relative min-w-[200px] flex-1 cursor-pointer border-l"
                onClick={handleColumnClick}
                role="button"
                tabIndex={-1}
                aria-label={`Schedule slot for ${trainer.name}`}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-border/30 border-b"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    <div className="border-border/20 h-1/2 border-b border-dashed" />
                  </div>
                ))}
                {trainerSessions.map((sess) => (
                  <TrainingSessionBlock
                    key={sess.id}
                    session={sess}
                    classRecord={classesById[sess.classId]}
                    enrolledCount={
                      enrolledCountByClassId[sess.classId] ??
                      sess.attendees?.length ??
                      0
                    }
                    waitlistCount={waitlistCountByClassId[sess.classId] ?? 0}
                    privateAttendee={privateAttendeeBySessionId[sess.id]}
                    trainerColor={trainerColor}
                    onClick={onBlockClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
