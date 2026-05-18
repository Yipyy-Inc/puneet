"use client";

import { cn } from "@/lib/utils";
import type {
  TrainingClass,
  TrainingSession,
} from "@/types/training";
import {
  DAY_ABBR,
  formatISODate,
  getMonthDays,
  timeToMinutes,
} from "./training-calendar-utils";

const MAX_DOTS = 12;

interface Props {
  selectedDate: string;
  today: string;
  sessions: TrainingSession[];
  classesById: Record<string, TrainingClass | undefined>;
  onDayClick: (dateStr: string) => void;
}

export function TrainingCalendarMonthView({
  selectedDate,
  today,
  sessions,
  classesById,
  onDayClick,
}: Props) {
  const cells = getMonthDays(selectedDate);
  const ref = new Date(selectedDate + "T00:00:00");
  const refMonth = ref.getMonth();

  return (
    <div className="bg-card flex-1 overflow-auto rounded-xl border shadow-sm">
      <div className="grid grid-cols-7 border-b">
        {DAY_ABBR.map((d) => (
          <div
            key={d}
            className="text-muted-foreground px-3 py-2 text-center text-[11px] font-semibold uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={idx}
                className="min-h-[110px] border-b border-r bg-slate-50/40"
              />
            );
          }
          const ds = formatISODate(cell);
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const inMonth = cell.getMonth() === refMonth;
          const daySessions = sessions
            .filter((s) => s.date === ds && s.status !== "cancelled")
            .sort(
              (a, b) =>
                timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
            );
          const groupCount = daySessions.filter(
            (s) => classesById[s.classId]?.classType !== "private",
          ).length;
          const privateCount = daySessions.length - groupCount;
          const visibleDots = daySessions.slice(0, MAX_DOTS);
          const overflow = daySessions.length - visibleDots.length;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDayClick(ds)}
              className={cn(
                "hover:bg-muted/40 flex min-h-[110px] flex-col gap-1 border-b border-r p-2 text-left transition-colors",
                !inMonth && "text-muted-foreground/50",
                isSelected && "bg-indigo-50/60 dark:bg-indigo-950/20",
              )}
              title={
                daySessions.length > 0
                  ? `${daySessions.length} session${daySessions.length === 1 ? "" : "s"} — ${groupCount} group · ${privateCount} private`
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                    isToday
                      ? "bg-indigo-500 text-white"
                      : isSelected
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "",
                  )}
                >
                  {cell.getDate()}
                </span>
                {daySessions.length > 0 && (
                  <span className="text-muted-foreground text-[10px] font-semibold tabular-nums">
                    {daySessions.length}
                  </span>
                )}
              </div>
              {daySessions.length > 0 && (
                <div className="mt-auto flex flex-wrap items-center gap-1">
                  {visibleDots.map((sess) => {
                    const isPrivate =
                      classesById[sess.classId]?.classType === "private";
                    return (
                      <span
                        key={sess.id}
                        className={cn(
                          "size-1.5 shrink-0 rounded-full shadow-sm",
                          isPrivate ? "bg-orange-500" : "bg-indigo-500",
                        )}
                        title={`${sess.startTime} · ${sess.className} (${isPrivate ? "private" : "group"})`}
                      />
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-muted-foreground ml-0.5 text-[9px] font-semibold tabular-nums">
                      +{overflow}
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
