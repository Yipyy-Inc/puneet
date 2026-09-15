"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReviewSubmission, type SubmissionRow } from "@/lib/api/forms-live";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Sending a submission back to the customer for changes.
//
// Answers are final, so a correction is a new submission: this sets the
// status to `changes_requested` with a note saying what to fix, and the
// customer is emailed the note when the facility's form notification settings
// ask for it. A note is required, by this control and by the route.
// ============================================================================

export function SendBackForChanges({
  submission,
}: {
  submission: Pick<SubmissionRow, "id" | "status" | "reviewNote">;
}) {
  const { t } = useStaffText("formReview");
  const review = useReviewSubmission();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  if (submission.status === "changes_requested") {
    return submission.reviewNote ? (
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{t("askedFor")}</p>
        <p className="whitespace-pre-wrap">{submission.reviewNote}</p>
      </div>
    ) : null;
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          {t("sendBack")}
        </Button>
        <p className="text-muted-foreground text-xs">{t("sendBackHelp")}</p>
      </div>
    );
  }

  const empty = note.trim() === "";

  return (
    <div className="space-y-2">
      <Label htmlFor="send-back-note">{t("noteLabel")}</Label>
      <Textarea
        id="send-back-note"
        value={note}
        maxLength={1000}
        placeholder={t("notePlaceholder")}
        aria-invalid={tried && empty}
        onChange={(event) => setNote(event.target.value)}
      />
      {tried && empty && (
        <p className="text-destructive text-sm" role="alert">
          {t("noteRequired")}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          disabled={review.isPending}
          onClick={() => {
            setTried(true);
            if (empty) return;
            review.mutate(
              {
                id: submission.id,
                status: "changes_requested",
                reviewNote: note.trim(),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  setNote("");
                  setTried(false);
                  toast.success(t("sent"), { description: t("sentHelp") });
                },
                onError: (error) => {
                  toast.error(t("notSent"), {
                    description:
                      error instanceof Error ? error.message : undefined,
                  });
                },
              },
            );
          }}
        >
          {t("send")}
        </Button>
        <Button
          variant="outline"
          disabled={review.isPending}
          onClick={() => {
            setOpen(false);
            setTried(false);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
