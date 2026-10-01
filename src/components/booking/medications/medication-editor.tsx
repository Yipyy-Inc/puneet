"use client";

import { X } from "lucide-react";

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
      className="border-line bg-card shadow-card overflow-hidden rounded-2xl border"
    >
      <header className="border-line flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <h4 className="text-section text-body-ink min-w-0 wrap-break-word">
          {title}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            editor.original
              ? fill(t("medsCancelEdit"), { name: editor.original.name })
              : t("medsDiscardNew")
          }
          onClick={step.discard}
        >
          <X className="size-5" aria-hidden />
        </Button>
      </header>

      <div className="divide-line divide-y">
        <EditorMedication step={step} />
        <EditorSchedule step={step} />
        <EditorMethod step={step} />
        <EditorSupply step={step} petName={petName} />
      </div>

      <footer className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
        <span className="text-meta text-ink-tertiary" aria-live="polite">
          {hint}
        </span>
        <Button
          type="button"
          onClick={step.save}
          disabled={step.problem !== null}
        >
          {t("medsSaveMedication")}
        </Button>
      </footer>
    </section>
  );
}
