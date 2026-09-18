"use client";

import { AlertTriangle, ArrowDown, Pill, Utensils } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { PendingCareItem } from "@/lib/care-completion";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

// ============================================================================
// The question checkout asks when today's meals or doses are not logged.
//
// Translated as it was touched. It also exported an inline banner that nothing
// rendered; that is gone.
// ============================================================================

interface CareCompletionDialogProps {
  open: boolean;
  pending: PendingCareItem[];
  hasCritical: boolean;
  onReview: () => void;
  onContinueAnyway: () => void;
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
  // An owner's own item is named as they wrote it; an incident's carries its
  // reference, which never passes through the locale layer (§5r).
  const label = (item: PendingCareItem) =>
    item.incidentId
      ? fill("fromIncident", { item: item.label, id: item.incidentId })
      : item.label;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
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

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onClose}>{t("keep")}</AlertDialogCancel>
          <Button variant="outline" onClick={onReview}>
            <ArrowDown className="size-4" />
            {t("review")}
          </Button>
          <AlertDialogAction onClick={onContinueAnyway}>
            {t("continue")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
