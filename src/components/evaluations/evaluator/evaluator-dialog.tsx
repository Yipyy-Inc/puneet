"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  CardPreview,
  cardModelOf,
} from "@/components/evaluations/card/card-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WIDE_DIALOG_FRAME } from "@/components/ui/wide-dialog";
import {
  useEvaluationDetail,
  useFinishEvaluation,
} from "@/lib/api/evaluations";
import { deliveryAction } from "@/lib/evaluations/delivery";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import { sectionQuestions } from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { BehaviorStep } from "./behavior-step";
import { DiscardEvaluation } from "./discard-evaluation";
import { EvaluatorHeader, StepPills } from "./evaluator-chrome";
import { OwnerIntake } from "./owner-intake";
import { QuestionCard } from "./question-card";
import { ResultStep } from "./result-step";
import { useEvaluator } from "./use-evaluator";

// ============================================================================
// The evaluator's form — the client's mock (2026-10-02): four steps
// (Temperament, Play profile, Behavior & notes, Result) beside the report
// card as the owner will get it, built live from the answers. Answers save
// as they are given; Finish checks every required one and hands the card to
// Setup's delivery — the review queue, or straight to the owner.
//
// §5i's wide modal (ui/wide-dialog.ts), the booking wizard's frame: the form
// and the phone-sized card side by side from 1024px; below that the card
// steps aside and the form takes the whole window, a sheet below 640px.
// ============================================================================

export function EvaluatorDialog({
  evaluationId,
  onOpenChange,
}: {
  evaluationId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useStaffText("evaluations");
  const detail = useEvaluationDetail(evaluationId);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={WIDE_DIALOG_FRAME}>
        {detail.data ? (
          <EvaluatorBody
            detail={detail.data}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <DialogTitle className="text-section text-heading">
              {detail.isError ? t("loadFailed") : t("loadingEvaluation")}
            </DialogTitle>
            {detail.isError ? (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => void detail.refetch()}
              >
                {t("tryAgain")}
              </Button>
            ) : (
              <>
                <Skeleton className="h-12 rounded-full" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EvaluatorBody({
  detail,
  onClose,
}: {
  detail: EvaluationDetail;
  onClose: () => void;
}) {
  const { t, fill } = useStaffText("evaluations");
  const evaluator = useEvaluator(detail);
  const finish = useFinishEvaluation();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const { done, total } = evaluator.progress;
  const complete = done === total;
  const sendsNow =
    deliveryAction(detail.delivery.mode, evaluator.result) === "send";

  const close = () => {
    void evaluator.flush();
    onClose();
  };

  const finishEvaluation = async () => {
    if (!(await evaluator.flush())) {
      toast.error(t("saveFailed"));
      return;
    }
    finish.mutate(detail.id, {
      onSuccess: (outcome) => {
        if (outcome.outcome === "sent") {
          toast.success(
            fill("cardSentTo", {
              owner: detail.client.name.split(" ")[0] ?? "",
            }),
          );
        } else {
          toast.success(t("cardToReview"));
        }
        onClose();
      },
      onError: (error) =>
        toast.error(t("finishFailed"), { description: error.message }),
    });
  };

  const card = cardModelOf(detail, {
    answers: evaluator.answers,
    strengths: evaluator.strengths,
    watchFor: evaluator.watchFor,
    ownerNote: evaluator.ownerNote,
    internalNote: evaluator.internalNote,
    approved: evaluator.approved,
  });

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <EvaluatorHeader
          detail={detail}
          done={done}
          total={total}
          saveState={evaluator.saveState}
          onClose={close}
        />
        <StepPills
          step={step}
          onStep={setStep}
          isDone={(section) =>
            sectionQuestions(section, detail.customQuestions).every(
              (question) =>
                (evaluator.answers[question.key] ?? "").trim().length > 0,
            )
          }
        />
        <div className="bg-surface-inset flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 md:px-5">
          {detail.returnedComment && detail.status === "in_progress" ? (
            <p
              role="status"
              className="bg-card border-line text-body text-body-ink rounded-2xl border px-4 py-3"
            >
              <span className="text-warning font-semibold">
                {t("returnedLabel")}
              </span>{" "}
              {detail.returnedComment}
            </p>
          ) : null}
          {step === 0 && detail.intake ? (
            <OwnerIntake intake={detail.intake} />
          ) : null}
          {step === 2 ? (
            <BehaviorStep detail={detail} evaluator={evaluator} />
          ) : step === 3 ? (
            <ResultStep detail={detail} evaluator={evaluator} />
          ) : (
            sectionQuestions(step, detail.customQuestions).map((question) => (
              <QuestionCard
                key={question.key}
                question={question}
                value={evaluator.answers[question.key] ?? ""}
                disabled={!evaluator.editable}
                onAnswer={(value) => evaluator.answer(question.key, value)}
              />
            ))
          )}
        </div>
        <footer className="bg-card border-line flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-3">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
              >
                {t("back")}
              </Button>
            ) : null}
            {evaluator.editable ? (
              <DiscardEvaluation
                evaluationId={detail.id}
                petName={detail.pet.name}
                hasBooking={detail.booking !== null}
                onDiscarded={onClose}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
            {step === 3 && evaluator.editable && !complete ? (
              <p className="text-meta text-ink-secondary">
                {fill("answerAllFirst", { count: total })}
              </p>
            ) : null}
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              >
                {t("next")}
              </Button>
            ) : evaluator.editable ? (
              <Button
                type="button"
                className="yy-cta"
                disabled={!complete || finish.isPending}
                onClick={() => void finishEvaluation()}
              >
                {finish.isPending
                  ? t("finishing")
                  : sendsNow
                    ? t("finishSend")
                    : t("finishReview")}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={close}>
                {t("close")}
              </Button>
            )}
          </div>
        </footer>
      </div>
      <div className="border-line hidden min-h-0 border-l lg:flex">
        <CardPreview card={card} />
      </div>
    </div>
  );
}
