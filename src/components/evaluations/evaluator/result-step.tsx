"use client";

import { CircleCheck, CirclePlus } from "lucide-react";

import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { ChoicePill } from "@/components/ui/choice-pill";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import { isPass, sectionQuestions } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { QuestionCard } from "./question-card";
import type { Evaluator } from "./use-evaluator";

// ============================================================================
// Result — the client's mock (2026-10-02): the outcome (Approved · Approved
// with notes · Needs re-evaluation · Not approved, each with its line), then
// "Approved for": the services the pass unlocks "on the pet profile and in
// online booking" — the facility's services that need an evaluation. Only a
// pass approves anything.
// ============================================================================

export function ResultStep({
  detail,
  evaluator,
}: {
  detail: EvaluationDetail;
  evaluator: Evaluator;
}) {
  const { t } = useStaffText("evaluations");
  const serviceName = useEvaluationServiceName();
  const disabled = !evaluator.editable;
  const passed = evaluator.result ? isPass(evaluator.result) : false;

  return (
    <div className="flex flex-col gap-3">
      {sectionQuestions(3, detail.customQuestions).map((question) => (
        <QuestionCard
          key={question.key}
          question={question}
          value={evaluator.answers[question.key] ?? ""}
          disabled={disabled}
          onAnswer={(value) => evaluator.answer(question.key, value)}
        />
      ))}

      {/* The card frames the fieldset rather than being it: a legend sits
          on its fieldset's border, and this one belongs inside the card. */}
      <div className="bg-card border-line rounded-2xl border p-4">
        <fieldset
          className="flex min-w-0 flex-col gap-2"
          aria-describedby="ev-approved-help"
          disabled={disabled || !passed}
        >
          <legend className="text-body-strong text-body-ink">
            {t("approvedForTitle")}
          </legend>
          <p id="ev-approved-help" className="text-meta text-ink-secondary">
            {passed ? t("approvedForHelp") : t("approvedForNeedsPass")}
          </p>
          <div className="flex flex-wrap gap-2">
            {detail.serviceChoices.map((service) => {
              const on = evaluator.approved.includes(service);
              return (
                <ChoicePill
                  key={service}
                  type="checkbox"
                  checked={on}
                  disabled={disabled || !passed}
                  onChange={() => evaluator.toggleApproved(service)}
                >
                  {on ? (
                    <CircleCheck className="size-4" aria-hidden />
                  ) : (
                    <CirclePlus className="size-4" aria-hidden />
                  )}
                  {serviceName(service)}
                </ChoicePill>
              );
            })}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
