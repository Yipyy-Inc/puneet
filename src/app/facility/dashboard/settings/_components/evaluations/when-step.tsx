"use client";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { formatDecimal, formatWeekday, isPluralOne } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";
import {
  SESSION_LENGTHS,
  WEEKDAY_NAMES,
  offerModeOf,
  sessionMinutesOf,
} from "@/lib/evaluations/schedule";

import { StartTimesEditor, TimeWindowsEditor } from "./schedule-editors";
import { FieldLabel, StepCard, UnitField } from "./step-card";
import type { EvaluationSetup } from "./use-evaluation-setup";

// ============================================================================
// STEP 2 — "When" (the client's mock), in the mock's order:
//
//   Days you offer evaluations      Mon Tue Wed Thu Fri Sat Sun   (not "any")
//   Evaluations can start between   [08:00] and [18:00]           (any)
//   Drop-off window                 [08:00] and [10:30]           (days)
//   Time windows / Start times                                    (window · slots)
//   Session length                  30 min · 45 min · 1 hour · 1.5 hours …
//   Pets at the same time · Buffer · Minimum notice · Book up to · Price
// ============================================================================

/** Monday first, as the mock lists them; 0 = Sunday. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function sessionLengthLabel(
  minutes: number,
  t: (key: string) => string,
  locale: AppLocale,
): string {
  if (minutes < 60) return fill(t("lengthMinutes"), { n: minutes });
  const hours = minutes / 60;
  return fill(
    t(isPluralOne(hours, locale) ? "lengthHourOne" : "lengthHourOther"),
    {
      n: formatDecimal(hours, locale),
    },
  );
}

export function WhenStep({
  setup,
  t,
  locale,
}: {
  setup: EvaluationSetup;
  t: (key: string) => string;
  locale: AppLocale;
}) {
  const config = setup.draft.config;
  const schedule = config.schedule;
  const mode = offerModeOf(config);
  const days = new Set(
    (schedule.allowedDays ?? []).map((name) =>
      WEEKDAY_NAMES.indexOf(name.toLowerCase() as never),
    ),
  );
  const length = sessionMinutesOf(config);
  const lengths = SESSION_LENGTHS.includes(length as never)
    ? [...SESSION_LENGTHS]
    : [...SESSION_LENGTHS, length].sort((a, b) => a - b);
  const range = schedule.openRange ?? { start: "08:00", end: "18:00" };

  return (
    <StepCard id="ev-when" step={t("step2")} title={t("whenTitle")}>
      {mode !== "any" ? (
        <div className="flex min-w-0 flex-col gap-2">
          <FieldLabel id="ev-days-label">{t("daysOffered")}</FieldLabel>
          <div
            role="group"
            aria-labelledby="ev-days-label"
            className="flex min-w-0 flex-wrap gap-1.5"
          >
            {WEEK.map((day) => (
              <ChoicePill
                key={day}
                type="checkbox"
                checked={days.has(day)}
                onChange={() => {
                  const next = new Set(days);
                  if (next.has(day)) next.delete(day);
                  else next.add(day);
                  setup.setSchedule({
                    allowedDays: WEEK.filter((d) => next.has(d)).map(
                      (d) => WEEKDAY_NAMES[d]!,
                    ),
                  });
                }}
                aria-label={formatWeekday(day, locale, "long")}
                tone="ink"
                size="day"
              >
                {formatWeekday(day, locale, "short")}
              </ChoicePill>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "any" || mode === "days" ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <FieldLabel>
            {t(mode === "days" ? "dropOffWindow" : "startBetween")}
          </FieldLabel>
          <Input
            type="time"
            aria-label={t(mode === "days" ? "dropOffFrom" : "startFrom")}
            value={range.start}
            onChange={(event) =>
              setup.setSchedule({
                openRange: { ...range, start: event.target.value },
              })
            }
            className="h-10 w-[130px] rounded-[12px] px-2.5 text-[14px] tabular-nums max-lg:h-10"
          />
          <span className="text-[13.5px]">{t("and")}</span>
          <Input
            type="time"
            aria-label={t(mode === "days" ? "dropOffTo" : "startTo")}
            value={range.end}
            onChange={(event) =>
              setup.setSchedule({
                openRange: { ...range, end: event.target.value },
              })
            }
            className="h-10 w-[130px] rounded-[12px] px-2.5 text-[14px] tabular-nums max-lg:h-10"
          />
        </div>
      ) : null}

      {mode === "window" ? (
        <TimeWindowsEditor
          schedule={schedule}
          onChange={(timeWindows) => setup.setSchedule({ timeWindows })}
          t={t}
        />
      ) : null}

      {mode === "slots" ? (
        <StartTimesEditor
          schedule={schedule}
          onChange={(fixedStartTimes) => setup.setSchedule({ fixedStartTimes })}
          t={t}
          locale={locale}
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-2">
        <FieldLabel id="ev-length-label">{t("sessionLength")}</FieldLabel>
        <div
          role="radiogroup"
          aria-labelledby="ev-length-label"
          className="flex min-w-0 flex-wrap gap-1.5"
        >
          {lengths.map((minutes) => (
            <ChoicePill
              key={minutes}
              type="radio"
              name="evaluation-length"
              value={String(minutes)}
              checked={minutes === length}
              tone="ink"
              size="md"
              onChange={() =>
                setup.setSchedule((current) => ({
                  defaultDurationMinutes: minutes,
                  durationOptionsMinutes:
                    current.durationOptionsMinutes.includes(minutes)
                      ? current.durationOptionsMinutes
                      : [...current.durationOptionsMinutes, minutes].sort(
                          (a, b) => a - b,
                        ),
                }))
              }
            >
              {sessionLengthLabel(minutes, t, locale)}
            </ChoicePill>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-2.5">
        <UnitField
          id="ev-capacity"
          label={t("petsAtOnce")}
          unit={t("unitPets")}
          min={1}
          value={schedule.capacityPerSlot ?? 1}
          onChange={(capacityPerSlot) =>
            setup.setSchedule({ capacityPerSlot: Math.floor(capacityPerSlot) })
          }
        />
        <UnitField
          id="ev-buffer"
          label={t("bufferBetween")}
          unit={t("unitMinutes")}
          value={schedule.bufferMinutes ?? 0}
          onChange={(bufferMinutes) => setup.setSchedule({ bufferMinutes })}
        />
        <UnitField
          id="ev-notice"
          label={t("minimumNotice")}
          unit={t("unitHours")}
          value={config.minLeadTimeHours ?? 0}
          onChange={(minLeadTimeHours) => setup.setConfig({ minLeadTimeHours })}
        />
        <UnitField
          id="ev-ahead"
          label={t("bookUpTo")}
          unit={t("unitDaysAhead")}
          value={config.maxAdvanceDays ?? 0}
          onChange={(maxAdvanceDays) => setup.setConfig({ maxAdvanceDays })}
        />
        <UnitField
          id="ev-price"
          label={t("price")}
          unit={t("unitPerPet")}
          step={0.01}
          value={config.price}
          onChange={(price) => setup.setConfig({ price })}
        />
      </div>
    </StepCard>
  );
}
