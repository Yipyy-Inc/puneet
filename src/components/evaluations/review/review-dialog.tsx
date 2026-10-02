"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
  CardPreview,
  cardModelOf,
} from "@/components/evaluations/card/card-preview";
import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WIDE_DIALOG_FRAME } from "@/components/ui/wide-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  saveEvaluation,
  useEvaluationDetail,
  useReturnEvaluationCard,
  useSendEvaluationCard,
  useWriteEvaluationNote,
} from "@/lib/api/evaluations";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import { isPass } from "@/lib/evaluations/questions";
import { formatList } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { ReviewChecks } from "./review-checks";

// ============================================================================
// Review report card — the client's mock (2026-10-02): what to check before
// it goes, the note to the owner to edit (the card follows each keystroke),
// the channels it goes out on, and Send back or Approve & send. Beside it,
// the card as the owner will get it — §5i's wide modal, as the evaluator's
// dialog.
// ============================================================================

export function ReviewDialog({
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
          <ReviewBody
            detail={detail.data}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <DialogTitle className="text-section text-heading">
              {detail.isError ? t("loadFailed") : t("loadingEvaluation")}
            </DialogTitle>
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewBody({
  detail,
  onClose,
}: {
  detail: EvaluationDetail;
  onClose: () => void;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const serviceName = useEvaluationServiceName();
  const [ownerNote, setOwnerNote] = useState(detail.ownerNote);
  const [savedNote, setSavedNote] = useState(detail.ownerNote);
  const [channels, setChannels] = useState<Array<"email" | "sms">>(() => [
    ...(detail.delivery.notifyViaEmail && detail.client.hasEmail
      ? (["email"] as const)
      : []),
    ...(detail.delivery.notifyViaSMS && detail.client.hasPhone
      ? (["sms"] as const)
      : []),
  ]);
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState("");
  const send = useSendEvaluationCard();
  const sendBack = useReturnEvaluationCard();
  const rewrite = useWriteEvaluationNote();
  const mayAct = detail.viewer.mayReview && detail.cardStatus === "in_review";
  const busy = send.isPending || sendBack.isPending;

  // The reviewer's edits are kept as they type, so closing loses nothing.
  useEffect(() => {
    if (!mayAct || ownerNote === savedNote) return;
    const timer = window.setTimeout(() => {
      saveEvaluation(detail.id, { ownerNote })
        .then(() => setSavedNote(ownerNote))
        .catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [ownerNote, savedNote, mayAct, detail.id]);

  const approve = () =>
    send.mutate(
      { id: detail.id, ownerNote, channels },
      {
        onSuccess: () => {
          const first = detail.client.name.split(" ")[0] ?? "";
          const unlocked =
            detail.result && isPass(detail.result)
              ? detail.approvedServices.map(serviceName)
              : [];
          toast.success(
            unlocked.length > 0
              ? fill("sentUnlocked", {
                  owner: first,
                  services: formatList(unlocked, locale),
                })
              : fill("cardSentTo", { owner: first }),
          );
          onClose();
        },
        onError: (error) =>
          toast.error(t("sendFailed"), { description: error.message }),
      },
    );

  const returnCard = () =>
    sendBack.mutate(
      { id: detail.id, comment },
      {
        onSuccess: () => {
          toast.success(t("sentBack"));
          onClose();
        },
        onError: (error) =>
          toast.error(t("sendBackFailed"), { description: error.message }),
      },
    );

  const card = cardModelOf(detail, {
    answers: detail.answers,
    strengths: detail.strengths,
    watchFor: detail.watchFor,
    ownerNote,
    internalNote: detail.internalNote,
    approved: detail.approvedServices,
  });

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="bg-card border-line flex min-w-0 items-start gap-3 border-b px-4 py-3 md:px-5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-section text-heading">
              {fill("reviewTitle", { pet: detail.pet.name })}
            </DialogTitle>
            <DialogDescription className="text-meta text-ink-secondary">
              {[detail.pet.breed, detail.client.name]
                .filter(Boolean)
                .join(" · ")}
            </DialogDescription>
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

        <div className="bg-surface-inset flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 md:px-5">
          {!mayAct ? (
            <p className="bg-card border-line text-body text-body-ink rounded-2xl border px-4 py-3">
              {detail.cardStatus === "sent"
                ? t("alreadySent")
                : t("notYoursToReview")}
            </p>
          ) : null}
          <ReviewChecks detail={detail} ownerNote={ownerNote} />

          <section className="bg-card border-line flex flex-col gap-2 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body-strong text-body-ink min-w-0 flex-1">
                <label htmlFor="ev-review-note">{t("editNoteTitle")}</label>
              </h3>
              <Button
                type="button"
                variant="outline"
                disabled={!mayAct || rewrite.isPending}
                onClick={() =>
                  rewrite.mutate(
                    {
                      evaluationId: detail.id,
                      tone: "warm",
                      points: ownerNote,
                      answers: detail.answers,
                      strengths: detail.strengths,
                      watchFor: detail.watchFor,
                      result: detail.result,
                    },
                    {
                      onSuccess: ({ note, fallback }) => {
                        setOwnerNote(note);
                        if (fallback) toast(t("aiFallback"));
                        else toast.success(t("aiWritten"));
                      },
                      onError: (error) =>
                        toast.error(t("aiFailed"), {
                          description: error.message,
                        }),
                    },
                  )
                }
              >
                <Sparkles aria-hidden />
                {rewrite.isPending ? t("aiWriting") : t("aiRewrite")}
              </Button>
            </div>
            <Textarea
              id="ev-review-note"
              value={ownerNote}
              maxLength={4000}
              rows={5}
              disabled={!mayAct}
              onChange={(event) => setOwnerNote(event.target.value)}
            />
            <p className="text-meta text-ink-tertiary">{t("editNoteHelp")}</p>
          </section>

          <div className="bg-card border-line rounded-2xl border p-4">
            <fieldset className="flex flex-col gap-2" disabled={!mayAct}>
              <legend className="text-body-strong text-body-ink">
                {t("sendBy")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {(["email", "sms"] as const).map((channel) => {
                  const possible =
                    channel === "email"
                      ? detail.delivery.notifyViaEmail && detail.client.hasEmail
                      : detail.delivery.notifyViaSMS && detail.client.hasPhone;
                  if (!possible) return null;
                  return (
                    <ChoicePill
                      key={channel}
                      type="checkbox"
                      checked={channels.includes(channel)}
                      onChange={() =>
                        setChannels((current) =>
                          current.includes(channel)
                            ? current.filter((c) => c !== channel)
                            : [...current, channel],
                        )
                      }
                    >
                      {t(`channel_${channel}`)}
                    </ChoicePill>
                  );
                })}
                <ChoicePill
                  type="checkbox"
                  checked
                  disabled
                  onChange={() => undefined}
                >
                  {t("channel_portal")}
                </ChoicePill>
              </div>
            </fieldset>
          </div>

          {returning ? (
            <section className="bg-card border-line flex flex-col gap-2 rounded-2xl border p-4">
              <label
                htmlFor="ev-return-comment"
                className="text-body-strong text-body-ink"
              >
                {t("returnCommentLabel")}
              </label>
              <Textarea
                id="ev-return-comment"
                value={comment}
                maxLength={1000}
                rows={3}
                placeholder={t("returnCommentPlaceholder")}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="flex flex-wrap justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setReturning(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  disabled={busy || !comment.trim()}
                  onClick={returnCard}
                >
                  {sendBack.isPending ? t("sendingBack") : t("sendBackConfirm")}
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <footer className="bg-card border-line flex flex-wrap items-center gap-3 border-t px-4 py-3 md:px-5">
          <Button
            type="button"
            variant="outline"
            disabled={!mayAct || busy || returning}
            onClick={() => setReturning(true)}
          >
            {t("sendBack")}
          </Button>
          <Button
            type="button"
            size="prominent"
            className="yy-cta min-w-0 flex-1"
            disabled={!mayAct || busy}
            onClick={approve}
          >
            {send.isPending ? t("sending") : t("approveSend")}
          </Button>
        </footer>
      </div>
      <div className="border-line hidden min-h-0 border-l lg:flex">
        <CardPreview card={card} />
      </div>
    </div>
  );
}
