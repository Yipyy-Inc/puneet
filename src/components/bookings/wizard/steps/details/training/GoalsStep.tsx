"use client";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Textarea } from "@/components/ui/textarea";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Training's "Goals" screen (the client's mock, 2026-10-01):
//
//   What should we work on?
//   Pick any that apply — the trainer reads this before the first session.
//   [Loose-leash walking] [Recall] [Sit & stay] …
//   PREVIOUS TRAINING   [None yet] [Some basics] [Lots of training]
//   NOTES FOR THE TRAINER   ____________________________________________
//
// The goals are the facility's own words (Settings › Training), else the
// eight the mock offers, in the reader's language. Saved on the booking —
// on every session of an enrolment — where the trainer reads them.
// ============================================================================

export type TrainingExperience = "none" | "some" | "lots";

export interface TrainingIntake {
  goals: string[];
  experience: TrainingExperience | null;
  notes: string;
}

export function GoalsStep({
  goalOptions,
  value,
  onChange,
}: {
  /** The facility's own goals; empty uses the shipped eight. */
  goalOptions: readonly string[];
  value: TrainingIntake;
  onChange: (next: TrainingIntake) => void;
}) {
  const t = useShellText("booking");
  const shipped = [
    t("wizGoalLeash"),
    t("wizGoalRecall"),
    t("wizGoalSitStay"),
    t("wizGoalJumping"),
    t("wizGoalReactivity"),
    t("wizGoalCrate"),
    t("wizGoalSeparation"),
    t("wizGoalPuppy"),
  ];
  const goals = goalOptions.length > 0 ? goalOptions : shipped;
  const experiences: Array<{ value: TrainingExperience; label: string }> = [
    { value: "none", label: t("wizExperienceNone") },
    { value: "some", label: t("wizExperienceSome") },
    { value: "lots", label: t("wizExperienceLots") },
  ];

  return (
    <div className="flex max-w-[900px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-section text-body-ink">{t("wizWorkOn")}</h3>
          <p className="text-meta text-ink-tertiary">{t("wizWorkOnHint")}</p>
        </div>
        <div
          role="group"
          aria-label={t("wizWorkOn")}
          className="flex flex-wrap gap-2"
        >
          {goals.map((goal) => {
            const on = value.goals.includes(goal);
            return (
              <ChoicePill
                key={goal}
                type="checkbox"
                name="wizard-training-goals"
                value={goal}
                checked={on}
                onChange={() =>
                  onChange({
                    ...value,
                    goals: on
                      ? value.goals.filter((g) => g !== goal)
                      : [...value.goals, goal],
                  })
                }
              >
                {goal}
              </ChoicePill>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span
          id="wizard-training-experience"
          className="text-micro text-ink-tertiary uppercase"
        >
          {t("wizPreviousTraining")}
        </span>
        <div
          role="radiogroup"
          aria-labelledby="wizard-training-experience"
          className="flex flex-wrap gap-2"
        >
          {experiences.map((option) => (
            <ChoicePill
              key={option.value}
              type="radio"
              name="wizard-training-experience"
              value={option.value}
              checked={value.experience === option.value}
              onChange={() => onChange({ ...value, experience: option.value })}
            >
              {option.label}
            </ChoicePill>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label
          htmlFor="wizard-trainer-notes"
          className="text-micro text-ink-tertiary uppercase"
        >
          {t("wizTrainerNotes")}
        </label>
        <Textarea
          id="wizard-trainer-notes"
          value={value.notes}
          maxLength={2000}
          rows={4}
          placeholder={t("wizTrainerNotesPlaceholder")}
          onChange={(event) =>
            onChange({ ...value, notes: event.target.value })
          }
        />
      </div>
    </div>
  );
}
