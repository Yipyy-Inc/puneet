"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { weekdayNames } from "@/lib/dates/calendar-names";
import { usePricingLabels } from "@/lib/settings/use-pricing-labels";
import type { PeakRepeatPattern } from "@/types/boarding";

// ── The repeating half of a busy-date rule ───────────────────────────────
//
// "Friday and Saturday nights, every other week, between June and September."
// The pattern has been in `peakSurchargeSchema` since the parity pass and the
// editor never offered it, so a facility could not author one at all.
//
// Weekday names come from `weekdayNames(locale, …)` — Sunday first and
// index-addressed by `Date#getDay()`, which is the same 0-6 convention stored
// in `daysOfWeek` and read by `matchesRepeatPattern`. Both ends of that number
// mean the same day, and neither end hardcodes an English name (§5q).

const WEEK_INTERVALS = [1, 2, 3, 4] as const;

export function PeakRepeatFields({
  value,
  onChange,
}: {
  value: PeakRepeatPattern;
  onChange: (next: PeakRepeatPattern) => void;
}) {
  const { t, plural, locale } = usePricingLabels();
  const shortNames = weekdayNames(locale, "short");
  const longNames = weekdayNames(locale, "long");

  const toggleDay = (day: number) => {
    const selected = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter((each) => each !== day)
      : [...value.daysOfWeek, day].sort((a, b) => a - b);
    onChange({ ...value, daysOfWeek: selected });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("psDaysOfWeek")}</Label>
        <div className="flex flex-wrap gap-2">
          {shortNames.map((name, day) => {
            const on = value.daysOfWeek.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                aria-label={longNames[day]}
                onClick={() => toggleDay(day)}
                // Solid when chosen, never a tint (§6 rule 2), and a pill
                // because filters are pills (§1). 40px, 48 below lg (§6 rule 7).
                className={
                  on
                    ? "bg-primary text-primary-foreground min-h-10 rounded-full px-4 text-sm font-semibold transition-colors max-lg:min-h-12"
                    : "bg-card border-line text-body hover:border-line-strong min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors max-lg:min-h-12"
                }
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("psEveryXWeeks")}</Label>
        <Select
          value={String(value.everyXWeeks)}
          onValueChange={(next) =>
            onChange({ ...value, everyXWeeks: Number(next) })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_INTERVALS.map((weeks) => (
              <SelectItem key={weeks} value={String(weeks)}>
                {plural(weeks, "psEveryWeekOne", "psEveryWeekOther")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value.everyXWeeks > 1 ? (
          <p className="text-meta text-ink-tertiary">
            {t("psEveryXWeeksHelp")}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("psRepeatFrom")}</Label>
          <Input
            type="date"
            value={value.windowStart}
            onChange={(event) =>
              onChange({ ...value, windowStart: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t("psRepeatUntil")}</Label>
          <Input
            type="date"
            value={value.windowEnd}
            onChange={(event) =>
              onChange({ ...value, windowEnd: event.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
