"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Smartphone, Send, CheckCircle2 } from "lucide-react";
import { EvaluationResultCard } from "@/components/evaluations/EvaluationResultCard";
import { useSettings } from "@/hooks/use-settings";
import type { EvaluationResultCardData } from "@/components/evaluations/EvaluationResultCard";

interface SendEvaluationResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardData: EvaluationResultCardData;
}

export function SendEvaluationResultModal({
  open,
  onOpenChange,
  cardData,
}: SendEvaluationResultModalProps) {
  const { evaluationReportCard } = useSettings();
  const [sendEmail, setSendEmail] = useState(
    evaluationReportCard.notifyViaEmail,
  );
  const [sendSMS, setSendSMS] = useState(evaluationReportCard.notifyViaSMS);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    // Mock send — in production this calls the API
    console.log("Sending evaluation result card", {
      to: cardData.ownerName,
      pet: cardData.petName,
      result: cardData.result,
      channels: { email: sendEmail, sms: sendSMS },
    });
    setSent(true);
  };

  const handleClose = () => {
    setSent(false);
    onOpenChange(false);
  };

  return (
    <Modal
      type="form"
      title="Send Evaluation Result"
      description={`Review and send ${cardData.petName}'s result card to ${cardData.ownerName}`}
      open={open}
      onOpenChange={handleClose}
      size="lg"
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-semibold">Result card sent!</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {cardData.ownerName} has been notified via{" "}
              {[sendEmail && "email", sendSMS && "SMS"]
                .filter(Boolean)
                .join(" and ")}
              .
            </p>
          </div>
          <Button onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Delivery options */}
          <div className="rounded-xl border">
            <p className="border-b px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Send via
            </p>
            <div className="divide-y">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground size-4" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-muted-foreground text-xs">
                      Full result card sent to owner&apos;s email
                    </p>
                  </div>
                </div>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="text-muted-foreground size-4" />
                  <div>
                    <p className="text-sm font-medium">SMS</p>
                    <p className="text-muted-foreground text-xs">
                      Short result notification via text
                    </p>
                  </div>
                </div>
                <Switch checked={sendSMS} onCheckedChange={setSendSMS} />
              </div>
            </div>
          </div>

          {/* Card preview */}
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Card preview
            </p>
            <EvaluationResultCard
              data={cardData}
              config={evaluationReportCard}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!sendEmail && !sendSMS}
              className="gap-2"
            >
              <Send className="size-4" />
              Send Result Card
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
