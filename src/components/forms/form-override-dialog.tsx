"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  settleFormOverride,
  usePendingFormOverride,
} from "@/lib/forms/override-prompt";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Staff going ahead without a form the facility requires: why.
//
// Mounted once at the root. The booking form, the check-in buttons and the
// approval of a request ask through `withFormOverride`
// (lib/forms/override-prompt.ts) and wait for the answer here: the reason,
// which the server saves as the override, or null when staff go back instead.
// ============================================================================

export function FormOverrideDialogHost() {
  const t = useShellText("header");
  const refusal = usePendingFormOverride();
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  if (!refusal) return null;

  const close = (value: string | null) => {
    setReason("");
    setTried(false);
    settleFormOverride(value);
  };
  const empty = reason.trim() === "";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("formsRequiredTitle")}</DialogTitle>
          <DialogDescription>{t("formsRequiredBody")}</DialogDescription>
        </DialogHeader>

        {refusal.missing.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {refusal.missing.map((form) => (
              <li
                key={`${form.form_id}:${form.pet_id ?? ""}`}
                className="font-semibold"
              >
                {form.pet_name
                  ? t("formForPet")
                      .replace("{form}", form.form_name)
                      .replace("{pet}", form.pet_name)
                  : form.form_name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">{refusal.message}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="form-override-reason">
            {t("formOverrideReasonLabel")}
          </Label>
          <Textarea
            id="form-override-reason"
            value={reason}
            maxLength={500}
            placeholder={t("formOverrideReasonPlaceholder")}
            aria-invalid={tried && empty}
            onChange={(event) => setReason(event.target.value)}
          />
          {tried && empty && (
            <p className="text-destructive text-sm" role="alert">
              {t("formOverrideReasonNeeded")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(null)}>
            {t("keepBookingOpen")}
          </Button>
          <Button
            onClick={() => {
              setTried(true);
              if (!empty) close(reason.trim());
            }}
          >
            {t("bookWithoutForms")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
