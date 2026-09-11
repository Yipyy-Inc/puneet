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
import { useEstimateMutations } from "@/lib/api/estimates";
import type { Estimate } from "@/types/booking";
import { useCustomerText } from "@/lib/customer/use-customer-text";

// A reason by CATALOGUE KEY. The one sent to the facility is written in the
// reader's words, like anything else they type; "other" alone sends only
// what they wrote.
const REASONS = [
  "reasonPrice",
  "reasonDates",
  "reasonAnotherOption",
  "reasonChangedMind",
  "reasonOther",
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
  const { t, fill } = useCustomerText("estimates");
  const { respond } = useEstimateMutations();
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

  // Recorded through `respond_to_estimate`, under the customer's name. The
  // dialog used to edit the fixture in place and then toast the FACILITY's
  // notification — with a "Create revised estimate" button that did nothing —
  // at the customer.
  const handleSubmit = async () => {
    if (!selected) return;
    const text = detail.trim();
    const label = t(selected);
    const reason =
      selected === "reasonOther"
        ? text || label
        : text
          ? `${label} — ${text}`
          : label;

    try {
      await respond.mutateAsync({
        id: estimate.id,
        action: "decline",
        reason,
      });
      onDeclined?.(estimate.id);
      setStep("success");
    } catch (error) {
      toast.error(t("declineFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "reason" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("sorryToHear")}</DialogTitle>
              <DialogDescription>
                {fill("letUsKnowWhy", { facility: facilityName })}
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
                  {t(reason)}
                </button>
              ))}
            </div>

            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("anythingElseOptional")}
              rows={2}
              className="min-h-[60px] resize-y text-sm"
            />

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                {t("goBack")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!selected || respond.isPending}
              >
                {t("declineEstimate")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("estimateDeclined")}</DialogTitle>
              <DialogDescription>
                {fill("contactAnytime", { facility: facilityName })}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild className="w-full gap-1.5">
                <Link href="/customer/messages">
                  <MessageSquare className="size-4" />
                  {fill("messageFacility", { facility: facilityName })}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => handleOpenChange(false)}
              >
                {t("close")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
