"use client";

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
import type { Trial } from "@/types/trials";

interface CancelTrialDialogProps {
  trial: Trial;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trial: Trial) => void;
}

export function CancelTrialDialog({
  trial,
  onOpenChange,
  onConfirm,
}: CancelTrialDialogProps) {
  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel trial?</AlertDialogTitle>
          <AlertDialogDescription>
            This ends {trial.facilityName}&apos;s trial immediately and removes
            it from the active trials list. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep trial</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => onConfirm(trial)}
          >
            Cancel trial
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
