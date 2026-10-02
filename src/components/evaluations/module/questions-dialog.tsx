"use client";

import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { toast } from "sonner";

import { CustomQuestionRow } from "@/components/evaluations/module/custom-question-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  optionsFromText,
  SECTIONS,
  type CustomQuestion,
} from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Evaluation questions — the client's mock (2026-10-02): "Yipyy's core
// questions stay in place. Add your own to any step." The four steps, each
// with its locked core questions and the facility's own after them; Save
// writes the facility's list (evaluation_form_template.customQuestions), and
// every evaluation started after uses it — one finished before keeps the
// questions it was answered with.
// ============================================================================

/** The core questions as the editor lists them: their words and their kind. */
const CORE_ROWS: ReadonlyArray<ReadonlyArray<{ label: string; kind: string }>> =
  [
    [
      { label: "q_dog", kind: "kind_yn" },
      { label: "q_human", kind: "kind_yn" },
      { label: "q_energy", kind: "kind_lmh" },
      { label: "q_anx", kind: "kind_lmh" },
      { label: "q_react", kind: "kind_lmh" },
    ],
    [
      { label: "q_play", kind: "kind_choice" },
      { label: "q_group", kind: "kind_choice" },
      { label: "q_leash", kind: "kind_choice" },
    ],
    [
      { label: "q_guard", kind: "kind_yn_internal" },
      { label: "q_tags", kind: "kind_tags" },
      { label: "q_note", kind: "kind_note" },
    ],
    [
      { label: "q_result", kind: "kind_outcome" },
      { label: "q_approved", kind: "kind_services" },
    ],
  ];

const MAX_QUESTIONS = 40;

function newQuestion(section: CustomQuestion["section"]): CustomQuestion {
  return {
    id: `c-${crypto.randomUUID().slice(0, 8)}`,
    section,
    label: "",
    type: "yn",
    options: [],
    onCard: true,
    required: false,
  };
}

export function QuestionsDialog({
  open,
  onOpenChange,
  questions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The facility's saved list — read before the dialog opened. */
  questions: CustomQuestion[];
  onSave: (questions: CustomQuestion[]) => Promise<unknown>;
}) {
  const { t, fill } = useStaffText("evaluations");
  const [draft, setDraft] = useState<CustomQuestion[]>(questions);
  const [optionsText, setOptionsText] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.options.join(", ")])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<CustomQuestion>) =>
    setDraft((list) => list.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const save = async () => {
    const cleaned = draft.map((q) => ({
      ...q,
      label: q.label.trim(),
      options:
        q.type === "choice" ? optionsFromText(optionsText[q.id] ?? "") : [],
    }));
    const found: Record<string, string> = {};
    for (const q of cleaned) {
      if (!q.label) found[q.id] = t("questionNeedsWording");
      else if (q.type === "choice" && q.options.length < 2) {
        found[q.id] = t("questionNeedsOptions");
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSave(cleaned);
      // success-claim-ok: onSave is the settings write, awaited on the line above
      toast.success(t("questionsSaved"));
      onOpenChange(false);
    } catch (error) {
      toast.error(t("questionsNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-[820px] md:gap-0 md:p-0">
        <DialogHeader className="border-line border-b px-5 pt-5 pb-4 text-left">
          <DialogTitle className="text-section text-heading">
            {t("questionsTitle")}
          </DialogTitle>
          <DialogDescription className="text-meta text-ink-secondary">
            {t("questionsHelp")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {SECTIONS.map((sectionKey, index) => {
            const section = index as CustomQuestion["section"];
            const own = draft.filter((q) => q.section === section);
            return (
              <section
                key={sectionKey}
                aria-labelledby={`ev-qs-${sectionKey}`}
                className="border-line shrink-0 overflow-hidden rounded-2xl border"
              >
                <header className="border-line flex flex-wrap items-center gap-3 border-b px-4 py-3">
                  <span
                    aria-hidden
                    className="bg-heading flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <h3
                    id={`ev-qs-${sectionKey}`}
                    className="text-body-strong text-body-ink min-w-0 flex-1"
                  >
                    {t(`step_${sectionKey}`)}
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-dashed"
                    disabled={draft.length >= MAX_QUESTIONS}
                    onClick={() =>
                      setDraft((list) => [...list, newQuestion(section)])
                    }
                    aria-label={fill("addQuestionTo", {
                      step: t(`step_${sectionKey}`),
                    })}
                  >
                    <Plus aria-hidden />
                    {t("addQuestion")}
                  </Button>
                </header>
                <ul className="divide-line divide-y">
                  {CORE_ROWS[index]!.map((row) => (
                    <li
                      key={row.label}
                      className="flex min-w-0 items-center gap-3 px-4 py-2.5"
                    >
                      <Lock
                        className="text-ink-disabled size-4 shrink-0"
                        aria-label={t("coreQuestion")}
                      />
                      <span className="text-body text-body-ink min-w-0 flex-1">
                        {t(row.label)}
                      </span>
                      <span className="text-meta text-ink-tertiary shrink-0">
                        {t(row.kind)}
                      </span>
                    </li>
                  ))}
                </ul>
                {own.length > 0 ? (
                  <div className="flex flex-col gap-2.5 p-3">
                    {own.map((question) => (
                      <CustomQuestionRow
                        key={question.id}
                        question={question}
                        optionsText={optionsText[question.id] ?? ""}
                        error={errors[question.id] ?? null}
                        onChange={(patch) => update(question.id, patch)}
                        onOptionsText={(text) =>
                          setOptionsText((all) => ({
                            ...all,
                            [question.id]: text,
                          }))
                        }
                        onRemove={() =>
                          setDraft((list) =>
                            list.filter((q) => q.id !== question.id),
                          )
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <DialogFooter className="border-line flex-row justify-end gap-2.5 border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            className="yy-cta"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? t("saving") : t("saveQuestions")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
