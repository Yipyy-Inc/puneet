"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const REASONS = [
  "Too expensive",
  "Missing features I need",
  "Switching to another tool",
  "Closing or pausing my business",
  "Not using it enough",
  "Other",
];

export interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-formatted billing-period end date. */
  renewalDate: string;
  planName: string;
  onConfirm: (reason: string) => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  renewalDate,
  planName,
  onConfirm,
}: CancelSubscriptionDialogProps) {
  const [step, setStep] = useState<"reason" | "confirm">("reason");
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");

  const finalReason =
    reason === "Other" && details.trim() ? details.trim() : reason;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep("reason");
      setReason(REASONS[0]);
      setDetails("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "reason" ? (
          <>
            <DialogHeader>
              <DialogTitle>We&apos;re sorry to see you go</DialogTitle>
              <DialogDescription>
                Help us improve — why are you cancelling {planName}?
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={reason}
              onValueChange={setReason}
              className="gap-2"
            >
              {REASONS.map((r) => (
                <Label
                  key={r}
                  htmlFor={`reason-${r}`}
                  className="hover:bg-muted/40 has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/50 flex items-center gap-2 rounded-lg border p-3 text-sm"
                >
                  <RadioGroupItem id={`reason-${r}`} value={r} />
                  {r}
                </Label>
              ))}
            </RadioGroup>

            {reason === "Other" && (
              <Textarea
                placeholder="Tell us more (optional)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Keep my plan
              </Button>
              <Button variant="destructive" onClick={() => setStep("confirm")}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                Confirm cancellation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                Your subscription stays active until{" "}
                <strong>{renewalDate}</strong>. You keep full access until then
                — no further charges — and your account downgrades to the free
                tier afterward.
              </div>
              <p className="text-muted-foreground">Reason: {finalReason}</p>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep("reason")}>
                <ArrowLeft className="mr-1.5 size-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Keep my plan
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onConfirm(finalReason)}
                >
                  Cancel subscription
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
