"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentCount: number;
  missingRatingsCount: number;
  onConfirm: () => void;
}

export function SessionCompleteConfirmDialog({
  open,
  onOpenChange,
  presentCount,
  missingRatingsCount,
  onConfirm,
}: Props) {
  const hasMissing = missingRatingsCount > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {hasMissing ? (
              <>
                <AlertTriangle className="size-5 text-amber-500" />
                Some ratings are missing
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5 text-emerald-600" />
                Complete this session?
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm/relaxed">
            {hasMissing ? (
              <>
                <span className="font-semibold text-amber-700">
                  {missingRatingsCount} dog-exercise rating
                  {missingRatingsCount === 1 ? "" : "s"}
                </span>{" "}
                {missingRatingsCount === 1 ? "is" : "are"} still un-rated. You
                can go back to finish them, or complete the session anyway —
                un-rated dog-exercise pairs simply won&#39;t feed the progress
                chart.
              </>
            ) : (
              <>
                A draft report card will be created for each of the{" "}
                <span className="font-semibold">
                  {presentCount} present student{presentCount === 1 ? "" : "s"}
                </span>
                , and you&#39;ll be prompted to assign homework for the week.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full sm:w-auto"
          >
            {hasMissing ? "Go back and rate" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {hasMissing ? "Complete anyway" : "Complete session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
