"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Smartphone,
  Send,
  CheckCircle2,
  Pen,
  ShieldCheck,
} from "lucide-react";
import { EvaluationResultCard } from "@/components/evaluations/EvaluationResultCard";
import { useSettings } from "@/hooks/use-settings";
import type { EvaluationResultCardData } from "@/components/evaluations/EvaluationResultCard";
import { AgreementSigningDialog } from "@/components/shared/AgreementSigningDialog";
import type { SignatureResult } from "@/components/shared/SignaturePad";

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
  const [signOpen, setSignOpen] = useState(false);
  const [signature, setSignature] = useState<SignatureResult | null>(null);

  const handleSend = () => {
    console.log("Sending evaluation result card", {
      to: cardData.ownerName,
      pet: cardData.petName,
      result: cardData.result,
      channels: { email: sendEmail, sms: sendSMS },
      evaluatorSignature: signature
        ? {
            signedAt: signature.signedAt,
            ipAddress: signature.ipAddress,
            hasSignature: true,
          }
        : null,
    });
    setSent(true);
  };

  const handleClose = () => {
    setSent(false);
    onOpenChange(false);
  };

  const passed = cardData.result === "pass";
  const agreementText = `I, the undersigned evaluator, confirm that I have conducted a thorough behavioral evaluation of ${cardData.petName} on ${cardData.evaluationDate ? new Date(cardData.evaluationDate).toLocaleDateString() : "today's date"}.

I certify that the evaluation result (${passed ? "PASSED" : "NOT APPROVED"}) accurately reflects my professional assessment of this pet's temperament, behavior, and suitability for the approved services.

This signature serves as official verification that the evaluation was performed following facility protocols and that all observations documented are accurate to the best of my knowledge.`;

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

          {/* Evaluator signature */}
          <div className="rounded-xl border">
            <p className="border-b px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Evaluator Signature
            </p>
            <div className="px-4 py-3">
              {signature ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50">
                      <ShieldCheck className="size-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-700">
                        Signed by {cardData.evaluatorName ?? "Evaluator"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(signature.signedAt).toLocaleString()} · IP:{" "}
                        {signature.ipAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-200 text-emerald-700"
                    >
                      <CheckCircle2 className="size-3" />
                      Verified
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignature(null)}
                    >
                      Re-sign
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Sign to verify this evaluation
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Your digital signature adds legal validity to the result
                      card
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSignOpen(true)}
                  >
                    <Pen className="size-3" />
                    Sign
                  </Button>
                </div>
              )}
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

      {/* Signing dialog */}
      <AgreementSigningDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title="Evaluator Certification"
        agreementContent={agreementText}
        onSigned={(result) => {
          setSignature(result);
          setSignOpen(false);
        }}
        clientName={cardData.evaluatorName}
        petName={cardData.petName}
        serviceName="Evaluation"
      />
    </Modal>
  );
}
