"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Membership } from "@/data/services-pricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
  onCancel: () => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  membership,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel subscription</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-950/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 text-amber-700 dark:text-amber-400" />
            <div className="space-y-1">
              <div className="font-medium text-amber-900 dark:text-amber-200">
                End-of-cycle cancellation
              </div>
              <p className="text-amber-900/80 dark:text-amber-200/80">
                {membership?.customerName
                  ? `${membership.customerName}'s `
                  : "This "}
                subscription will remain active until{" "}
                <span className="font-medium">
                  {membership?.nextBillingDate}
                </span>
                . All perks, included items, and discounts continue until then.
                No further charges will be made.
              </p>
            </div>
          </div>
        </div>

        <DialogDescription className="pt-2">
          The subscriber can reactivate before the end date to avoid losing
          benefits. After cancellation, they can re-subscribe at any time.
        </DialogDescription>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep subscription
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onCancel();
              toast.success("Subscription cancelled", {
                description: `Access ends ${membership?.nextBillingDate}`,
              });
              onOpenChange(false);
            }}
          >
            Cancel subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
