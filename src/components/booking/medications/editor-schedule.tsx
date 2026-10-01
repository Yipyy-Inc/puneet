"use client";

import { Plus, X } from "lucide-react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Segmented } from "@/components/ui/segmented";
import {
  formatCalendarDayLong,
  formatDayRange,
  formatTimeOfDay,
  formatWeekday,
} from "@/lib/i18n/format";
import {
  dayCount,
  doseCountWords,
  slotLabel,
} from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import {
  draftDays,
  draftTimes,
  offeredDayRules,
} from "@/lib/medications/draft";
import { hasCheckoutDay } from "@/lib/medications/schedule";
import { CUSTOM_TIME_DEFAULT } from "@/lib/medications/vocabulary";
import { offeredSlots } from "@/lib/settings/medication-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { MedDayRule } from "@/types/base";

import { EditorSection, FieldLabel } from "./editor-section";
import { OptionCards } from "./option-cards";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// SCHEDULE: which days of the stay, at which times, with food or not.
// ============================================================================

const SELECTED_RING =
  "shadow-[inset_0_0_0_2px_var(--primary)] text-primary-hover";

/** 0 = Sunday, read from the calendar day itself, in UTC. */
function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function EditorSchedule({ step }: { step: MedicationStepState }) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const draft = step.editor!.draft;
  const { settings, stay } = step;
  const overnight = hasCheckoutDay(stay);

  const offered = offeredDayRules(settings, stay);
  const rules: MedDayRule[] = offered.includes(draft.dayRule)
    ? offered
    : [...offered, draft.dayRule];
  const rangeOf = (days: string[]) =>
    days.length === 0
      ? ""
      : fill(t("medsDaysRangeSub"), {
          range: formatDayRange(days[0], days[days.length - 1], locale),
          days: dayCount(t, days.length, locale),
        });
  const ruleCard = (rule: MedDayRule) => {
    if (rule === "except_checkout") {
      return {
        value: rule,
        title: t("medsDaysExceptCheckout"),
        hint: rangeOf(stay.days.slice(0, -1)),
      };
    }
    if (rule === "every_day") {
      return {
        value: rule,
        title: t(overnight ? "medsDaysEveryDay" : "medsDaysEveryBooked"),
        hint: rangeOf(stay.days),
      };
    }
    return {
      value: rule,
      title: t("medsDaysCertain"),
      hint: t("medsDaysCertainSub"),
    };
  };

  const slots = offeredSlots(settings);
  const times = draftTimes(draft, settings);
  const days = draftDays(draft, stay);
  const frequency =
    times.length === 0
      ? t("medsPickTime")
      : fill(t("medsFrequency"), {
          count: times.length,
          doses: doseCountWords(t, times.length * days.length, locale),
          days: dayCount(t, days.length, locale),
        });

  return (
    <EditorSection label={t("medsSectionSchedule")}>
      <div className="flex min-w-0 flex-col gap-2.5">
        <FieldLabel id="meds-days-label">{t("medsWhichDays")}</FieldLabel>
        <OptionCards
          label={t("medsWhichDays")}
          value={draft.dayRule}
          options={rules.map(ruleCard)}
          onChange={(dayRule) => step.update({ dayRule })}
        />
        {draft.dayRule === "certain_dates" ? (
          <div
            role="group"
            aria-labelledby="meds-days-label"
            className="flex flex-wrap gap-2 pt-1"
          >
            {stay.days.map((day) => (
              <ChoicePill
                key={day}
                type="checkbox"
                value={day}
                aria-label={formatCalendarDayLong(day, locale)}
                checked={draft.certainDays.includes(day)}
                onChange={() =>
                  step.update((current) => ({
                    certainDays: current.certainDays.includes(day)
                      ? current.certainDays.filter((d) => d !== day)
                      : [...current.certainDays, day].sort(),
                  }))
                }
                className="h-auto min-h-15 w-16 flex-col justify-center gap-0 rounded-xs px-0"
              >
                <span className="text-micro uppercase">
                  {formatWeekday(weekdayOf(day), locale)}
                </span>
                <span className="text-section tabular-nums">
                  {Number(day.slice(8))}
                </span>
              </ChoicePill>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <FieldLabel
          id="meds-times-label"
          aside={
            <span className="text-meta text-ink-tertiary" aria-live="polite">
              {frequency}
            </span>
          }
        >
          {t("medsGiveAt")}
        </FieldLabel>
        <div
          role="group"
          aria-labelledby="meds-times-label"
          className="flex flex-wrap gap-2"
        >
          {slots.map((slot) => (
            <ChoicePill
              key={slot.id}
              type="checkbox"
              value={slot.id}
              checked={draft.slots.includes(slot.id)}
              onChange={() =>
                step.update((current) => ({
                  slots: current.slots.includes(slot.id)
                    ? current.slots.filter((id) => id !== slot.id)
                    : [...current.slots, slot.id],
                }))
              }
            >
              <span>{slotLabel(t, slot.id)}</span>
              <span className="text-meta text-ink-tertiary font-normal tabular-nums">
                {formatTimeOfDay(slot.time, locale)}
              </span>
            </ChoicePill>
          ))}
          {draft.custom.map((value, index) => (
            <span
              key={index}
              className={`${SELECTED_RING} bg-card flex min-h-10 items-center gap-1 rounded-full pr-1 pl-3 max-lg:min-h-12`}
            >
              <input
                type="time"
                aria-label={t("medsCustomTimeLabel")}
                value={value}
                onChange={(event) =>
                  step.update((current) => ({
                    custom: current.custom.map((time, i) =>
                      i === index ? event.target.value : time,
                    ),
                  }))
                }
                className="focus-visible:outline-primary text-body bg-transparent font-semibold tabular-nums focus-visible:outline-2"
              />
              <button
                type="button"
                aria-label={fill(t("medsRemoveTime"), {
                  time: formatTimeOfDay(value, locale),
                })}
                onClick={() =>
                  step.update((current) => ({
                    custom: current.custom.filter((_, i) => i !== index),
                  }))
                }
                className="hover:bg-surface-inset focus-visible:outline-primary flex size-8 items-center justify-center rounded-full focus-visible:outline-2 max-lg:size-10"
              >
                <X className="size-4" aria-hidden />
              </button>
            </span>
          ))}
          {settings.customTimes ? (
            <button
              type="button"
              onClick={() =>
                step.update((current) => ({
                  custom: [...current.custom, CUSTOM_TIME_DEFAULT],
                }))
              }
              className="border-line-strong text-ink-secondary hover:bg-surface-inset focus-visible:outline-primary text-body flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-dashed px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 max-lg:min-h-12"
            >
              <Plus className="size-4" aria-hidden />
              {t("medsAddCustomTime")}
            </button>
          ) : null}
        </div>
      </div>

      {settings.show.food ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel>{t("medsWithFood")}</FieldLabel>
          <Segmented
            name="meds-food"
            label={t("medsWithFood")}
            value={draft.food}
            options={[
              { value: "with", label: t("medsFoodWith") },
              { value: "empty", label: t("medsFoodEmpty") },
              { value: "either", label: t("medsFoodEither") },
            ]}
            onChange={(food) => step.update({ food })}
            className="self-start"
          />
        </div>
      ) : null}
    </EditorSection>
  );
}
