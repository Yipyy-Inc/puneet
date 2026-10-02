"use client";

import { ChevronDown, MessageSquareText } from "lucide-react";

import {
  INTAKE_QUESTIONS,
  type IntakeAnswers,
} from "@/lib/evaluations/questions";
import { useShellText } from "@/lib/shell/use-shell-text";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// "From the owner" — what the owner said when they booked online ("About
// your pet", the booking mock), folded away on Temperament so the evaluator
// meets the dog with it in mind. The answers' words are the booking form's
// own, so they read as the owner saw them.
// ============================================================================

export function OwnerIntake({ intake }: { intake: IntakeAnswers }) {
  const { t } = useStaffText("evaluations");
  const booking = useShellText("booking");
  const answered = INTAKE_QUESTIONS.filter((question) =>
    intake[question.key]?.trim(),
  );
  const notes = intake.notes?.trim();
  if (answered.length === 0 && !notes) return null;

  return (
    <details className="bg-card border-line group rounded-2xl border">
      <summary className="text-body-strong text-body-ink flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-4 py-2">
        <MessageSquareText
          className="text-ink-secondary size-5 shrink-0"
          aria-hidden
        />
        <span className="min-w-0 flex-1">{t("fromOwner")}</span>
        <ChevronDown
          className="text-ink-secondary size-4 shrink-0 transition-transform duration-180 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <dl className="border-line flex flex-col gap-2 border-t px-4 py-3">
        {answered.map((question) => (
          <div key={question.key} className="flex min-w-0 flex-col">
            <dt className="text-meta text-ink-secondary">
              {/* french-ok: a catalogue key built from an id */}
              {booking(`wizEvQ_${question.key}`)}
            </dt>
            <dd className="text-body text-body-ink">
              {/* french-ok: a catalogue key built from an id */}
              {booking(`wizEvA_${question.key}_${intake[question.key]}`)}
            </dd>
          </div>
        ))}
        {notes ? (
          <div className="flex min-w-0 flex-col">
            <dt className="text-meta text-ink-secondary">{t("ownerNotes")}</dt>
            <dd className="text-body text-body-ink whitespace-pre-wrap">
              {notes}
            </dd>
          </div>
        ) : null}
      </dl>
    </details>
  );
}
