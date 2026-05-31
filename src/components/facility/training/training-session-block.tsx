"use client";

import { cn } from "@/lib/utils";
import { AlertOctagon, CalendarRange, GraduationCap, User2 } from "lucide-react";
import type { TrainingClass, TrainingSession } from "@/types/training";
import {
  HOUR_HEIGHT,
  START_HOUR,
  STATUS_META,
  timeToMinutes,
} from "./training-calendar-utils";

interface Props {
  session: TrainingSession;
  /** Owning class — drives the group/private split, capacity, and skill level. */
  classRecord: TrainingClass | undefined;
  /** Live enrolled count (derived from enrollments for group classes). */
  enrolledCount: number;
  /** Number of enrollments flagged "waitlisted" for this class — flips the
   *  capacity badge into rose "wait" state once the class is full. */
  waitlistCount: number;
  /** For private sessions: the single dog + owner being coached. */
  privateAttendee?: { petName: string; ownerName: string };
  /** True when at least one enrolled pet has an active trainer alert.
   *  Renders the red exclamation badge on the card. */
  hasActiveAlert?: boolean;
  /** Number of guest make-up dogs joining this session. When > 0 a blue
   *  "Make-up" badge renders on the card so the trainer knows a dog from
   *  a different cohort is coming in. */
  makeupCount?: number;
  trainerColor: string;
  onClick: (session: TrainingSession) => void;
}

type CapacityState = "open" | "full" | "waitlist";

function capacityState(
  enrolled: number,
  capacity: number,
  waitlist: number,
): CapacityState {
  if (waitlist > 0 && enrolled >= capacity) return "waitlist";
  if (capacity > 0 && enrolled >= capacity) return "full";
  return "open";
}

const CAPACITY_PILL_STYLES: Record<CapacityState, string> = {
  open: "bg-emerald-500 text-white",
  full: "bg-amber-500 text-white",
  waitlist: "bg-rose-500 text-white",
};

/** Whole-block capacity halo so full / waitlisted group classes read at a
 *  glance on the calendar without inspecting the small pill. Classes with
 *  open spots get no ring, keeping the grid clean. */
const CAPACITY_RING_STYLES: Record<CapacityState, string> = {
  open: "",
  full: "ring-2 ring-amber-400/70",
  waitlist: "ring-2 ring-rose-400/70",
};

export function TrainingSessionBlock({
  session,
  classRecord,
  enrolledCount,
  waitlistCount,
  privateAttendee,
  hasActiveAlert,
  makeupCount = 0,
  trainerColor,
  onClick,
}: Props) {
  const startMin = timeToMinutes(session.startTime);
  const endMin = timeToMinutes(session.endTime);
  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  // Proportional height with a floor so 30-min blocks remain clickable.
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT - 4, 36);

  const s = STATUS_META[session.status];
  const isPrivate = classRecord?.classType === "private";
  const capacity = classRecord?.capacity ?? 0;

  // Title = class name for group, pet name for private (falls back to class
  // name if no enrollment data yet for the private session).
  const title = isPrivate
    ? (privateAttendee?.petName ?? session.className)
    : session.className;

  const cap = capacityState(enrolledCount, capacity, waitlistCount);
  // Compact text for the row-1 capacity pill. Numbers always show; "+N" tail
  // only when there's a real waitlist so the badge stays narrow normally.
  const capacityCompact = isPrivate
    ? "1:1"
    : `${enrolledCount}/${capacity}${
        cap === "waitlist" ? ` +${waitlistCount}` : ""
      }`;

  // Verbose label for row 2 — spells out "enrolled / Full / +N waitlist" so a
  // glance reads cleanly without staring at the colored pill.
  const capacityVerbose = isPrivate
    ? privateAttendee?.ownerName
    : cap === "open"
      ? `${enrolledCount} of ${capacity} enrolled`
      : cap === "full"
        ? "Full"
        : `${enrolledCount}/${capacity} · +${waitlistCount} waitlist`;

  const capacityTooltip = isPrivate
    ? "Private 1-on-1 session"
    : cap === "open"
      ? `${enrolledCount} of ${capacity} enrolled — ${capacity - enrolledCount} spot${
          capacity - enrolledCount === 1 ? "" : "s"
        } open`
      : cap === "full"
        ? `Class full — ${enrolledCount}/${capacity} enrolled`
        : `Class full with ${waitlistCount} on the waitlist`;

  // Capacity fill ratio for the bottom progress bar (group classes only —
  // private is 1:1). Green under 50% full, amber 50–80%, red 80–100%, so a
  // manager scanning the calendar spots which classes still have open slots
  // (e.g. a 5/8 amber bar vs a 7/8 red bar) without reading every count.
  const fillRatio = capacity > 0 ? Math.min(1, enrolledCount / capacity) : 0;
  const fillPct = Math.round(fillRatio * 100);
  const fillColor =
    fillRatio < 0.5
      ? "bg-emerald-500"
      : fillRatio < 0.8
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(session);
      }}
      className={cn(
        "group absolute left-1 right-1 rounded-lg border border-black/5 backdrop-blur-sm",
        "text-left transition-all overflow-hidden cursor-pointer shadow-sm",
        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "px-2 py-1.5 z-10",
        s.bg,
        s.text,
        // Capacity halo — amber when full, rose when waitlisted (group only).
        !isPrivate && CAPACITY_RING_STYLES[cap],
        session.status === "cancelled" && "opacity-40",
        session.status === "completed" && "opacity-60",
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        borderLeft: `3px solid ${trainerColor}`,
      }}
      title={`${session.className} · ${session.startTime}–${session.endTime} · ${capacityTooltip}`}
    >
      {/* Private sessions get a subtle diagonal hatch over the whole block so a
          trainer can tell group classes from 1-on-1s at a glance — without
          reading the "Private" badge. Uses currentColor (= the status text
          color) so it stays legible on both light and dark backgrounds. */}
      {isPrivate && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0, currentColor 1.5px, transparent 1.5px, transparent 8px)",
          }}
        />
      )}

      {/* Row 1: title + capacity pill + status pill. Always rendered. */}
      <div className="relative z-10 flex items-center gap-1.5 min-w-0">
        {isPrivate ? (
          <User2 className="size-3 shrink-0 opacity-70" aria-hidden />
        ) : (
          <GraduationCap className="size-3 shrink-0 opacity-70" aria-hidden />
        )}
        {hasActiveAlert && (
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm ring-2 ring-white"
            title="One or more enrolled dogs has an active alert — open the session to review."
            aria-label="Active alert on roster"
          >
            <AlertOctagon className="size-2.5" />
          </span>
        )}
        {makeupCount > 0 && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-sky-600 px-1.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm ring-2 ring-white"
            title={`${makeupCount} guest dog${makeupCount === 1 ? "" : "s"} joining as make-up from a different cohort.`}
            aria-label={`${makeupCount} make-up dog${makeupCount === 1 ? "" : "s"} joining`}
          >
            <CalendarRange className="size-2.5" />
            Make-up{makeupCount > 1 ? ` ${makeupCount}` : ""}
          </span>
        )}
        <span className="text-[11px] font-semibold truncate leading-tight">
          {title}
        </span>
        <span
          className={cn(
            "ml-auto inline-flex shrink-0 items-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide shadow-sm tabular-nums",
            isPrivate
              ? "bg-orange-500 text-white"
              : CAPACITY_PILL_STYLES[cap],
          )}
          title={capacityTooltip}
        >
          {capacityCompact}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm",
            s.pill,
          )}
          title={`Status: ${s.label}`}
        >
          {s.label}
        </span>
      </div>

      {/* Row 2: type pill · time · capacity verbose (group) or owner (private). */}
      {height >= 50 && (
        <div className="relative z-10 mt-1 flex items-center gap-1.5 text-[10px]">
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm",
              isPrivate
                ? "bg-orange-500 text-white"
                : "bg-indigo-500 text-white",
            )}
          >
            {isPrivate ? "Private" : "Group"}
          </span>
          <span className="font-semibold tabular-nums opacity-90">
            {session.startTime}–{session.endTime}
          </span>
          {capacityVerbose && (
            <span
              className={cn(
                "truncate opacity-80",
                !isPrivate &&
                  cap === "waitlist" &&
                  "font-semibold text-rose-600 opacity-100 dark:text-rose-300",
                !isPrivate &&
                  cap === "full" &&
                  "font-semibold text-amber-700 opacity-100 dark:text-amber-300",
              )}
              title={capacityVerbose}
            >
              · {capacityVerbose}
            </span>
          )}
        </div>
      )}

      {/* Capacity fill bar — a loading-bar style indicator pinned to the block's
          bottom edge. Group classes only (private is 1:1). Width = how full the
          class is; color escalates green → amber → red as it fills. */}
      {!isPrivate && capacity > 0 && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-10 h-1 bg-black/10 dark:bg-white/15"
        >
          <div
            className={cn("h-full transition-all", fillColor)}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      )}
    </button>
  );
}
