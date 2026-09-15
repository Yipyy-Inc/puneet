"use client";

import { useState, useSyncExternalStore } from "react";

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
import type { FormRefusal } from "@/lib/forms/requirements";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Staff going ahead without a form the facility requires: why.
//
// Nine staff screens create bookings through `useCreateBookingFromModal`, and a
// hook cannot render a dialog. So the question is asked here, once, mounted at
// the root: the hook calls `askFormOverrideReason` and waits. The answer is the
// reason, which the booking route passes to `create_booking` and the database
// saves as the override, or null when staff go back to the booking instead.
// ============================================================================

interface Pending {
  refusal: FormRefusal;
  resolve: (reason: string | null) => void;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ask for a reason. Resolves with it, or null when staff go back instead. */
export function askFormOverrideReason(
  refusal: FormRefusal,
): Promise<string | null> {
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { refusal, resolve };
    emit();
  });
}

function settle(reason: string | null) {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(reason);
}

export function FormOverrideDialogHost() {
  const t = useShellText("header");
  const current = useSyncExternalStore(
    subscribe,
    () => pending,
    () => null,
  );
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  if (!current) return null;

  const close = (value: string | null) => {
    setReason("");
    setTried(false);
    settle(value);
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

        {current.refusal.missing.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {current.refusal.missing.map((form) => (
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
          <p className="text-sm">{current.refusal.message}</p>
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
