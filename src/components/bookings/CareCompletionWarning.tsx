"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDown, Pill, Utensils } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PendingCareItem } from "@/lib/care-completion";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

// ============================================================================
// The question checkout asks when today's meals or doses are not logged.
//
// Translated as it was touched. It also exported an inline banner that nothing
// rendered; that is gone.
//
// Going ahead needs a reason, which the caller saves before checkout opens
// (record_care_gate_override): "Check out anyway" used to leave a toast and
// nothing else.
// ============================================================================

interface CareCompletionDialogProps {
  open: boolean;
  pending: PendingCareItem[];
  hasCritical: boolean;
  onReview: () => void;
  /** Resolves once the reason is saved; the dialog waits for it. */
  onContinueAnyway: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

/** Confirmation that gates checkout when there are pending items. */
export function CareCompletionGateDialog({
  open,
  pending,
  hasCritical,
  onReview,
  onContinueAnyway,
  onClose,
}: CareCompletionDialogProps) {
  const { t, fill } = useStaffText("careGate");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const goAhead = async () => {
    setSaving(true);
    try {
      await onContinueAnyway(reason.trim());
      setReason("");
    } finally {
      setSaving(false);
    }
  };
  // An owner's own item is named as they wrote it; an incident's carries its
  // reference, which never passes through the locale layer (§5r).
  const label = (item: PendingCareItem) =>
    item.incidentId
      ? fill("fromIncident", { item: item.label, id: item.incidentId })
      : item.label;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "size-5 shrink-0",
                hasCritical ? "text-destructive" : "text-warning",
              )}
            />
            {fill(pending.length === 1 ? "titleOne" : "titleMany", {
              n: pending.length,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasCritical ? t("bodyCritical") : t("body")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="border-line mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-2xl border p-3">
          {pending.map((item, i) => {
            const Icon = item.kind === "feeding" ? Utensils : Pill;
            return (
              <li key={i} className="flex items-start gap-2 px-1 py-1">
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    item.isCritical ? "text-destructive" : "text-ink-tertiary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-ink text-sm font-semibold">
                    {label(item)}
                    {item.isCritical && (
                      <span className="text-destructive ml-1.5 text-xs font-bold tracking-[.06em] uppercase">
                        {t("critical")}
                      </span>
                    )}
                  </p>
                  {item.scheduleNote && (
                    <p className="text-ink-tertiary text-xs">
                      {item.scheduleNote}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-1.5">
          <Label htmlFor="care-gate-reason">{t("reasonLabel")}</Label>
          <Textarea
            id="care-gate-reason"
            value={reason}
            maxLength={500}
            rows={2}
            placeholder={t("reasonPlaceholder")}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="text-ink-tertiary text-xs">{t("reasonHelp")}</p>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onClose} disabled={saving}>
            {t("keep")}
          </AlertDialogCancel>
          <Button variant="outline" onClick={onReview} disabled={saving}>
            <ArrowDown className="size-4" />
            {t("review")}
          </Button>
          <Button
            onClick={() => void goAhead()}
            disabled={!reason.trim()}
            loading={saving}
          >
            {t("continue")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
