"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { YipyyGoReviewBody } from "@/lib/api/mappers/yipyy-go";
import { useReviewYipyyGo, type StaffYipyyGoBooking } from "@/lib/api/yipyy-go";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { FormTemplateConfig } from "@/types/yipyygo";

import { FormStatusChip, formChipStatusOf } from "../form-status-chip";
import { FormAnswers } from "./form-answers";

// ============================================================================
// Reviewing one dog’s pre-arrival form: approve it, open it again for the
// owner to change, or complete it for them with a reason
// (review_yipyy_go_submission, complete_yipyy_go_by_staff).
//
// It replaces a modal that edited the fixture store directly and toasted
// “Change request sent to customer” when nothing was sent. The owner reads the
// requested changes on their own form; each outcome here is said only once
// the server has answered.
// ============================================================================

type Pet = StaffYipyyGoBooking["pets"][number];

export function ReviewDialog({
  open,
  onOpenChange,
  bookingRef,
  pet,
  template,
  required,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingRef: number;
  pet: Pet;
  template: FormTemplateConfig;
  required: boolean | null;
}) {
  const { fill } = useStaffText("yipyyGo");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{fill("dialogTitle", { pet: pet.name })}</DialogTitle>
          <div>
            <FormStatusChip
              status={formChipStatusOf(pet.submission, required)}
              mandatory={required === true}
            />
          </div>
        </DialogHeader>
        {open && (
          <ReviewBody
            bookingRef={bookingRef}
            pet={pet}
            template={template}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewBody({
  bookingRef,
  pet,
  template,
  onDone,
}: {
  bookingRef: number;
  pet: Pet;
  template: FormTemplateConfig;
  onDone: () => void;
}) {
  const { t, fill } = useStaffText("yipyyGo");
  const review = useReviewYipyyGo(bookingRef);
  const status = pet.submission?.status ?? null;
  const reviewable = status === "submitted";
  const completable =
    status === null || status === "draft" || status === "changes_requested";
  const [mode, setMode] = useState<"changes" | "complete" | null>(
    completable ? "complete" : null,
  );
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const empty = !text.trim();

  const act = async (body: YipyyGoReviewBody, success: string) => {
    setFailed(false);
    try {
      await review.mutateAsync(body);
      toast.success(success);
      onDone();
    } catch {
      setFailed(true);
    }
  };
  const submitText = () => {
    setTried(true);
    if (empty || !mode) return;
    void act(
      mode === "changes"
        ? { action: "request_changes", petRef: pet.ref, message: text.trim() }
        : { action: "complete", petRef: pet.ref, reason: text.trim() },
      fill(mode === "changes" ? "changesToast" : "completedToast", {
        pet: pet.name,
      }),
    );
  };

  return (
    <div className="space-y-5">
      {pet.submission && pet.submission.status !== "draft" ? (
        <FormAnswers
          petName={pet.name}
          submission={pet.submission}
          template={template}
        />
      ) : (
        <p className="text-ink-secondary text-[14.5px]">{t("noFormYet")}</p>
      )}

      {mode && (
        <div className="space-y-1.5">
          <Label htmlFor="yipyy-go-review-text">
            {t(
              mode === "changes"
                ? "requestMessageLabel"
                : "completeReasonLabel",
            )}
          </Label>
          <Textarea
            id="yipyy-go-review-text"
            rows={3}
            maxLength={1000}
            value={text}
            placeholder={t(
              mode === "changes"
                ? "requestMessagePlaceholder"
                : "completeReasonPlaceholder",
            )}
            aria-invalid={(tried && empty) || undefined}
            aria-describedby={
              tried && empty ? "yipyy-go-review-note" : undefined
            }
            onChange={(event) => setText(event.target.value)}
          />
          {tried && empty && (
            <p
              id="yipyy-go-review-note"
              className="text-destructive text-[13px] font-medium"
            >
              {t(mode === "changes" ? "messageRequired" : "reasonRequired")}
            </p>
          )}
        </div>
      )}

      {failed && (
        <p role="alert" className="text-destructive text-[13.5px] font-medium">
          {t("actionFailed")}
        </p>
      )}

      {(reviewable || mode) && (
        <DialogFooter className="flex-wrap gap-2">
          {reviewable && mode === null && (
            <>
              <Button
                variant="outline"
                onClick={() => setMode("changes")}
                disabled={review.isPending}
              >
                {t("requestChanges")}
              </Button>
              <Button
                loading={review.isPending}
                onClick={() =>
                  void act(
                    { action: "approve", petRef: pet.ref },
                    fill("approvedToast", { pet: pet.name }),
                  )
                }
              >
                {fill("approve", { pet: pet.name })}
              </Button>
            </>
          )}
          {mode && (
            <Button loading={review.isPending} onClick={submitText}>
              {fill(mode === "changes" ? "sendChanges" : "completeConfirm", {
                pet: pet.name,
              })}
            </Button>
          )}
        </DialogFooter>
      )}
    </div>
  );
}
