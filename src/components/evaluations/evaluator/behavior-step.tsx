"use client";

import { Sparkles } from "lucide-react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Textarea } from "@/components/ui/textarea";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import {
  sectionQuestions,
  STRENGTH_TAGS,
  WATCH_TAGS,
} from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { AiNotePanel } from "./ai-note-panel";
import { PhotoField } from "./photo-field";
import { QuestionCard } from "./question-card";
import type { Evaluator } from "./use-evaluator";

// ============================================================================
// Behavior & notes — the client's mock (2026-10-02): resource guarding (for
// staff only), the strengths shown on the card and the watch-for tags shown
// kindly as "we'll help with…", the note to the owner with AI assist, the
// internal note, and the photo.
//
// As the mock draws them (2026-10-03): a chosen strength turns green and a
// chosen watch-for amber, and the note, the internal note and the photo share
// one card.
// ============================================================================

export function BehaviorStep({
  detail,
  evaluator,
}: {
  detail: EvaluationDetail;
  evaluator: Evaluator;
}) {
  const { t } = useStaffText("evaluations");
  const disabled = !evaluator.editable;

  return (
    <div className="flex flex-col gap-3">
      {sectionQuestions(2, detail.customQuestions).map((question) => (
        <QuestionCard
          key={question.key}
          question={question}
          value={evaluator.answers[question.key] ?? ""}
          disabled={disabled}
          onAnswer={(value) => evaluator.answer(question.key, value)}
        />
      ))}

      <section className="bg-card border-line flex min-w-0 flex-col gap-3.5 rounded-[18px] border px-4 py-3.5">
        <TagGroup
          id="ev-strengths"
          title={t("strengthsTitle")}
          help={t("strengthsHelp")}
          tags={STRENGTH_TAGS}
          prefix="strength_"
          tone="good"
          picked={evaluator.strengths}
          disabled={disabled}
          onToggle={evaluator.toggleStrength}
        />
        <TagGroup
          id="ev-watch"
          title={t("watchTitle")}
          help={t("watchHelp")}
          tags={WATCH_TAGS}
          prefix="watch_"
          tone="watch"
          picked={evaluator.watchFor}
          disabled={disabled}
          onToggle={evaluator.toggleWatch}
        />
      </section>

      <section className="bg-card border-line flex min-w-0 flex-col gap-2 rounded-[18px] border px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body-ink min-w-0 flex-1 text-[15px] font-bold">
            <label htmlFor="ev-owner-note">{t("ownerNoteTitle")}</label>
          </h3>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-(--ai)">
            <Sparkles className="size-[17px]" aria-hidden />
            {t("aiAssist")}
          </span>
        </div>
        <AiNotePanel
          evaluationId={detail.id}
          answers={evaluator.answers}
          strengths={evaluator.strengths}
          watchFor={evaluator.watchFor}
          result={evaluator.result}
          hasNote={evaluator.ownerNote.trim().length > 0}
          disabled={disabled}
          onNote={evaluator.setOwnerNote}
        />
        <Textarea
          id="ev-owner-note"
          value={evaluator.ownerNote}
          maxLength={4000}
          rows={4}
          disabled={disabled}
          placeholder={t("ownerNotePlaceholder")}
          onChange={(event) => evaluator.setOwnerNote(event.target.value)}
          className="px-3 text-[14px] leading-normal"
        />

        <h3 className="text-body-ink mt-1.5 text-[15px] font-bold">
          <label htmlFor="ev-internal-note">
            {t("internalNoteTitle")}
            <span className="text-bad text-[12px] font-semibold">
              {" · "}
              {t("staffOnly")}
            </span>
          </label>
        </h3>
        <Textarea
          id="ev-internal-note"
          value={evaluator.internalNote}
          maxLength={4000}
          rows={2}
          disabled={disabled}
          placeholder={t("internalNotePlaceholder")}
          onChange={(event) => evaluator.setInternalNote(event.target.value)}
          className="min-h-16 border-dashed border-(--internal-line) bg-(--internal-bg) px-3 text-[14px]"
        />

        {detail.card.includePhoto ? (
          <PhotoField
            evaluationId={detail.id}
            photoUrl={detail.photoUrl}
            disabled={disabled}
          />
        ) : null}
      </section>
    </div>
  );
}

function TagGroup({
  id,
  title,
  help,
  tags,
  prefix,
  tone,
  picked,
  disabled,
  onToggle,
}: {
  id: string;
  title: string;
  help: string;
  tags: readonly string[];
  prefix: string;
  /** A chosen strength turns green, a chosen watch-for amber. */
  tone: "good" | "watch";
  picked: string[];
  disabled: boolean;
  onToggle: (tag: string) => void;
}) {
  const { t } = useStaffText("evaluations");
  return (
    <fieldset className="min-w-0" aria-describedby={`${id}-help`}>
      <legend className="text-body-ink text-[15px] font-bold">{title}</legend>
      <p
        id={`${id}-help`}
        className="text-ink-tertiary mt-0.5 mb-2 text-[12.5px]"
      >
        {help}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <ChoicePill
            key={tag}
            type="checkbox"
            tone={tone}
            checked={picked.includes(tag)}
            disabled={disabled}
            onChange={() => onToggle(tag)}
          >
            {t(`${prefix}${tag}`)}
          </ChoicePill>
        ))}
      </div>
    </fieldset>
  );
}
