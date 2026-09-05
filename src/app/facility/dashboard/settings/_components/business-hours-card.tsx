"use client";

import { useMemo } from "react";

import { useSettings } from "@/hooks/use-settings";
import { useAppLocale } from "@/hooks/use-app-locale";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { weekdayFormatter, weekdayName } from "@/lib/settings/weekday";

// ============================================================================
// THE WEEK, AS SOMETHING A STANDING PERSON CAN ACTUALLY TAP.
//
// ── WHY THE ROW BECAME A LABEL ────────────────────────────────────────────
//
// A Switch is 20px tall. §6 rule 7 wants 48 on phone and tablet, and the
// obvious fix — an invisible 48px hit area around the control — was measured
// before it was written: at 599px it overlapped the time inputs beside it on
// fourteen of this screen's twenty-two switches. A hidden target that steals
// taps from the field next to it is worse than a small one, because the small
// one at least fails visibly.
//
// So the target is the ROW, not an overlay on the control. `<label>` gives the
// day name, the switch and the whitespace between them one 48px hit area that
// cannot overlap anything, because it is a real box the layout already had to
// make room for. Tapping "Wednesday" opens or closes Wednesday.
//
// ── AND THE DAY NAMES WERE NEVER TRANSLATED ───────────────────────────────
//
// `<div className="capitalize">{day}</div>` over an object key. In English
// that renders "Monday" and looks finished; in French it renders "Monday",
// because there is no French anywhere near it. §5q: always Intl, never a
// string. The keys stay as they are — they are the settings shape — and only
// the rendering goes through the formatter, which also gets the casing right,
// since French weekday names are lowercase and CSS `capitalize` is not.
// ============================================================================

export function BusinessHoursCard() {
  const { hours, updateHours } = useSettings();
  const locale = useAppLocale();

  const weekday = useMemo(() => weekdayFormatter(locale), [locale]);
  const dayName = (day: string) => weekdayName(weekday, day);

  return (
    <SettingsBlock title="Business hours" data={hours} onSave={updateHours}>
      {(isEditing, localHours, setLocalHours) => (
        <div className="space-y-3">
          {Object.entries(localHours).map(
            ([day, schedule]: [
              string,
              { isOpen: boolean; openTime: string; closeTime: string },
            ]) => (
              <div
                key={day}
                className="rounded-lg border p-3 max-lg:space-y-2 lg:flex lg:items-center lg:gap-4"
              >
                {/* The 48px target. Below lg the row is not a flex
                    container, so this label is block-level and spans the whole
                    line; `justify-between` puts the switch at the far end and
                    everything between them is the same target. The lg width is
                    a floor and not a fixed one — "Wednesday" and "mercredi" do
                    not fit the same box (§5g). */}
                <label className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 lg:w-56">
                  <span className="text-body-ink text-[15px] font-semibold">
                    {dayName(day)}
                  </span>
                  <Switch
                    aria-label={dayName(day)}
                    checked={schedule.isOpen}
                    disabled={!isEditing}
                    onCheckedChange={(checked) =>
                      setLocalHours({
                        ...localHours,
                        [day]: { ...schedule, isOpen: checked },
                      })
                    }
                  />
                </label>

                {schedule.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${dayName(day)} — opening time`}
                      value={schedule.openTime}
                      onChange={(e) =>
                        setLocalHours({
                          ...localHours,
                          [day]: { ...schedule, openTime: e.target.value },
                        })
                      }
                      // `min-w`, not `w`: a native time field renders its own
                      // locale's shape — 24-hour in fr-CA, an AM/PM segment in
                      // en-CA — and the wider of the two decides the box.
                      // `bg-surface-inset` is §1's read-only ground; this was
                      // `bg-gray-100`, off the palette entirely.
                      className={
                        isEditing
                          ? "min-w-32"
                          : "bg-surface-inset min-w-32 cursor-not-allowed"
                      }
                      readOnly={!isEditing}
                    />
                    <span className="text-ink-tertiary text-[13.5px]">
                      &ndash;
                    </span>
                    <Input
                      type="time"
                      aria-label={`${dayName(day)} — closing time`}
                      value={schedule.closeTime}
                      onChange={(e) =>
                        setLocalHours({
                          ...localHours,
                          [day]: { ...schedule, closeTime: e.target.value },
                        })
                      }
                      className={
                        isEditing
                          ? "min-w-32"
                          : "bg-surface-inset min-w-32 cursor-not-allowed"
                      }
                      readOnly={!isEditing}
                    />
                  </div>
                ) : (
                  <Badge variant="secondary">Closed</Badge>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </SettingsBlock>
  );
}
