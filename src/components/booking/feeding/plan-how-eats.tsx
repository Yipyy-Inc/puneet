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
  skipLabel,
  styleLabel,
  treatsLabel,
} from "@/lib/feeding/labels";
import {
  EATING_HABITS,
  FEEDING_STYLES,
  SKIP_ACTIONS,
  TREATS,
} from "@/lib/feeding/vocabulary";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// HOW IT EATS: the feeding style, eating habits, what to do when a meal is
// skipped, and treats.
// ============================================================================

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
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
  const { show } = step.settings;
  if (!show.styles && !show.habits && !show.skip && !show.treats) return null;

  return (
    <EditorSection label={fill(t("feedSectionHow"), { pet: petName })}>
      {show.styles ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel id="feed-styles-label">{t("feedStyleLabel")}</FieldLabel>
          <div
            role="group"
            aria-labelledby="feed-styles-label"
            className="flex flex-wrap gap-2"
          >
            {FEEDING_STYLES.map((style) => (
              <ChoicePill
                key={style}
                type="checkbox"
                value={style}
                checked={plan.styles.includes(style)}
                onChange={() =>
                  step.update((current) => ({
                    styles: toggled(current.styles, style),
                  }))
                }
              >
                {styleLabel(t, style)}
              </ChoicePill>
            ))}
          </div>
        </div>
      ) : null}

      {show.habits ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel id="feed-habits-label">{t("feedHabitsLabel")}</FieldLabel>
          <div
            role="group"
            aria-labelledby="feed-habits-label"
            className="flex flex-wrap gap-2"
          >
            {EATING_HABITS.map((habit) => (
              <ChoicePill
                key={habit}
                type="checkbox"
                value={habit}
                checked={plan.habits.includes(habit)}
                onChange={() =>
                  step.update((current) => ({
                    habits: toggled(current.habits, habit),
                  }))
                }
              >
                {habitLabel(t, habit)}
              </ChoicePill>
            ))}
          </div>
        </div>
      ) : null}

      {show.skip ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel>{fill(t("feedSkipLabel"), { pet: petName })}</FieldLabel>
          <OptionCards
            label={fill(t("feedSkipLabel"), { pet: petName })}
            value={plan.skip}
            columns="sm:grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]"
            options={SKIP_ACTIONS.map((skip) => ({
              value: skip,
              title: skipLabel(t, skip),
            }))}
            onChange={(skip) => step.update({ skip })}
          />
        </div>
      ) : null}

      {show.treats ? (
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
