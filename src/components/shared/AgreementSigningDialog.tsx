"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, PawPrint, User } from "lucide-react";
import { SignaturePad, type SignatureResult } from "./SignaturePad";

interface AgreementSigningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  agreementContent: string;
  requiresWitness?: boolean;
  onSigned: (result: SignatureResult) => void;
  clientName?: string;
  petName?: string;
  serviceName?: string;
}

export function AgreementSigningDialog({
  open,
  onOpenChange,
  title,
  agreementContent,
  requiresWitness = false,
  onSigned,
  clientName,
  petName,
  serviceName,
}: AgreementSigningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        {/* Header */}
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="size-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              {(clientName || petName || serviceName) && (
                <div className="mt-1 flex items-center gap-2">
                  {clientName && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <User className="size-2.5" />
                      {clientName}
                    </Badge>
                  )}
                  {petName && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <PawPrint className="size-2.5" />
                      {petName}
                    </Badge>
                  )}
                  {serviceName && (
                    <Badge variant="outline" className="text-[10px]">
                      {serviceName}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Agreement content */}
        <div className="px-6 pt-4">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Agreement
          </p>
          <ScrollArea className="h-[250px] rounded-xl border bg-slate-50/50">
            <div className="prose prose-sm max-w-none p-5 text-sm/relaxed text-slate-600">
              {agreementContent.split("\n").map((line, i) => {
                if (line.trim() === "") {
                  return <div key={i} className="h-2" aria-hidden="true" />;
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </ScrollArea>
        </div>

        <Separator className="mx-6 mt-4" />

        {/* Signature */}
        <div className="px-6 pt-3 pb-6">
          <SignaturePad
            label="Client Signature"
            witnessMode={requiresWitness}
            onSign={(result) => {
              onSigned(result);
              onOpenChange(false);
            }}
            compact
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
