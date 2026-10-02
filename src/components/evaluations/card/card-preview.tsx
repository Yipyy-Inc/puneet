"use client";

import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import type { EvaluationResult } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

import {
  EvaluationReportCard,
  type ReportCardModel,
} from "./evaluation-report-card";

// ============================================================================
// "Report card · live preview" — the client's mock (2026-10-02): the card as
// the owner will get it, in a phone, changing as the evaluator answers and
// the reviewer edits. Beside the evaluator's and the reviewer's forms at
// 1024px and wider; the form has the room below that.
// ============================================================================

/** The card from an evaluation and whatever is on screen now. */
export function cardModelOf(
  detail: EvaluationDetail,
  live: {
    answers: Record<string, string>;
    strengths: readonly string[];
    watchFor: readonly string[];
    ownerNote: string;
    internalNote: string;
    approved: readonly string[];
  },
): ReportCardModel {
  return {
    facilityName: detail.facility.name,
    facilityLogoUrl: detail.facility.logoUrl,
    petName: detail.pet.name,
    petBreed: detail.pet.breed,
    petSex: detail.pet.sex,
    ownerName: detail.client.name,
    evaluatorName: detail.evaluatorName,
    result: (live.answers.result ?? null) as EvaluationResult | null,
    answers: live.answers,
    strengths: live.strengths,
    watchFor: live.watchFor,
    customQuestions: detail.customQuestions,
    ownerNote: live.ownerNote,
    internalNote: live.internalNote,
    approvedServices: live.approved,
    photoUrl: detail.photoUrl,
    date: detail.completedAt ?? new Date().toISOString(),
    options: detail.card,
  };
}

export function CardPreview({ card }: { card: ReportCardModel }) {
  const { t } = useStaffText("evaluations");
  const serviceName = useEvaluationServiceName();
  return (
    <aside
      aria-label={t("previewLabel")}
      className="bg-surface-inset flex min-h-0 flex-col items-center gap-3 overflow-y-auto px-5 py-4"
    >
      <p className="text-micro text-ink-tertiary uppercase">
        {t("previewLabel")}
      </p>
      <div className="border-heading bg-ground w-full max-w-[360px] overflow-hidden rounded-3xl border-[6px]">
        <EvaluationReportCard card={card} serviceName={serviceName} />
      </div>
      <p className="text-meta text-ink-tertiary">{t("previewCaption")}</p>
    </aside>
  );
}
