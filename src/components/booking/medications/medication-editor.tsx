"use client";

import { Button } from "@/components/ui/button";
import { doseCountWords } from "@/lib/medications/describe";
import { fill } from "@/lib/medications/dose";
import { draftDays, draftTimes } from "@/lib/medications/draft";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { EditorMedication } from "./editor-medication";
import { EditorMethod } from "./editor-method";
import { EditorSchedule } from "./editor-schedule";
import { EditorSupply } from "./editor-supply";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// One medication being written: its title and ×, the design's four parts in
// its order, and a footer that says what stops it being saved — or how many
// doses it schedules — beside Save medication.
// ============================================================================

const HINT_KEY = {
  name: "medsHintName",
  controlled: "medsHintControlled",
  amount: "medsHintAmount",
  schedule: "medsHintSchedule",
  supply: "medsHintSupply",
  label: "medsHintLabel",
} as const;

export function MedicationEditor({
  step,
  petName,
}: {
  step: MedicationStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const editor = step.editor!;
  const { draft } = editor;
  const name = draft.name.trim();
  const strength = draft.strength.trim();
  const title = name
    ? strength
      ? `${name} ${strength}`
      : name
    : t("medsNewMedication");
  const doses =
    draftTimes(draft, step.settings).length *
    draftDays(draft, step.stay).length;
  const hint = step.problem
    ? fill(t(HINT_KEY[step.problem]), { name })
    : fill(t("medsHintScheduled"), {
        doses: doseCountWords(t, doses, locale),
      });

  return (
    <section
      aria-label={title}
      className="border-line bg-card overflow-hidden rounded-[20px] border"
    >
      <header className="flex items-center justify-between gap-3 border-b border-(--row-line) px-4 py-5 sm:px-6">
        <h4 className="text-body-ink min-w-0 text-[17px] font-semibold wrap-break-word">
          {title}
        </h4>
        <button
          type="button"
          aria-label={
            editor.original
              ? fill(t("medsCancelEdit"), { name: editor.original.name })
              : t("medsDiscardNew")
          }
          onClick={step.discard}
          className="text-ink-tertiary focus-visible:outline-primary flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[22px] focus-visible:outline-2"
        >
          <span aria-hidden>×</span>
        </button>
      </header>

      <div className="divide-y divide-(--row-line)">
        <EditorMedication step={step} />
        <EditorSchedule step={step} />
        <EditorMethod step={step} />
        <EditorSupply step={step} petName={petName} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-(--row-line) bg-(--stepper-bg) px-4 py-4 sm:px-6">
        <span className="text-ink-tertiary text-[13px]" aria-live="polite">
          {hint}
        </span>
        <Button
          type="button"
          variant="flat"
          size="care-lg"
          onClick={step.save}
          disabled={step.problem !== null}
          className="[&:disabled:not([data-loading])]:bg-(--care-cta-off) [&:disabled:not([data-loading])]:text-white"
        >
          {t("medsSaveMedication")}
        </Button>
      </footer>
    </section>
  );
}
