"use client";

import { Button } from "@/components/ui/button";
import {
  monthGrid,
  sameDay,
  type DayStatus,
} from "@/lib/bookings/wizard/calendar-month";
import { weekdayNames } from "@/lib/dates/calendar-names";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { cn } from "@/lib/utils";

// ============================================================================
// One month, as the client's mock draws it (2026-10-01): previous and next,
// the month, Clear; the week Sunday first; the days. A stay's two ends are
// solid primary with the nights between them on a band; daycare days are
// solid; today carries a ring; a day that cannot be picked says so — struck
// through with "Full" or "Closed" under it, or simply out of reach.
//
// One month at every width, not §5t's two: logged as a §5v exception (the
// times card sits beside it at 1024px and up, as the mock has it).
// ============================================================================

export interface CalendarSelection {
  /** Range mode: check-in and check-out. */
  start?: Date | null;
  end?: Date | null;
  /** Multi mode: every day picked. */
  days?: readonly Date[];
}

export function MonthCalendar({
  month,
  onMonth,
  canGoBack,
  selection,
  statusOf,
  onPick,
  onClear,
  showNights,
  blockedLabel,
}: {
  /** The first of the month shown. */
  month: Date;
  onMonth: (month: Date) => void;
  canGoBack: boolean;
  selection: CalendarSelection;
  statusOf: (day: Date) => DayStatus;
  onPick: (day: Date) => void;
  onClear: () => void;
  /** Boarding: draw the nights between check-in and check-out. */
  showNights: boolean;
  /** "Fully booked" or "Closed", for the legend. */
  blockedLabel: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const narrow = weekdayNames(locale, "narrow");
  const short = weekdayNames(locale, "short");
  const label = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    month: "long",
    year: "numeric",
  }).format(month);
  const today = new Date();
  const { start, end, days } = selection;

  return (
    <section
      aria-label={label}
      className="border-line bg-card rounded-[22px] border p-2.5 shadow-(--sh-card) sm:p-[18px]"
    >
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant="quiet"
          size="mock-icon-34"
          disabled={!canGoBack}
          aria-label={t("wizPreviousMonth")}
          onClick={() =>
            onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <span aria-hidden>‹</span>
        </Button>
        <Button
          type="button"
          variant="quiet"
          size="mock-icon-34"
          aria-label={t("wizNextMonth")}
          onClick={() =>
            onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <span aria-hidden>›</span>
        </Button>
        <p className="text-body-ink flex-1 pl-1.5 text-[16px] font-semibold capitalize">
          {label}
        </p>
        <Button
          type="button"
          variant="quiet"
          size="mock-30"
          className="border-line text-ink-secondary"
          onClick={onClear}
        >
          {t("wizClear")}
        </Button>
      </div>

      <div
        aria-hidden
        className="grid grid-cols-7 pt-1 pb-2 text-center text-[11.5px] font-semibold text-(--dow-ink) uppercase"
      >
        {short.map((name, index) => (
          <span key={index}>
            <span className="sm:hidden">{narrow[index]}</span>
            <span className="max-sm:hidden">{name.replace(".", "")}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {monthGrid(month).map((week, row) => (
          <div key={row} className="grid grid-cols-7">
            {week.map((day, col) => {
              if (!day) return <span key={col} />;
              const status = statusOf(day);
              const isStart = !!start && sameDay(day, start);
              const isEnd = !!end && sameDay(day, end);
              const picked =
                isStart || isEnd || (days ?? []).some((d) => sameDay(d, day));
              const night =
                showNights &&
                !!start &&
                !!end &&
                day > start &&
                day < end &&
                !isEnd;
              const banded =
                showNights && !!start && !!end && (night || isStart || isEnd);
              const struck =
                status === "full" ||
                status === "closed" ||
                status === "blocked" ||
                status === "holiday";
              const unavailable = status !== "open";
              const isToday = sameDay(day, today);
              return (
                <div
                  key={col}
                  className={cn(
                    "flex h-11 items-center justify-center sm:h-[50px]",
                    banded && "bg-acc-soft",
                    banded && isStart && "rounded-l-full",
                    banded && isEnd && "rounded-r-full",
                  )}
                >
                  <button
                    type="button"
                    disabled={unavailable && !picked}
                    aria-pressed={picked}
                    onClick={() => onPick(day)}
                    data-picked={picked || undefined}
                    data-today={(isToday && !picked) || undefined}
                    className={cn(
                      "text-body-ink focus-visible:outline-primary flex size-[38px] flex-col items-center justify-center rounded-full text-[14px] font-medium tabular-nums transition-[background-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none sm:size-11",
                      !unavailable && !picked && "hover:bg-surface-inset-2",
                      "data-[today=true]:shadow-[inset_0_0_0_1.5px_var(--primary)]",
                      "data-[picked=true]:bg-primary data-[picked=true]:text-primary-foreground data-[picked=true]:font-bold",
                      unavailable &&
                        !picked &&
                        "cursor-not-allowed text-(--day-off)",
                    )}
                  >
                    <span className={cn(struck && "line-through")}>
                      {day.getDate()}
                    </span>
                    {struck ? (
                      <span className="text-[9px] leading-none font-semibold text-(--warm-ink)">
                        {status === "full" ? t("wizFull") : t("wizClosed")}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-line-soft text-ink-tertiary mt-3 flex flex-wrap gap-4 border-t pt-3 text-[12px]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-primary size-3 rounded-full" />
          {t("wizLegendSelected")}
        </span>
        {showNights ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="bg-acc-soft h-2.5 w-4 rounded-[3px]" />
            {t("wizLegendNights")}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="font-semibold text-(--warm-ink) line-through"
          >
            12
          </span>
          {blockedLabel}
        </span>
      </div>
    </section>
  );
}
