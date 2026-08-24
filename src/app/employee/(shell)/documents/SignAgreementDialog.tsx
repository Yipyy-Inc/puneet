"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { useSignAgreement } from "@/lib/api/staff-documents";
import type { MyAgreement } from "@/app/api/staff-onboarding/my-agreements/route";

// ============================================================================
// Signing an employment agreement, for real.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `EmployeeDocumentSigningDialog`, whose `onComplete` added an id to a React
// `useState` Set and raised a toast reading "Document signed". The drawn
// signature, the typed name and every field value were discarded. The staff
// member saw a confirmation; nothing was recorded anywhere.
//
// ── IT COLLECTS ONLY WHAT IS STORED ───────────────────────────────────────
//
// The old dialog gathered a page of fields — address, SIN, start date — and
// `staff_signatures` has nowhere to put them. Asking somebody for their social
// insurance number and then dropping it is worse than not asking. So this
// collects exactly the two things the record holds: the name they assert, and
// the mark they draw.
//
// ── AND IT DOES NOT SEND THE WORDS ────────────────────────────────────────
//
// The agreement text shown here is for READING. `/api/staff-signatures`
// re-reads it from the task and copies THAT into the record — a request that
// supplied its own text would let the signing party choose what the record says
// they agreed to. The dialog cannot influence it, by design.
// ============================================================================

export function SignAgreementDialog({
  agreement,
  staffId,
  onClose,
}: {
  agreement: MyAgreement | null;
  staffId: string;
  onClose: () => void;
}) {
  const sign = useSignAgreement();
  const [typedName, setTypedName] = useState("");
  const [drawn, setDrawn] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setTypedName("");
    setDrawn(undefined);
    setError(null);
    onClose();
  };

  const submit = () => {
    const name = typedName.trim();
    if (!name) {
      setError("Type your full name to sign.");
      return;
    }
    if (!agreement) return;
    setError(null);

    sign.mutate(
      {
        staffId,
        taskKey: agreement.taskKey,
        signatureName: name,
        signatureData: drawn,
      },
      {
        onSuccess: () => {
          toast.success("Signature recorded", {
            description:
              "A copy of the agreement as it reads today was stored with it.",
          });
          close();
        },
        // Stays open on failure, holding what was typed. A signature that
        // silently failed is the defect this screen exists to remove.
        onError: (err) =>
          setError(
            err instanceof Error
              ? err.message
              : "Could not record that signature.",
          ),
      },
    );
  };

  return (
    <Dialog
      open={Boolean(agreement)}
      onOpenChange={(next) => !next && !sign.isPending && close()}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agreement?.name ?? "Agreement"}</DialogTitle>
          <DialogDescription>
            Read it in full. Signing stores a copy of these exact words with
            your signature, so it stays readable even if the agreement is
            changed later.
          </DialogDescription>
        </DialogHeader>

        {agreement && (
          <div className="space-y-4">
            <div className="bg-muted/40 max-h-64 overflow-y-auto rounded-md border p-4">
              <p className="text-sm whitespace-pre-wrap">
                {agreement.agreementText}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature-name">Your full name</Label>
              <Input
                id="signature-name"
                value={typedName}
                autoComplete="name"
                placeholder="As it should appear on the record"
                onChange={(e) => setTypedName(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {/* signed_by is the identity; this is the assertion. */}
                Your account is recorded separately — this is the name you are
                signing under.
              </p>
            </div>

            <SignaturePad
              label="Draw your signature (optional)"
              onSign={(result) => setDrawn(result.signatureData)}
              onClear={() => setDrawn(undefined)}
              disabled={sign.isPending}
              compact
            />

            {error && (
              <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={close}
                disabled={sign.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={sign.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {sign.isPending ? "Recording…" : "Sign this agreement"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
