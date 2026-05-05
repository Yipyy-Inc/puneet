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
import { cn } from "@/lib/utils";
import type { PendingCareItem } from "@/lib/care-completion";

interface CareCompletionWarningProps {
  pending: PendingCareItem[];
  hasCritical: boolean;
}

interface CareCompletionDialogProps {
  open: boolean;
  pending: PendingCareItem[];
  hasCritical: boolean;
  onReview: () => void;
  onContinueAnyway: () => void;
  onClose: () => void;
}

/** Inline banner that lives at the top of the InvoicePanel when items are pending. */
export function CareCompletionInlineBanner({
  pending,
  hasCritical,
}: CareCompletionWarningProps) {
  if (pending.length === 0) return null;

  const summary = buildSummary(pending);
  const firstDomId = pending[0]?.domId;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5",
        hasCritical
          ? "border-rose-300 bg-rose-50"
          : "border-amber-300 bg-amber-50",
      )}
      role="alert"
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          hasCritical ? "bg-rose-100" : "bg-amber-100",
        )}
      >
        <AlertTriangle
          className={cn(
            "size-4",
            hasCritical ? "text-rose-700" : "text-amber-700",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs font-semibold",
            hasCritical ? "text-rose-900" : "text-amber-900",
          )}
        >
          {pending.length} care item{pending.length > 1 ? "s" : ""} not logged
          today
          {hasCritical && (
            <span className="ml-1.5 rounded-full bg-rose-200 px-1.5 py-0 text-[9px] font-bold text-rose-900 uppercase tracking-wider">
              Critical
            </span>
          )}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px]",
            hasCritical ? "text-rose-800/80" : "text-amber-800/80",
          )}
        >
          {summary}. Please confirm before checkout.
        </p>
        <button
          type="button"
          onClick={() => scrollToDomId(firstDomId)}
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline",
            hasCritical ? "text-rose-800" : "text-amber-800",
          )}
        >
          Review Care
          <ArrowDown className="size-3" />
        </button>
      </div>
    </div>
  );
}

/** Confirmation modal that gates checkout when there are pending items. */
export function CareCompletionGateDialog({
  open,
  pending,
  hasCritical,
  onReview,
  onContinueAnyway,
  onClose,
}: CareCompletionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "size-5",
                hasCritical ? "text-rose-600" : "text-amber-600",
              )}
            />
            {pending.length} care item{pending.length > 1 ? "s" : ""} not logged
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasCritical
              ? "One or more critical medications haven't been recorded as given today. Please verify before closing this booking out."
              : "These were scheduled for today but haven't been marked complete yet. Make sure they were given before checkout, or confirm the pet didn't need them."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-3">
          {pending.map((item, i) => {
            const Icon = item.kind === "medication" ? Pill : Utensils;
            return (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-background px-2.5 py-1.5"
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    item.isCritical ? "text-rose-600" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">
                    {item.label}
                    {item.isCritical && (
                      <span className="ml-1.5 text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                        Critical
                      </span>
                    )}
                  </p>
                  {item.scheduleNote && (
                    <p className="text-muted-foreground text-[10px]">
                      {item.scheduleNote}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={onReview}>
            <ArrowDown className="size-3.5" />
            Review Care
          </Button>
          <AlertDialogAction
            onClick={onContinueAnyway}
            className={
              hasCritical
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-amber-600 hover:bg-amber-700"
            }
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function buildSummary(pending: PendingCareItem[]): string {
  if (pending.length === 0) return "";
  if (pending.length === 1) return pending[0].label;
  if (pending.length === 2) return `${pending[0].label} and ${pending[1].label}`;
  return `${pending[0].label}, ${pending[1].label}, and ${pending.length - 2} more`;
}

function scrollToDomId(domId: string | undefined): void {
  if (!domId || typeof document === "undefined") return;
  const el = document.getElementById(domId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Brief highlight pulse for visual orientation
  el.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
  setTimeout(() => {
    el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2");
  }, 1800);
}
