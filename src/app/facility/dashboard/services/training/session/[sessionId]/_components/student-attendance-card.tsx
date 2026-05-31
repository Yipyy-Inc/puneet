"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  Clock3,
  PawPrint,
  Phone,
  ShieldAlert,
  Ticket,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { hasMessagingProfile } from "@/lib/messaging-profile";
import { isClientBlocked } from "@/lib/blocked-clients";
import type { Enrollment } from "@/types/training";
import type { StudentBriefingRow } from "@/lib/training-pre-session";
import type { AttendanceMark } from "./session-view-types";
import { RequestRecordsButton } from "./request-records-button";

// Pixels of horizontal drag required before the card commits to a mark.
// Anything below this threshold snaps back so a stray finger doesn't
// accidentally mark attendance.
const SWIPE_COMMIT_PX = 72;
// Hard ceiling on how far the card can slide visually — keeps the colored
// reveal panel readable without the card disappearing off-screen.
const SWIPE_MAX_PX = 140;

interface Props {
  row: StudentBriefingRow;
  enrollment: Enrollment | undefined;
  mark: AttendanceMark | undefined;
  onMark: (status: AttendanceMark["status"]) => void;
  /** When true, the student is a guest from outside the cohort — they
   *  booked this single session via the drop-in flow. Adds a "Drop-in"
   *  badge so the trainer knows they're not a full-series enrollee. */
  isDropIn?: boolean;
}

const STATUS_BTN_STYLES: Record<
  AttendanceMark["status"],
  { active: string; idle: string; ringColor: string }
> = {
  present: {
    active: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    idle: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    ringColor: "ring-emerald-500",
  },
  absent: {
    active: "bg-red-600 text-white shadow-sm hover:bg-red-700",
    idle: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    ringColor: "ring-red-500",
  },
  late: {
    active: "bg-amber-500 text-white shadow-sm hover:bg-amber-600",
    idle: "border border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
    ringColor: "ring-amber-500",
  },
};

const STATUS_BORDER: Record<AttendanceMark["status"], string> = {
  present: "border-emerald-300 dark:border-emerald-700",
  absent: "border-red-300 dark:border-red-700",
  late: "border-amber-300 dark:border-amber-700",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StudentAttendanceCard({
  row,
  enrollment,
  mark,
  onMark,
  isDropIn,
}: Props) {
  const ownerPhone = enrollment?.ownerPhone;
  const alerts = collectAlerts(row);

  // Pointer-based swipe state — works for touch + mouse + pen. Positive dx
  // = swiping right (commits Present); negative dx = swiping left (commits
  // Absent). On release the card either snaps back or commits the mark.
  const [dragDx, setDragDx] = useState(0);
  const dragStartRef = useRef<{ x: number; pointerId: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Skip if the user starts on an interactive child — phone link, alert
    // button, attendance buttons. Otherwise we'd hijack their tap.
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, [data-no-swipe]")) return;
    dragStartRef.current = { x: e.clientX, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    if (dragStartRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragStartRef.current.x;
    // Clamp so the card can't fly off-screen.
    const clamped = Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
    setDragDx(clamped);
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    if (dragStartRef.current.pointerId !== e.pointerId) {
      dragStartRef.current = null;
      return;
    }
    const dx = dragDx;
    dragStartRef.current = null;
    setDragDx(0);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer might've already been released — safe to ignore.
    }
    if (dx >= SWIPE_COMMIT_PX) onMark("present");
    else if (dx <= -SWIPE_COMMIT_PX) onMark("absent");
  }

  const swipeProgress = Math.min(1, Math.abs(dragDx) / SWIPE_COMMIT_PX);

  return (
    <div className="relative isolate overflow-hidden rounded-xl">
      {/* Swipe-reveal backdrops — green on the left for "Present" (right
          swipe), red on the right for "Absent" (left swipe). Fade in as
          the gesture progresses. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center justify-start pl-4 text-emerald-700",
          dragDx > 0 ? "bg-emerald-100/80" : "bg-emerald-100/0",
        )}
        style={{ opacity: dragDx > 0 ? swipeProgress : 0 }}
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider">
          <Check className="size-4" />
          Present
        </span>
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end pr-4 text-red-700",
          dragDx < 0 ? "bg-red-100/80" : "bg-red-100/0",
        )}
        style={{ opacity: dragDx < 0 ? swipeProgress : 0 }}
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider">
          <X className="size-4" />
          Absent
        </span>
      </div>
    <Card
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        transform: dragDx !== 0 ? `translateX(${dragDx}px)` : undefined,
        // Snap-back animation runs only when we're not actively dragging.
        // `dragDx === 0` reliably means "released" because every pointer-up
        // resets it.
        transition: dragDx === 0 ? "transform 180ms ease" : "none",
        touchAction: "pan-y",
      }}
      className={cn(
        "relative z-10 flex select-none flex-col gap-3 border p-3 transition-colors",
        mark && STATUS_BORDER[mark.status],
      )}
    >
      <div className="flex items-start gap-3">
        {/* Photo */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          {row.petImageUrl ? (
            <Image
              src={row.petImageUrl}
              alt={row.petName}
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PawPrint className="text-muted-foreground size-5" />
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold leading-tight">
              {row.petName}
            </p>
            {isDropIn && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700"
                title="Guest from outside this series — single-session drop-in"
              >
                <Ticket className="size-2.5" />
                Drop-in
              </span>
            )}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {row.petBreed}
          </p>
          <p className="mt-1 truncate text-xs">
            <span className="text-muted-foreground">Owner: </span>
            <span className="font-medium">{row.ownerName}</span>
          </p>
          {ownerPhone && (
            <a
              href={`tel:${ownerPhone}`}
              className="text-muted-foreground hover:text-foreground mt-0.5 inline-flex items-center gap-1 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="size-3" />
              {ownerPhone}
            </a>
          )}
        </div>

        {/* Timestamp pill (after a mark) */}
        {mark && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              mark.status === "present" && "bg-emerald-100 text-emerald-700",
              mark.status === "absent" && "bg-red-100 text-red-700",
              mark.status === "late" && "bg-amber-100 text-amber-700",
            )}
            title={`Marked at ${new Date(mark.markedAtISO).toLocaleString()}`}
          >
            {mark.status} · {formatTimestamp(mark.markedAtISO)}
          </span>
        )}
      </div>

      {/* Attendance buttons */}
      <div data-no-swipe className="grid grid-cols-3 gap-2">
        <AttendanceButton
          status="present"
          active={mark?.status === "present"}
          onClick={() => onMark("present")}
          icon={Check}
          label="Present"
        />
        <AttendanceButton
          status="absent"
          active={mark?.status === "absent"}
          onClick={() => onMark("absent")}
          icon={X}
          label="Absent"
        />
        <AttendanceButton
          status="late"
          active={mark?.status === "late"}
          onClick={() => onMark("late")}
          icon={Clock3}
          label="Late"
        />
      </div>

      {/* Alerts — red box surfaces behavioral notes + care flags */}
      {alerts.length > 0 && (
        <div
          data-no-swipe
          className="rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
            <AlertTriangle className="size-3.5" />
            Heads-up
          </div>
          <ul className="mt-1 space-y-1 text-xs text-red-800 dark:text-red-200">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <a.Icon className="mt-0.5 size-3 shrink-0" />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
          {/* One-tap follow-up on the vaccine alert — message the owner for an
              updated certificate without leaving the session. Only for vaccine
              warnings, and only when the owner is set up in the Messaging
              module (and not blocked). */}
          {row.vaccineWarning.hasWarning &&
            enrollment &&
            hasMessagingProfile(enrollment.ownerId) &&
            !isClientBlocked(enrollment.ownerId) && (
              <RequestRecordsButton
                ownerName={enrollment.ownerName}
                ownerEmail={enrollment.ownerEmail || undefined}
                ownerPhone={enrollment.ownerPhone || undefined}
                petName={row.petName}
                vaccineName={row.vaccineWarning.soonestName}
                expired={
                  row.vaccineWarning.soonestDays !== null &&
                  row.vaccineWarning.soonestDays < 0
                }
              />
            )}
        </div>
      )}

      {/* Mobile hint — fades out after the first mark. Tapping the buttons
          above still works, but swiping is the faster gesture. */}
      {!mark && (
        <p
          aria-hidden
          className="text-muted-foreground -mb-1 text-center text-[10px] italic sm:hidden"
        >
          Swipe right for Present · left for Absent
        </p>
      )}
    </Card>
    </div>
  );
}

function AttendanceButton({
  status,
  active,
  onClick,
  icon: Icon,
  label,
}: {
  status: AttendanceMark["status"];
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const styles = STATUS_BTN_STYLES[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition-colors",
        active ? styles.active : styles.idle,
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

interface CardAlert {
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function collectAlerts(row: StudentBriefingRow): CardAlert[] {
  const alerts: CardAlert[] = [];

  // Vaccine warning — care flag.
  if (row.vaccineWarning.hasWarning) {
    const days = row.vaccineWarning.soonestDays;
    const name = row.vaccineWarning.soonestName ?? "Vaccine";
    if (days !== null && days < 0) {
      alerts.push({
        text: `${name} expired ${Math.abs(days)} day${
          Math.abs(days) === 1 ? "" : "s"
        } ago`,
        Icon: ShieldAlert,
      });
    } else if (days !== null) {
      alerts.push({
        text: `${name} expires in ${days} day${days === 1 ? "" : "s"}`,
        Icon: ShieldAlert,
      });
    } else {
      alerts.push({ text: `${name} — check status`, Icon: ShieldAlert });
    }
  }

  // No-show risk — care flag.
  if (row.consecutiveNoShows >= 2) {
    alerts.push({
      text: `${row.consecutiveNoShows} consecutive no-shows — confirm arrival`,
      Icon: AlertTriangle,
    });
  }

  // Behavioral / concern trainer notes — surface only the high-priority ones.
  for (const note of row.notes) {
    if (note.category === "concern" || note.category === "behavior") {
      alerts.push({
        text: `${note.category === "concern" ? "Concern" : "Behavior"}: ${
          note.note
        }`,
        Icon: AlertTriangle,
      });
    }
  }

  return alerts;
}
