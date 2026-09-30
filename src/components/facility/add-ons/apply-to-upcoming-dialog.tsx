"use client";

import { Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { useApplyAddOnToUpcoming } from "@/lib/api/add-ons";
import type { AddOn } from "@/types/add-on";

// ============================================================================
// "Apply the changes to N unconfirmed upcoming appointments?" (2026-09-30)
//
// Asked after an add-on's name, price, tax or duration is edited, when
// bookings that are not confirmed yet carry it — the question the reference
// asks. Yes brings those bookings' lines to the add-on as it is now; no
// leaves them as they were sold, and only new bookings get the new values.
// A confirmed booking keeps what was agreed either way.
//
// The safe answer is the one that changes nothing, and it holds the focus
// (§5j). The button that changes them names how many (§5r).
// ============================================================================

export function ApplyToUpcomingDialog({
  addOn,
  bookings,
  onClose,
  t,
}: {
  addOn: AddOn;
  /** How many unconfirmed upcoming bookings carry it — more than none. */
  bookings: number;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const apply = useApplyAddOnToUpcoming();

  const counted = (one: string, other: string, n: number) =>
    t(n === 1 ? one : other)
      .replace("{n}", String(n))
      .replace("{name}", addOn.name);

  async function confirm() {
    try {
      const { applied } = await apply.mutateAsync(addOn.id);
      // success-claim-ok: after awaiting the write, which throws on failure
      toast.success(counted("appliedOne", "appliedOther", applied));
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("couldNotApply").replace("{name}", addOn.name),
      );
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !apply.isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {counted("applyTitleOne", "applyTitleOther", bookings)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("applyBody").replace("{name}", addOn.name)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={apply.isPending}>
            {t("applySkip")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={apply.isPending}
            onClick={(e) => {
              // Held open until the write answers, so a refusal is seen.
              e.preventDefault();
              void confirm();
            }}
          >
            {apply.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {counted("applyConfirmOne", "applyConfirmOther", bookings)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
