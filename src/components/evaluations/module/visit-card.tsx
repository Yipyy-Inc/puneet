"use client";

import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { PetTile } from "@/components/evaluations/pet-tile";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { TodayVisit } from "@/lib/evaluations/board-types";
import { formatTimeInZone } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

// ============================================================================
// One pet of one evaluation booked today — the client's mock (2026-10-02):
//
//   [B]  Buddy                                  9:00 AM
//        Golden Retriever · Alice Johnson
//   (Daycare) (Boarding) (First visit)
//   ─────────────────────────────────────────────────────
//   Evaluator: Sarah Johnson               [Start evaluation]
//
// The footer says where the evaluation is: not started (who it is assigned
// to), being answered (Continue), finished (its card in review or sent —
// View), or sent back with the reviewer's comment.
// ============================================================================

export function VisitCard({
  visit,
  timeZone,
  mayRun,
  highlighted,
  busy,
  onStart,
  onOpen,
}: {
  visit: TodayVisit;
  /** The facility's zone: the time the pet arrives, wherever staff are. */
  timeZone: string;
  mayRun: boolean;
  /** Opened from the calendar's link to this booking. */
  highlighted: boolean;
  busy: boolean;
  onStart: () => void;
  onOpen: (evaluationId: string) => void;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const serviceName = useEvaluationServiceName();
  const evaluation = visit.evaluation;
  const finished = evaluation?.status === "completed";

  const footer = (() => {
    if (!evaluation) {
      return fill("evaluatorIs", {
        name: visit.assignedName ?? t("unassigned"),
      });
    }
    if (finished) {
      return evaluation.cardStatus === "sent"
        ? t("doneCardSent")
        : t("doneCardInReview");
    }
    if (evaluation.returnedComment) {
      return fill("returnedWith", { comment: evaluation.returnedComment });
    }
    return fill("evaluatorIs", { name: evaluation.evaluatorName });
  })();

  return (
    <article
      id={`evaluation-visit-${visit.bookingRef}-${visit.pet.ref}`}
      data-highlighted={highlighted ? "true" : undefined}
      className={cn(
        "bg-card border-line flex min-w-0 flex-col gap-3 rounded-[20px] border p-4",
        "data-[highlighted=true]:shadow-[inset_0_0_0_2px_var(--primary)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <PetTile
          id={visit.pet.id}
          name={visit.pet.name}
          src={visit.pet.imageUrl}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <p className="text-body-ink truncate text-[16px] font-bold">
            {visit.pet.name}
          </p>
          <p className="text-ink-tertiary text-[12.5px] text-pretty">
            {[visit.pet.breed, visit.client.name].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="text-body-ink shrink-0 text-[13px] font-bold tabular-nums">
          {formatTimeInZone(visit.startAt, locale, timeZone)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visit.unlocks.map((service) => (
          <Chip
            key={service}
            tone="info"
            size="xs"
            className="px-[9px] py-[3px]"
          >
            {serviceName(service)}
          </Chip>
        ))}
        <Chip tone="neutral" size="xs" className="px-[9px] py-[3px]">
          {t(`reason_${visit.reason}`)}
        </Chip>
      </div>

      <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-(--row-line) pt-3">
        <p
          className={cn(
            "min-w-0 flex-1 text-[12.5px] text-pretty",
            evaluation?.returnedComment && !finished
              ? "text-warning"
              : "text-ink-secondary",
          )}
        >
          {footer}
        </p>
        {evaluation && finished ? (
          <Button
            type="button"
            variant="quiet"
            size="mock-38"
            className="px-4 font-bold"
            onClick={() => onOpen(evaluation.id)}
            aria-label={fill("viewFor", { pet: visit.pet.name })}
          >
            {t("view")}
          </Button>
        ) : mayRun ? (
          <Button
            type="button"
            size="mock-38"
            className="px-4 font-bold [--sh-cta:none]"
            disabled={busy}
            onClick={evaluation ? () => onOpen(evaluation.id) : onStart}
            aria-label={fill(evaluation ? "continueFor" : "startFor", {
              pet: visit.pet.name,
            })}
          >
            {evaluation ? t("continue") : t("startEvaluation")}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
