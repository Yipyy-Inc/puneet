"use client";

import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import { OptionCards } from "@/components/booking/care/option-cards";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Segmented } from "@/components/ui/segmented";
import {
  habitLabel,
  optionLabel,
  optionValue,
  skipLabel,
  styleLabel,
  treatsLabel,
} from "@/lib/feeding/labels";
import { TREATS } from "@/lib/feeding/vocabulary";
import { fill, type Translate } from "@/lib/medications/dose";
import {
  offeredOptions,
  type FeedingInstructions,
} from "@/lib/settings/feeding-instructions";
import { useShellText } from "@/lib/shell/use-shell-text";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// HOW IT EATS: the feeding style, eating habits, what to do when a meal is
// skipped, and treats. The quick picks are the facility's — the vocabulary's
// it left on, and its own (Settings › Feeding & medications).
// ============================================================================

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

interface Choice {
  value: string;
  label: string;
}

/**
 * A list's pills: what the facility offers, then anything this plan already
 * picked that it no longer offers — still shown, so it can be taken off.
 */
function choicesFor(
  t: Translate,
  settings: FeedingInstructions,
  list: "styles" | "habits" | "skip",
  picked: readonly string[],
  label: (t: Translate, value: string) => string,
): Choice[] {
  const offered = offeredOptions(settings, list).map((row) => ({
    value: optionValue(list, row),
    label: optionLabel(t, list, row),
  }));
  const kept = picked
    .filter((value) => value && !offered.some((o) => o.value === value))
    .map((value) => ({ value, label: label(t, value) }));
  return [...offered, ...kept];
}

export function PlanHowEats({
  step,
  petName,
}: {
  step: FeedingStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const plan = step.plan!;
  const { settings } = step;
  const styles = choicesFor(t, settings, "styles", plan.styles, styleLabel);
  const habits = choicesFor(t, settings, "habits", plan.habits, habitLabel);
  const skips = choicesFor(t, settings, "skip", [plan.skip], skipLabel);
  const treats = settings.show.treats;
  if (
    styles.length === 0 &&
    habits.length === 0 &&
    skips.length === 0 &&
    !treats
  ) {
    return null;
  }

  return (
    <EditorSection label={fill(t("feedSectionHow"), { pet: petName })}>
      {styles.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel id="feed-styles-label">{t("feedStyleLabel")}</FieldLabel>
          <div
            role="group"
            aria-labelledby="feed-styles-label"
            className="flex flex-wrap gap-2"
          >
            {styles.map((style) => (
              <ChoicePill
                key={style.value}
                type="checkbox"
                value={style.value}
                checked={plan.styles.includes(style.value)}
                onChange={() =>
                  step.update((current) => ({
                    styles: toggled(current.styles, style.value),
                  }))
                }
              >
                {style.label}
              </ChoicePill>
            ))}
          </div>
        </div>
      ) : null}

      {habits.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel id="feed-habits-label">{t("feedHabitsLabel")}</FieldLabel>
          <div
            role="group"
            aria-labelledby="feed-habits-label"
            className="flex flex-wrap gap-2"
          >
            {habits.map((habit) => (
              <ChoicePill
                key={habit.value}
                type="checkbox"
                value={habit.value}
                checked={plan.habits.includes(habit.value)}
                onChange={() =>
                  step.update((current) => ({
                    habits: toggled(current.habits, habit.value),
                  }))
                }
              >
                {habit.label}
              </ChoicePill>
            ))}
          </div>
        </div>
      ) : null}

      {skips.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel>{fill(t("feedSkipLabel"), { pet: petName })}</FieldLabel>
          <OptionCards
            label={fill(t("feedSkipLabel"), { pet: petName })}
            value={plan.skip}
            columns="sm:grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]"
            options={skips.map((skip) => ({
              value: skip.value,
              title: skip.label,
            }))}
            onChange={(skip) => step.update({ skip })}
          />
        </div>
      ) : null}

      {treats ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel>{t("feedTreatsLabel")}</FieldLabel>
          <Segmented
            name="feed-treats"
            label={t("feedTreatsLabel")}
            value={plan.treats}
            options={TREATS.map((treats) => ({
              value: treats,
              label: treatsLabel(t, treats),
            }))}
            onChange={(treats) => step.update({ treats })}
            className="self-start"
          />
        </div>
      ) : null}
    </EditorSection>
  );
}
