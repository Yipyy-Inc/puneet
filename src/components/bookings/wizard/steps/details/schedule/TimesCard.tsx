"use client";

import type { ReactNode } from "react";
// ============================================================================
// The card beside the calendar (the client's mock, 2026-10-01). Until the
// dates are picked it says what will appear; then the stay or the days in a
// line with their count, the drop-off and pick-up times, and a note on where
// the times come from. Daycare puts the day type above it all.
// ============================================================================

export function TimesCard({
  top,
  empty,
  kicker,
  range,
  count,
  children,
  note,
}: {
  /** Daycare: the day type, shown whether or not days are picked. */
  top?: ReactNode;
  /** Shown until the dates are picked; null once they are. */
  empty: { title: string; text: string } | null;
  kicker: string;
  range: string;
  count: string;
  /** The two time pickers. */
  children?: ReactNode;
  note: string;
}) {
  return (
    <section className="border-line bg-card flex flex-col gap-[18px] rounded-[22px] border p-5 shadow-(--sh-card)">
      {top}
      {empty ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span
            aria-hidden
            className="text-ink-disabled flex size-11 items-center justify-center rounded-full border-2 border-(--empty-ring) text-[18px]"
          >
            ◷
          </span>
          <p className="text-body-ink text-[14.5px] font-semibold">
            {empty.title}
          </p>
          <p className="text-ink-tertiary max-w-[280px] text-[13px] text-pretty">
            {empty.text}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          <div className="border-line-soft flex items-end justify-between gap-3 border-b pb-4">
            <div className="flex min-w-0 flex-col gap-[3px]">
              <span className="text-ink-tertiary text-[11.5px] font-semibold tracking-[0.07em] uppercase">
                {kicker}
              </span>
              <span className="text-body-ink text-[15.5px] font-semibold">
                {range}
              </span>
            </div>
            <span className="text-heading text-[26px] font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums">
              {count}
            </span>
          </div>
          {children}
          {note ? (
            <p className="text-ink-tertiary rounded-[12px] bg-(--row-hover) px-3 py-2.5 text-[12px] text-pretty">
              {note}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
