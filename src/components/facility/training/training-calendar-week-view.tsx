"use client";

import { cn } from "@/lib/utils";
import type {
  TrainingClass,
  TrainingSession,
} from "@/types/training";
import {
  DAY_ABBR,
  STATUS_META,
  formatISODate,
  getWeekDays,
  timeToMinutes,
} from "./training-calendar-utils";

interface Props {
  selectedDate: string;
  today: string;
  sessions: TrainingSession[];
  classesById: Record<string, TrainingClass | undefined>;
  onDayClick: (dateStr: string) => void;
}

// Density tiers — calibrated to the bookings volume a single facility's
// training schedule typically sees in a day. Tweak thresholds without touching
// the call sites.
function densityTier(count: number): {
  label: string;
  cls: string;
} | null {
  if (count <= 0) return null;
  if (count <= 2)
    return {
      label: "Light",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    };
  if (count <= 4)
    return {
      label: "Moderate",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    };
  return {
    label: "Heavy",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  };
}

export function TrainingCalendarWeekView({
  selectedDate,
  today,
  sessions,
  classesById,
  onDayClick,
}: Props) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="bg-card flex-1 overflow-auto rounded-xl border shadow-sm">
      <div className="grid grid-cols-7 divide-x">
        {weekDays.map((day, idx) => {
          const ds = formatISODate(day);
          const daySessions = sessions
            .filter((s) => s.date === ds && s.status !== "cancelled")
            .sort(
              (a, b) =>
                timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
            );
          const isToday = ds === today;
          const isSelected = ds === selectedDate;

          return (
            <button
              key={ds}
              type="button"
              onClick={() => onDayClick(ds)}
              className={cn(
                "hover:bg-muted/50 flex min-h-[180px] flex-col gap-1.5 p-3 text-left transition-colors",
                isSelected && "bg-indigo-50/60 dark:bg-indigo-950/20",
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px] font-medium uppercase">
                    {DAY_ABBR[idx]}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      isToday
                        ? "bg-indigo-500 text-white"
                        : isSelected
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                {(() => {
                  const tier = densityTier(daySessions.length);
                  if (!tier) return null;
                  return (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        tier.cls,
                      )}
                      title={`${daySessions.length} session${daySessions.length === 1 ? "" : "s"} — ${tier.label.toLowerCase()} day`}
                    >
                      <span className="tabular-nums">
                        {daySessions.length}
                      </span>
                      {tier.label}
                    </span>
                  );
                })()}
              </div>
              {daySessions.length === 0 ? (
                <span className="text-muted-foreground/50 mt-1 text-[10px]">
                  No sessions
                </span>
              ) : (
                <div className="flex flex-col gap-1">
                  {daySessions.slice(0, 5).map((sess) => {
                    const cls = classesById[sess.classId];
                    const isPrivate = cls?.classType === "private";
                    const s = STATUS_META[sess.status];
                    return (
                      <div
                        key={sess.id}
                        className={cn(
                          "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                          s.bg,
                          s.text,
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            isPrivate ? "bg-orange-500" : "bg-indigo-500",
                          )}
                          title={isPrivate ? "Private 1-on-1" : "Group class"}
                        />
                        <span className="truncate">
                          {sess.startTime} {sess.className}
                        </span>
                      </div>
                    );
                  })}
                  {daySessions.length > 5 && (
                    <span className="text-muted-foreground text-[10px]">
                      +{daySessions.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
