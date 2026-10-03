"use client";

import { Circle, CircleCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { SectionQuestion } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// One question of the evaluator's form — the client's mock (2026-10-02): an
// answered-or-not mark, the question, the line under it, then its answers
// as cards (Yes / No, Low / Medium / High, a choice — the outcome with a
// line each) or, for the facility's short-text question, a field. Chosen
// is the 2px primary ring (§6 rule 2), never a fill.
// ============================================================================

/** The words a core answer reads as; the facility's own are its own. */
function optionLabel(
  t: (key: string) => string,
  question: SectionQuestion,
  option: string,
): string {
  if (question.custom) {
    if (question.kind === "yn" || question.kind === "lmh") {
      return t(`answer_${option}`);
    }
    return option;
  }
  if (question.kind === "yn" || question.kind === "lmh") {
    return t(`answer_${option}`);
  }
  return t(`${question.key}_${option}`);
}

function optionsOf(question: SectionQuestion): readonly string[] {
  if (question.kind === "yn") return ["y", "n"];
  if (question.kind === "lmh") return ["l", "m", "h"];
  return question.options;
}

export function QuestionCard({
  question,
  value,
  disabled,
  onAnswer,
}: {
  question: SectionQuestion;
  value: string;
  disabled: boolean;
  onAnswer: (value: string) => void;
}) {
  const { t } = useStaffText("evaluations");
  const answered = value.trim().length > 0;
  const label = question.custom
    ? question.custom.label
    : t(`q_${question.key}`);
  const hint = question.custom
    ? t(question.custom.onCard ? "customOnCard" : "customStaffOnly")
    : question.hint
      ? t(`hint_${question.key}`)
      : null;
  const labelId = `ev-question-${question.key}`;

  return (
    <section
      aria-labelledby={labelId}
      className="bg-card border-line flex min-w-0 flex-col gap-2 rounded-[18px] border px-4 py-3.5"
    >
      <div className="flex min-w-0 items-start gap-2">
        {answered ? (
          <CircleCheck
            className="text-success mt-px size-[19px] shrink-0"
            aria-label={t("answered")}
          />
        ) : (
          <Circle
            className="text-ink-disabled mt-px size-[19px] shrink-0"
            aria-label={t("notAnswered")}
          />
        )}
        <div className="min-w-0">
          <h3 id={labelId} className="text-body-ink text-[15px] font-bold">
            {label}
          </h3>
          {hint ? (
            <p className="text-ink-tertiary text-[12.5px]">{hint}</p>
          ) : null}
        </div>
      </div>

      {question.kind === "text" ? (
        <Input
          aria-labelledby={labelId}
          value={value}
          maxLength={500}
          disabled={disabled}
          onChange={(event) => onAnswer(event.target.value)}
          className="h-[46px] rounded-[14px] px-3.5 text-[14px] max-lg:h-[46px]"
        />
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,130px),1fr))] gap-2"
        >
          {optionsOf(question).map((option) => {
            const on = value === option;
            const help =
              question.key === "result" && !question.custom
                ? t(`result_${option}_help`)
                : null;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                data-on={on}
                disabled={disabled}
                onClick={() => onAnswer(option)}
                className="bg-card border-line-strong text-body-ink focus-visible:outline-primary data-[on=true]:border-body-ink data-[on=true]:bg-body-ink group flex min-h-12 min-w-0 flex-col justify-center rounded-[14px] border-[1.5px] px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed data-[on=true]:text-white"
              >
                <span className="text-[14px] font-bold">
                  {optionLabel(t, question, option)}
                </span>
                {help ? (
                  <span className="text-ink-tertiary text-[12px] font-medium group-data-[on=true]:text-white/75">
                    {help}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
