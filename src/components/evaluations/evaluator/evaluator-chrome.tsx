"use client";

import { BadgeCheck, CircleCheck, Heart, Tag, X } from "lucide-react";

import { Playgroup } from "@/components/icons/yipyy-icons";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import { SECTIONS } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

import type { SaveState } from "./use-evaluator";

// ============================================================================
// The evaluator's dialog chrome — the client's mock (2026-10-02):
//
//   Evaluation · Buddy                          ▬▬▬▬▬▬ 3 of 10    (×)
//   Golden Retriever · Alice Johnson · evaluator Sarah Johnson
//   (♡ Temperament) (Play profile) (Behavior & notes) (Result)
//
// A step that is fully answered shows a check instead of its glyph.
// ============================================================================

const STEP_GLYPH = [Heart, Playgroup, Tag, BadgeCheck] as const;

export function EvaluatorHeader({
  detail,
  done,
  total,
  saveState,
  onClose,
}: {
  detail: EvaluationDetail;
  done: number;
  total: number;
  saveState: SaveState;
  onClose: () => void;
}) {
  const { t, fill } = useStaffText("evaluations");
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <header className="bg-card border-line flex min-w-0 items-start gap-3 border-b px-4 py-3 md:px-5">
      <div className="min-w-0 flex-1">
        <DialogTitle className="text-section text-heading">
          {fill("evaluatorTitle", { pet: detail.pet.name })}
        </DialogTitle>
        <DialogDescription className="text-meta text-ink-secondary">
          {[
            detail.pet.breed,
            detail.client.name,
            fill("evaluatorBy", { name: detail.evaluatorName }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </DialogDescription>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 pt-1">
        <div className="flex items-center gap-2.5">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={t("progressLabel")}
            className="bg-primary-tint-2 hidden h-1.5 w-28 overflow-hidden rounded-full sm:block"
          >
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-meta text-body-ink font-semibold tabular-nums">
            {fill("progressOf", { done, total })}
          </span>
        </div>
        <span className="text-meta text-ink-tertiary" aria-live="polite">
          {saveState === "saving"
            ? t("saving")
            : saveState === "saved"
              ? t("saved")
              : saveState === "error"
                ? t("saveRetrying")
                : ""}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={onClose}
        aria-label={t("close")}
      >
        <X aria-hidden />
      </Button>
    </header>
  );
}

export function StepPills({
  step,
  onStep,
  isDone,
}: {
  step: 0 | 1 | 2 | 3;
  onStep: (step: 0 | 1 | 2 | 3) => void;
  isDone: (section: 0 | 1 | 2 | 3) => boolean;
}) {
  const { t } = useStaffText("evaluations");
  return (
    <nav
      aria-label={t("stepsLabel")}
      className="bg-surface-inset flex flex-wrap gap-2 px-4 pt-3 md:px-5"
    >
      {SECTIONS.map((section, index) => {
        const value = index as 0 | 1 | 2 | 3;
        const on = step === value;
        const done = isDone(value);
        const Glyph = done ? CircleCheck : STEP_GLYPH[index]!;
        return (
          <button
            key={section}
            type="button"
            aria-current={on ? "step" : undefined}
            data-on={on}
            onClick={() => onStep(value)}
            className="text-body-strong text-body-ink hover:text-primary focus-visible:outline-primary data-[on=true]:bg-card data-[on=true]:text-primary flex min-h-10 items-center gap-2 rounded-full px-4 focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] max-lg:min-h-12"
          >
            <Glyph
              aria-hidden
              data-done={done}
              className="data-[done=true]:text-success size-4 shrink-0"
            />
            {t(`step_${section}`)}
          </button>
        );
      })}
    </nav>
  );
}
