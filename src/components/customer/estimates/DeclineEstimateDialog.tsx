"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { declineEstimate } from "@/lib/estimates/decline-estimate";
import type { Estimate } from "@/types/booking";

const REASONS = [
  "Price too high",
  "Dates no longer work",
  "Found another option",
  "Changed my mind",
  "Other",
] as const;

interface Props {
  estimate: Estimate;
  facilityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeclined?: (estimateId: string) => void;
}

export function DeclineEstimateDialog({
  estimate,
  facilityName,
  open,
  onOpenChange,
  onDeclined,
}: Props) {
  const [step, setStep] = useState<"reason" | "success">("reason");
  const [selected, setSelected] = useState<string>("");
  const [detail, setDetail] = useState("");

  const reset = () => {
    setStep("reason");
    setSelected("");
    setDetail("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const text = detail.trim();
    const reason =
      selected === "Other"
        ? text || "Other"
        : text
          ? `${selected} — ${text}`
          : selected;

    declineEstimate(estimate, { reason, now: new Date() });

    // Facility notification (mock) with a quick action to revise the estimate.
    const petLabel =
      estimate.petNames.length > 0
        ? estimate.petNames.join(", ")
        : (estimate.guestPetInfo?.name ?? "their pet");
    toast(
      `${estimate.clientName} declined Estimate ${estimate.estimateId}. Reason: ${reason}.`,
      {
        description: `${estimate.service} for ${petLabel}`,
        action: {
          label: "Create Revised Estimate",
          onClick: () => {
            /* facility opens the revised-estimate composer */
          },
        },
      },
    );

    onDeclined?.(estimate.id);
    setStep("success");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "reason" ? (
          <>
            <DialogHeader>
              <DialogTitle>We&apos;re sorry to hear that.</DialogTitle>
              <DialogDescription>
                Let us know why so {facilityName} can better help you.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelected(reason)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all",
                    selected === reason
                      ? "border-slate-800 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                      selected === reason
                        ? "border-slate-800"
                        : "border-slate-300",
                    )}
                  >
                    {selected === reason && (
                      <span className="size-2 rounded-full bg-slate-800" />
                    )}
                  </span>
                  {reason}
                </button>
              ))}
            </div>

            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Anything else you'd like to add? (optional)"
              rows={2}
              className="min-h-[60px] resize-y text-sm"
            />

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!selected}
              >
                Decline Estimate
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Your estimate has been declined.</DialogTitle>
              <DialogDescription>
                You can contact {facilityName} anytime if you have questions or
                change your mind.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild className="w-full gap-1.5">
                <Link href="/customer/messages">
                  <MessageSquare className="size-4" />
                  Message {facilityName}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
