"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ClipboardCheck, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";

import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-facility-rbac";
import { usePetEvaluations, useStartEvaluation } from "@/lib/api/evaluations";
import { formatDateLong } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

const EvaluatorDialog = dynamic(() =>
  import("@/components/evaluations/evaluator/evaluator-dialog").then(
    (m) => m.EvaluatorDialog,
  ),
);

// ============================================================================
// A pet's evaluations on its profile (the client's mock, 2026-10-02): each
// visit — being answered, in review, sent — and "Start an evaluation" for one
// with no booking behind it, in the same dialog as Operations › Evaluations.
// ============================================================================

export function PetEvaluationsPanel({
  petRef,
  petName,
}: {
  petRef: number;
  petName: string;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const mayRun = usePermission("perform_evaluations");
  const evaluations = usePetEvaluations(petRef);
  const start = useStartEvaluation();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = evaluations.data ?? [];

  return (
    <section
      aria-labelledby="pet-evaluations"
      className="bg-card border-line flex min-w-0 flex-col rounded-3xl border"
    >
      <header className="border-line flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <ClipboardCheck className="text-ink-secondary size-5" aria-hidden />
        <h2
          id="pet-evaluations"
          className="text-section text-heading min-w-0 flex-1"
        >
          {t("petTitle")}
        </h2>
        {mayRun ? (
          <Button
            type="button"
            disabled={start.isPending}
            onClick={() =>
              start.mutate(
                { petRef },
                {
                  onSuccess: ({ id }) => setOpenId(id),
                  onError: (error) =>
                    toast.error(t("startFailed"), {
                      description: error.message,
                    }),
                },
              )
            }
            aria-label={fill("startFor", { pet: petName })}
          >
            <Plus aria-hidden />
            {t("petStart")}
          </Button>
        ) : null}
      </header>
      {rows.length === 0 ? (
        <p className="text-body text-ink-secondary px-4 py-5">
          {evaluations.isPending ? t("loadingEvaluation") : t("petNone")}
        </p>
      ) : (
        <ul className="divide-line divide-y">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex min-h-14 min-w-0 flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-body-strong text-body-ink">
                  {formatDateLong(row.completedAt ?? row.startedAt, locale)}
                </p>
                <p className="text-meta text-ink-secondary">
                  {fill("evaluatorIs", { name: row.evaluatorName })}
                </p>
              </div>
              {row.status === "completed" && row.result ? (
                <EvaluationResultChip result={row.result} />
              ) : (
                <Badge variant="inService">
                  <LoaderCircle aria-hidden />
                  {t("stateInProgress")}
                </Badge>
              )}
              <Badge variant="cancelled">{t(`card_${row.cardStatus}`)}</Badge>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenId(row.id)}
              >
                {row.status === "in_progress" && mayRun
                  ? t("continue")
                  : t("view")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {openId ? (
        <EvaluatorDialog
          evaluationId={openId}
          onOpenChange={(open) => {
            if (!open) {
              setOpenId(null);
              void evaluations.refetch();
            }
          }}
        />
      ) : null}
    </section>
  );
}
