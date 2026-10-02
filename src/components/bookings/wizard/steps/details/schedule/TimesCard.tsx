"use client";

import type { ReactNode } from "react";
import { Clock } from "lucide-react";

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
    <section className="border-line bg-card shadow-card flex flex-col gap-[18px] rounded-2xl border p-5">
      {top}
      {empty ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span
            aria-hidden
            className="border-line-strong text-ink-tertiary flex size-11 items-center justify-center rounded-full border-2"
          >
            <Clock className="size-5" />
          </span>
          <p className="text-body-strong text-body-ink">{empty.title}</p>
          <p className="text-meta text-ink-tertiary max-w-[280px] text-pretty">
            {empty.text}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          <div className="border-line flex items-end justify-between gap-3 border-b pb-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-micro text-ink-tertiary uppercase">
                {kicker}
              </span>
              <span className="text-body-strong text-body-ink">{range}</span>
            </div>
            <span className="text-heading text-[26px]/[1.15] font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums">
              {count}
            </span>
          </div>
          {children}
          {note ? (
            <p className="bg-surface-inset text-meta text-ink-secondary rounded-xl px-3 py-2.5 text-pretty">
              {note}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
