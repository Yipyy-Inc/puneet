"use client";

import { cn } from "@/lib/utils";
import { GraduationCap, User2 } from "lucide-react";
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

export function TrainingSessionBlock({
  session,
  classRecord,
  enrolledCount,
  waitlistCount,
  privateAttendee,
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
      {/* Row 1: title + capacity pill + status pill. Always rendered. */}
      <div className="flex items-center gap-1.5 min-w-0">
        {isPrivate ? (
          <User2 className="size-3 shrink-0 opacity-70" aria-hidden />
        ) : (
          <GraduationCap className="size-3 shrink-0 opacity-70" aria-hidden />
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
        <div className="mt-1 flex items-center gap-1.5 text-[10px]">
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
    </button>
  );
}
