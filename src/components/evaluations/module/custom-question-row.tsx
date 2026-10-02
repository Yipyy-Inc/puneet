"use client";

import { Trash2 } from "lucide-react";

import { SwitchRow } from "@/components/evaluations/switch-row";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import type { AnswerKind, CustomQuestion } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// One of the facility's own questions in the editor — the client's mock
// (2026-10-02): its wording, its kind (Yes / No · Low / Med / High · Single
// choice · Short text), a single choice's options, whether it shows on the
// owner's card and whether the evaluator must answer it.
// ============================================================================

export const ANSWER_KINDS: AnswerKind[] = ["yn", "lmh", "choice", "text"];

export function CustomQuestionRow({
  question,
  optionsText,
  error,
  onChange,
  onOptionsText,
  onRemove,
}: {
  question: CustomQuestion;
  /** The options as typed, commas and all, until the editor saves. */
  optionsText: string;
  error: string | null;
  onChange: (patch: Partial<CustomQuestion>) => void;
  onOptionsText: (text: string) => void;
  onRemove: () => void;
}) {
  const { t, fill } = useStaffText("evaluations");
  const labelId = `ev-q-${question.id}`;
  return (
    <div className="border-line flex min-w-0 flex-col gap-3 rounded-2xl border p-3.5">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={labelId} className="sr-only">
            {t("questionWording")}
          </label>
          <Input
            id={labelId}
            value={question.label}
            maxLength={200}
            placeholder={t("questionPlaceholder")}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onRemove}
          aria-label={fill("removeQuestion", {
            question: question.label || t("questionUntitled"),
          })}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <div
        role="radiogroup"
        aria-label={t("questionKind")}
        className="flex flex-wrap gap-2"
      >
        {ANSWER_KINDS.map((kind) => (
          <ChoicePill
            key={kind}
            type="radio"
            name={`ev-kind-${question.id}`}
            value={kind}
            checked={question.type === kind}
            onChange={() => onChange({ type: kind })}
          >
            {t(`kind_${kind}`)}
          </ChoicePill>
        ))}
      </div>

      {question.type === "choice" ? (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${labelId}-options`}
            className="text-meta text-ink-secondary"
          >
            {t("questionOptions")}
          </label>
          <Input
            id={`${labelId}-options`}
            value={optionsText}
            placeholder={t("questionOptionsPlaceholder")}
            onChange={(event) => onOptionsText(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="min-w-[200px] flex-1">
          <SwitchRow
            id={`${labelId}-card`}
            label={t("showOnCard")}
            checked={question.onCard}
            onChange={(onCard) => onChange({ onCard })}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <SwitchRow
            id={`${labelId}-required`}
            label={t("required")}
            checked={question.required}
            onChange={(required) => onChange({ required })}
          />
        </div>
      </div>

      {error ? (
        <p className="text-meta text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
