"use client";

import { useState } from "react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import {
  INTAKE_QUESTIONS,
  type IntakeAnswers,
  type IntakeKey,
} from "@/lib/evaluations/questions";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { Pet } from "@/types/pet";

// ============================================================================
// "About your pet" — the customer's last step before Review on an evaluation
// (the client's mock, 2026-10-02): "Tell us about Moka", the questions the
// facility turned on, each a row of choices, and anything else the evaluator
// should know. All of it optional; it reaches the evaluator on the day.
//
// The mock asks about the first pet only. With two pets each gets their own
// answers, behind the same tabs the Package step uses — one dog's nerves are
// not the other's.
// ============================================================================

export function EvaluationIntakeStep({
  pets,
  enabled,
  value,
  onChange,
}: {
  pets: readonly Pet[];
  /** The questions the facility asks (Settings › Evaluations). */
  enabled: Record<IntakeKey, boolean>;
  value: Record<number, IntakeAnswers>;
  onChange: (petId: number, answers: IntakeAnswers) => void;
}) {
  const t = useShellText("booking");
  const [petId, setPetId] = useState<number | null>(pets[0]?.id ?? null);
  const pet = pets.find((p) => p.id === petId) ?? pets[0];
  if (!pet) return null;
  const answers = value[pet.id] ?? {};
  const set = (patch: Partial<IntakeAnswers>) =>
    onChange(pet.id, { ...answers, ...patch });
  const questions = INTAKE_QUESTIONS.filter((q) => enabled[q.key]);

  return (
    <div className="flex flex-col gap-3.5">
      {pets.length > 1 ? (
        <Segmented
          name="evaluation-intake-pet"
          label={t("wizEvWhichPet")}
          value={String(pet.id)}
          options={pets.map((p) => ({ value: String(p.id), label: p.name }))}
          onChange={(next) => setPetId(Number(next))}
          className="self-start"
        />
      ) : null}

      {questions.map((question) => (
        <fieldset
          key={question.key}
          className="border-line bg-card flex min-w-0 flex-col gap-2.5 rounded-[18px] border p-4"
        >
          <legend className="sr-only">
            {/* french-ok: a catalogue key built from an id */}
            {t(`wizEvQ_${question.key}`)}
          </legend>
          <p aria-hidden className="text-body-ink text-[15px] font-bold">
            {/* french-ok: a catalogue key built from an id */}
            {t(`wizEvQ_${question.key}`)}
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {question.options.map((option) => (
              <ChoicePill
                key={option}
                type="radio"
                name={`evaluation-${pet.id}-${question.key}`}
                value={option}
                checked={answers[question.key] === option}
                onChange={() => set({ [question.key]: option })}
                tone="ink"
              >
                {/* french-ok: a catalogue key built from an id */}
                {t(`wizEvA_${question.key}_${option}`)}
              </ChoicePill>
            ))}
          </div>
        </fieldset>
      ))}

      <Textarea
        rows={3}
        aria-label={t("wizEvAnythingElse")}
        placeholder={t("wizEvAnythingElse")}
        value={answers.notes ?? ""}
        onChange={(event) => set({ notes: event.target.value })}
        className="border-line-strong rounded-[16px] px-3.5 py-3 text-[14px]"
      />
    </div>
  );
}
