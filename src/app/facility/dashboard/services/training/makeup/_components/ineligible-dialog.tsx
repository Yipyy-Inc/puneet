"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingMissedSession } from "@/lib/api/mappers/training-makeups";
import { useMakeupAction } from "@/lib/api/training-makeups";
import { useStaffText } from "@/lib/staff/use-staff-text";

/** Decide a missed session gets no make-up, and say why. The reason is kept
 *  on the make-up; the owner reads it on their training page. */
export function IneligibleDialog({
  session,
  onOpenChange,
}: {
  session: TrainingMissedSession | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill } = useStaffText("trainingMakeups");
  const action = useMakeupAction();
  const [reason, setReason] = useState("");

  function close(open: boolean) {
    if (!open) setReason("");
    onOpenChange(open);
  }

  async function confirm() {
    if (!session || !reason.trim()) return;
    try {
      await action.mutateAsync({
        bookingId: session.bookingId,
        action: "ineligible",
        reason: reason.trim(),
      });
      toast.success(fill("markedIneligible", { pet: session.petName }));
      close(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Dialog open={session !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {session ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {fill("ineligibleTitle", { pet: session.petName })}
              </DialogTitle>
              <DialogDescription>
                {fill("ineligibleDescription", {
                  pet: session.petName,
                  number: session.sessionNumber,
                  series: session.seriesName,
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="makeup-ineligible-reason">
                {t("reasonLabel")}
              </Label>
              <Textarea
                id="makeup-ineligible-reason"
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => void confirm()}
                loading={action.isPending}
                disabled={!reason.trim()}
              >
                {t("confirmIneligible")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
