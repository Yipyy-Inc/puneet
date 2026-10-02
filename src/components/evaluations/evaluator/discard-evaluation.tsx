"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDiscardEvaluation } from "@/lib/api/evaluations";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Throw away an evaluation still being answered — started on the wrong pet,
// or never begun (public.discard_evaluation). §5j: the title names the
// object and the verb, the line says what survives and that it cannot be
// undone, Cancel is the safe default, the destructive verb sits to its
// right. A finished evaluation is not offered this: it is sent back first.
// ============================================================================

export function DiscardEvaluation({
  evaluationId,
  petName,
  hasBooking,
  onDiscarded,
}: {
  evaluationId: string;
  petName: string;
  /** Booked visits can be started again from Today; a walk-in cannot. */
  hasBooking: boolean;
  onDiscarded: () => void;
}) {
  const { t, fill } = useStaffText("evaluations");
  const discard = useDiscardEvaluation();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!discard.isPending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost">
          <Trash2 aria-hidden />
          {t("discard")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {fill("discardTitle", { pet: petName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(hasBooking ? "discardBodyBooking" : "discardBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={discard.isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={discard.isPending}
            onClick={(event) => {
              // Held open until the delete answers, so a refusal is read
              // here rather than dismissed with the dialog.
              event.preventDefault();
              discard.mutate(evaluationId, {
                onSuccess: () => {
                  setOpen(false);
                  toast.success(fill("discarded", { pet: petName }));
                  onDiscarded();
                },
                onError: (error) =>
                  toast.error(t("discardFailed"), {
                    description: error.message,
                  }),
              });
            }}
          >
            {discard.isPending ? t("discarding") : t("discardConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
