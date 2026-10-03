"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// A stay's days, as the mock draws them: a 64px chip each — "Day 3" over its
// date and a dot saying how much of it is logged (green all of it, amber part
// of it, none for a day still ahead); the chosen one in the accent's pale
// blue. They scroll sideways rather than wrap past a week.
// ============================================================================

export function DayChips({
  days,
  selected,
  today,
  onPick,
  status,
  label,
}: {
  days: string[];
  selected: string;
  today: string;
  onPick: (day: string) => void;
  status: (day: string) => "full" | "partial" | "ahead";
  label: (day: string, index: number) => { top: string; date: string };
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {days.map((day, i) => {
        const on = day === selected;
        const said = label(day, i);
        const state = status(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-current={day === today ? "date" : undefined}
            onClick={() => onPick(day)}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-[12px] py-2",
              on
                ? "border-primary text-acc-soft-text border-[1.5px] bg-(--acc-pale)"
                : "border-line-strong bg-card text-body-ink border",
            )}
          >
            <span
              className={cn(
                "text-[11px]",
                on ? "text-(--bd-faded-on)" : "text-(--bd-faded)",
              )}
            >
              {said.top}
            </span>
            <span className="text-[14px] font-semibold">{said.date}</span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                state === "full" && "bg-success",
                state === "partial" && "bg-(--bd-partial)",
                state === "ahead" && "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
