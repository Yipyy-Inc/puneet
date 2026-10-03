"use client";

import {
  BadgeCheck,
  CircleCheck,
  Heart,
  Tag,
  Volleyball,
  X,
} from "lucide-react";

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

// The mock's four (2026-10-03): favorite, sports_tennis, sell, verified.
const STEP_GLYPH = [Heart, Volleyball, Tag, BadgeCheck] as const;

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
    <header className="bg-card flex min-w-0 items-center gap-3 border-b border-(--inset-2) px-4 py-4 md:px-[22px]">
      <div className="min-w-0 flex-1">
        <DialogTitle className="text-body-ink text-[19px] font-extrabold">
          {fill("evaluatorTitle", { pet: detail.pet.name })}
        </DialogTitle>
        <DialogDescription className="text-ink-secondary text-[13px]">
          {[
            detail.pet.breed,
            detail.client.name,
            fill("evaluatorBy", { name: detail.evaluatorName }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </DialogDescription>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={t("progressLabel")}
            className="bg-surface-inset-2 hidden h-2 w-[110px] overflow-hidden rounded-full sm:block"
          >
            <div
              className="h-full rounded-full bg-(--em-progress)"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-body-ink text-[12.5px] font-semibold tabular-nums">
            {fill("progressOf", { done, total })}
          </span>
        </div>
        <span className="text-ink-tertiary text-[12px]" aria-live="polite">
          {saveState === "saving"
            ? t("saving")
            : saveState === "saved"
              ? t("saved")
              : saveState === "error"
                ? t("saveRetrying")
                : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="bg-surface-inset-2 text-body-ink focus-visible:outline-primary grid size-9 shrink-0 place-items-center rounded-full focus-visible:outline-2"
      >
        <X aria-hidden className="size-[18px]" />
      </button>
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
      className="flex flex-wrap gap-1 px-4 pt-3 md:px-[18px]"
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
            data-done={done && !on}
            className="text-body-ink focus-visible:outline-primary data-[done=true]:text-success data-[on=true]:text-primary flex h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:bg-(--em-step-on)"
          >
            <Glyph aria-hidden className="size-[18px] shrink-0" />
            {t(`step_${section}`)}
          </button>
        );
      })}
    </nav>
  );
}
