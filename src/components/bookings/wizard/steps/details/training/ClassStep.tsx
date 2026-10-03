"use client";

import { Chip } from "@/components/ui/chip";
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
    <div className="flex max-w-[900px] flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <h3 className="text-body-ink text-[17px] font-semibold">
          {t("wizPickClass")}
        </h3>
        <p className="text-ink-tertiary text-[13.5px]">{subtitle}</p>
      </div>

      {classes.length === 0 && isPending ? (
        <div aria-hidden className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-line bg-card yy-skel h-[88px] rounded-[20px] border-[1.5px]"
            />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="border-line-strong text-ink-secondary rounded-[20px] border-[1.5px] border-dashed px-6 py-8 text-center text-[13.5px]">
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
                className="mk-pick bg-card focus-visible:outline-primary flex min-w-0 flex-wrap items-center gap-4 rounded-[20px] px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 data-[full=true]:cursor-not-allowed data-[full=true]:opacity-55"
              >
                <span
                  aria-hidden
                  className="text-body-ink flex size-14 shrink-0 flex-col items-center justify-center rounded-[16px] bg-(--tag-bg)"
                >
                  <span className="text-ink-tertiary text-[10.5px] font-bold uppercase">
                    {formatMonthShort(first.slice(0, 7), locale)}
                  </span>
                  <span className="text-[19px] font-bold tabular-nums">
                    {start.getDate()}
                  </span>
                </span>
                <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="text-body-ink text-[15.5px] font-semibold">
                    {c.name}
                  </span>
                  <span className="text-ink-tertiary text-[13px]">
                    {c.trainerName
                      ? fill(t("wizClassWith"), {
                          when,
                          trainer: shortPersonName(c.trainerName),
                        })
                      : when}
                  </span>
                </span>
                {full ? (
                  <Chip
                    tone="neutral"
                    size="md"
                    className="text-ink-tertiary px-3 py-[5px]"
                  >
                    {t("wizClassFull")}
                  </Chip>
                ) : tooFew ? (
                  <Chip
                    tone="neutral"
                    size="md"
                    className="text-ink-tertiary px-3 py-[5px]"
                  >
                    {fill(t("wizClassTooFew"), {
                      left: c.spotsLeft,
                      count: needed,
                    })}
                  </Chip>
                ) : (
                  <Chip
                    tone={c.spotsLeft <= 2 ? "warning" : "success"}
                    size="md"
                    className="px-3 py-[5px]"
                  >
                    {fill(t("wizSpotsLeft"), {
                      left: c.spotsLeft,
                      capacity: c.capacity,
                    })}
                  </Chip>
                )}
                {on ? (
                  <span
                    aria-hidden
                    className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] leading-none font-bold"
                  >
                    ✓
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
