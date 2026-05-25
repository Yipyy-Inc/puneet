"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Ban,
  GraduationCap,
  Plus,
  User2,
  Users,
} from "lucide-react";
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
import { trainingQueries } from "@/lib/api/training";
import {
  BLOCK_TIME_REASON_LABELS,
  blocksForTrainerOnDate,
  fanOutTimeBlockDelete,
  timeToMinutes,
} from "@/lib/training-time-blocks";

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
  /** Session IDs whose roster includes a pet with an active alert. Drives
   *  the red exclamation badge on the appointment block. */
  alertedSessionIds: Set<string>;
  /** Count of guest make-up dogs joining each session. Drives the blue
   *  "Make-up" badge on the appointment block so the trainer knows a dog
   *  from a different cohort is coming in. */
  makeupCountBySessionId: Map<string, number>;
  onBlockClick: (session: TrainingSession) => void;
  onNew: () => void;
  onSlotClick: (trainerId: string, time: string) => void;
  /** Right-click / long-press: New group session at this slot. */
  onSlotNewGroup: (trainerId: string, time: string) => void;
  /** Right-click / long-press: New private session at this slot. */
  onSlotNewPrivate: (trainerId: string, time: string) => void;
  /** Right-click / long-press: Block this time. */
  onSlotBlockTime: (
    trainerId: string,
    time: string,
    trainerName: string,
  ) => void;
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
  alertedSessionIds,
  makeupCountBySessionId,
  onBlockClick,
  onNew,
  onSlotClick,
  onSlotNewGroup,
  onSlotNewPrivate,
  onSlotBlockTime,
}: Props) {
  const queryClient = useQueryClient();
  const { data: timeBlocks = [] } = useQuery(
    trainingQueries.calendarTimeBlocks(),
  );

  // Context-menu state — opened on right-click / long-press, positioned at
  // the cursor coordinates. Tracks which trainer column + time slot the
  // gesture landed on so the three menu items can fire with the right
  // pre-fill values.
  const [contextMenu, setContextMenu] = useState<{
    trainerId: string;
    trainerName: string;
    time: string;
    x: number;
    y: number;
  } | null>(null);

  function closeContextMenu() {
    setContextMenu(null);
  }
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
            const trainerBlocks = blocksForTrainerOnDate(
              timeBlocks,
              selectedDate,
              trainer.id,
            );

            const slotTimeFromY = (rect: DOMRect, clientY: number): string => {
              const y = clientY - rect.top;
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
              const time = slotTimeFromY(
                e.currentTarget.getBoundingClientRect(),
                e.clientY,
              );
              if (time) onSlotClick(trainer.id, time);
            };

            // Right-click → preventDefault → open our custom context menu.
            // Mobile browsers dispatch contextmenu on long-press too, but
            // we also wire a touch timer below so the gesture works inside
            // PWAs that suppress the synthetic event.
            const handleColumnContextMenu = (
              e: React.MouseEvent<HTMLDivElement>,
            ) => {
              e.preventDefault();
              const time = slotTimeFromY(
                e.currentTarget.getBoundingClientRect(),
                e.clientY,
              );
              setContextMenu({
                trainerId: trainer.id,
                trainerName: trainer.name,
                time,
                x: e.clientX,
                y: e.clientY,
              });
            };

            // Touch long-press: 500ms timer. Cancels on move/end so a
            // regular tap still falls through to onClick.
            let touchTimer: ReturnType<typeof setTimeout> | null = null;
            const handleTouchStart = (
              e: React.TouchEvent<HTMLDivElement>,
            ) => {
              const touch = e.touches[0];
              if (!touch) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const time = slotTimeFromY(rect, touch.clientY);
              const x = touch.clientX;
              const y = touch.clientY;
              touchTimer = setTimeout(() => {
                setContextMenu({
                  trainerId: trainer.id,
                  trainerName: trainer.name,
                  time,
                  x,
                  y,
                });
                touchTimer = null;
              }, 500);
            };
            const cancelTouchTimer = () => {
              if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
              }
            };

            return (
              <div
                key={trainer.id}
                className="relative min-w-[200px] flex-1 cursor-pointer border-l"
                onClick={handleColumnClick}
                onContextMenu={handleColumnContextMenu}
                onTouchStart={handleTouchStart}
                onTouchMove={cancelTouchTimer}
                onTouchEnd={cancelTouchTimer}
                onTouchCancel={cancelTouchTimer}
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
                {/* Striped blocked-time overlays. Click removes the block. */}
                {trainerBlocks.map((block) => {
                  const top =
                    ((timeToMinutes(block.startTime) - START_HOUR * 60) / 60) *
                    HOUR_HEIGHT;
                  const height = Math.max(
                    ((timeToMinutes(block.endTime) -
                      timeToMinutes(block.startTime)) /
                      60) *
                      HOUR_HEIGHT -
                      2,
                    20,
                  );
                  const label = BLOCK_TIME_REASON_LABELS[block.reasonKind];
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Remove this blocked time?\n\n${block.startTime}–${block.endTime} · ${label}`,
                          )
                        ) {
                          fanOutTimeBlockDelete(queryClient, block.id);
                        }
                      }}
                      onContextMenu={(e) => e.stopPropagation()}
                      className={cn(
                        "group absolute left-1 right-1 z-5 flex flex-col items-start gap-0.5 overflow-hidden rounded-md border border-slate-300 px-2 py-1 text-left text-[10px] text-slate-600 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50/40",
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgb(226 232 240) 0px, rgb(226 232 240) 6px, rgb(241 245 249) 6px, rgb(241 245 249) 12px)",
                      }}
                      title={`Blocked · ${label}${block.reasonNote ? ` — ${block.reasonNote}` : ""} · click to remove`}
                    >
                      <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <Ban className="size-2.5" />
                        Blocked
                      </span>
                      <span className="truncate font-medium leading-tight">
                        {label}
                      </span>
                      {block.reasonNote && (
                        <span className="text-muted-foreground truncate text-[9.5px]">
                          {block.reasonNote}
                        </span>
                      )}
                    </button>
                  );
                })}
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
                    hasActiveAlert={alertedSessionIds.has(sess.id)}
                    makeupCount={makeupCountBySessionId.get(sess.id) ?? 0}
                    trainerColor={trainerColor}
                    onClick={onBlockClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right-click / long-press context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={closeContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeContextMenu();
            }}
          />
          <div
            role="menu"
            aria-label="Slot actions"
            className="fixed z-50 min-w-[220px] overflow-hidden rounded-lg border bg-white shadow-lg"
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 240)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 160)}px`,
            }}
          >
            <div className="border-b bg-slate-50 px-3 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {contextMenu.time} · {contextMenu.trainerName}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-indigo-50"
              onClick={() => {
                onSlotNewGroup(contextMenu.trainerId, contextMenu.time);
                closeContextMenu();
              }}
            >
              <Users className="size-4 text-indigo-600" />
              New group session
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-orange-50"
              onClick={() => {
                onSlotNewPrivate(contextMenu.trainerId, contextMenu.time);
                closeContextMenu();
              }}
            >
              <User2 className="size-4 text-orange-600" />
              New private session
            </button>
            <div className="border-t" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-rose-700 hover:bg-rose-50"
              onClick={() => {
                onSlotBlockTime(
                  contextMenu.trainerId,
                  contextMenu.time,
                  contextMenu.trainerName,
                );
                closeContextMenu();
              }}
            >
              <Ban className="size-4" />
              Block this time…
            </button>
          </div>
        </>
      )}
    </div>
  );
}
