"use client";

import { Check, CircleCheck, Clock, CircleSlash } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMonthShort, isPluralOne } from "@/lib/i18n/format";
import { shortPersonName } from "@/lib/bookings/wizard/staff-slots";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import {
  classSessionDates,
  classWhen,
  type OfferedClass,
} from "@/lib/training/offered-classes";

// ============================================================================
// Training's "Trainer & time" for a group program (the client's mock,
// 2026-10-01): "Pick a class" — the program's classes still to come:
//
//   OCT   Puppy Foundations                              2 of 6 spots left
//    3    Saturdays · 10:00 AM · with Alex M.
//   OCT   Adult Obedience                               Full · waitlist only
//    6    Tuesdays · 6:30 PM · with Alex M.
//
// The places left count every dog enrolled (`offered_training_classes`); a
// full class cannot be picked — its waitlist is on the class itself — and
// neither can one with fewer places than the dogs being booked.
// ============================================================================

export function ClassStep({
  classes,
  isPending,
  value,
  onChange,
  weeks,
  maxDogs,
  needed = 1,
}: {
  classes: readonly OfferedClass[];
  isPending: boolean;
  value: string | null;
  onChange: (classId: string) => void;
  /** The dogs being booked: each takes a place. */
  needed?: number;
  /** The program's length and class size, for the line under the heading. */
  weeks?: number;
  maxDogs?: number;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();

  const subtitle =
    weeks && maxDogs
      ? fill(t("wizClassesRunFor"), {
          weeks: fill(
            t(isPluralOne(weeks, locale) ? "wizWeeksOne" : "wizWeeksOther"),
            { count: weeks },
          ),
          max: maxDogs,
        })
      : t("wizClassesRunWeekly");

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-section text-body-ink">{t("wizPickClass")}</h3>
        <p className="text-meta text-ink-tertiary">{subtitle}</p>
      </div>

      {classes.length === 0 && isPending ? (
        <div aria-hidden className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-line bg-card yy-skel h-[84px] rounded-2xl border"
            />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="border-line-strong text-meta text-ink-secondary rounded-2xl border border-dashed px-6 py-8 text-center">
          {t("wizNoClasses")}
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label={t("wizPickClass")}
          className="flex flex-col gap-2.5"
        >
          {classes.map((c) => {
            const full = c.spotsLeft <= 0;
            const tooFew = !full && c.spotsLeft < needed;
            const blocked = full || tooFew;
            const on = value === c.id;
            // The first session the dogs would attend: the class's start, or
            // its next session when it is already running.
            const first = classSessionDates(c)[0] ?? c.startDate;
            const start = new Date(`${first}T12:00:00`);
            const when = classWhen(c, t, locale);
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={blocked || undefined}
                data-on={on}
                data-full={blocked || undefined}
                onClick={() => !blocked && onChange(c.id)}
                className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary data-[full=true]:bg-surface-inset data-[full=true]:hover:border-line-strong flex min-w-0 flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[full=true]:cursor-not-allowed data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
              >
                <span
                  aria-hidden
                  className="bg-surface-inset text-body-ink flex size-14 shrink-0 flex-col items-center justify-center rounded-xs"
                >
                  <span className="text-micro text-ink-tertiary uppercase">
                    {formatMonthShort(first.slice(0, 7), locale)}
                  </span>
                  <span className="text-section tabular-nums">
                    {start.getDate()}
                  </span>
                </span>
                <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                  <span className="text-body-strong text-body-ink">
                    {c.name}
                  </span>
                  <span className="text-meta text-ink-tertiary">
                    {c.trainerName
                      ? fill(t("wizClassWith"), {
                          when,
                          trainer: shortPersonName(c.trainerName),
                        })
                      : when}
                  </span>
                </span>
                {full ? (
                  <Badge variant="cancelled">
                    <CircleSlash aria-hidden />
                    {t("wizClassFull")}
                  </Badge>
                ) : tooFew ? (
                  <Badge variant="cancelled">
                    <CircleSlash aria-hidden />
                    {fill(t("wizClassTooFew"), {
                      left: c.spotsLeft,
                      count: needed,
                    })}
                  </Badge>
                ) : (
                  <Badge variant={c.spotsLeft <= 2 ? "pending" : "confirmed"}>
                    {c.spotsLeft <= 2 ? (
                      <Clock aria-hidden />
                    ) : (
                      <CircleCheck aria-hidden />
                    )}
                    {fill(t("wizSpotsLeft"), {
                      left: c.spotsLeft,
                      capacity: c.capacity,
                    })}
                  </Badge>
                )}
                {on ? (
                  <span
                    aria-hidden
                    className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full"
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
