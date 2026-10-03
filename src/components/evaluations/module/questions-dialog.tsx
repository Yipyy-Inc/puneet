"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";
import { toast } from "sonner";

import { CustomQuestionRow } from "@/components/evaluations/module/custom-question-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
      <DialogContent
        showCloseButton={false}
        // The evaluations mock's sheet: white, 28px corners.
        className="bg-card flex max-h-[calc(100dvh-2rem)] flex-col gap-0 rounded-[28px] p-0 sm:max-w-[820px] md:gap-0 md:p-0"
      >
        <DialogHeader className="flex-row items-center gap-3 border-b border-(--inset-2) px-[22px] py-[18px] text-left">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-body-ink text-[19px] font-extrabold">
              {t("questionsTitle")}
            </DialogTitle>
            <DialogDescription className="text-ink-secondary text-[13px]">
              {t("questionsHelp")}
            </DialogDescription>
          </div>
          <DialogClose
            aria-label={t("close")}
            className="bg-surface-inset-2 text-body-ink focus-visible:outline-primary grid size-9 shrink-0 place-items-center rounded-full focus-visible:outline-2"
          >
            <X aria-hidden className="size-[18px]" />
          </DialogClose>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[22px] py-4">
          {SECTIONS.map((sectionKey, index) => {
            const section = index as CustomQuestion["section"];
            const own = draft.filter((q) => q.section === section);
            return (
              <section
                key={sectionKey}
                aria-labelledby={`ev-qs-${sectionKey}`}
                className="border-line shrink-0 overflow-hidden rounded-[18px] border"
              >
                <header className="bg-surface-inset flex flex-wrap items-center gap-2.5 px-4 py-3">
                  <span
                    aria-hidden
                    className="bg-body-ink flex size-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <h3
                    id={`ev-qs-${sectionKey}`}
                    className="text-body-ink min-w-0 flex-1 text-[15px] font-bold"
                  >
                    {t(`step_${sectionKey}`)}
                  </h3>
                  <Button
                    type="button"
                    variant="quiet"
                    size="mock-32"
                    className="gap-1 border-dashed border-(--acc-line) bg-(--acc-pale) px-3 font-bold text-(--info-ink)"
                    disabled={draft.length >= MAX_QUESTIONS}
                    onClick={() =>
                      setDraft((list) => [...list, newQuestion(section)])
                    }
                    aria-label={fill("addQuestionTo", {
                      step: t(`step_${sectionKey}`),
                    })}
                  >
                    <span aria-hidden>+</span>
                    {t("addQuestion")}
                  </Button>
                </header>
                <ul className="divide-y divide-(--row-line) border-t border-(--row-line)">
                  {CORE_ROWS[index]!.map((row) => (
                    <li
                      key={row.label}
                      className="flex min-w-0 items-center gap-2.5 px-4 py-2.5"
                    >
                      <Lock
                        className="text-ink-disabled size-[17px] shrink-0"
                        aria-label={t("coreQuestion")}
                      />
                      <span className="text-body-ink min-w-0 flex-1 text-[13.5px]">
                        {t(row.label)}
                      </span>
                      <span className="text-ink-tertiary shrink-0 text-[12px]">
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

        <DialogFooter className="flex-row justify-end gap-2.5 border-t border-(--inset-2) px-[22px] py-4">
          <Button
            type="button"
            variant="quiet"
            size="lg"
            className="px-[18px] text-[14.5px] font-semibold"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            size="lg"
            className="px-5 text-[14.5px] font-bold [--sh-cta:none]"
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
