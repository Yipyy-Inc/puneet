"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
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

// Shared clock in/out confirmation UI, used by every surface that can start or
// end a shift (the employee header's ClockInOut and the scheduling TimeClock),
// so the two-step behavior is identical everywhere. Clocking OUT — the
// direction you don't want to trigger by accident — always requires the
// explicit "Yes, clock out" confirm and shows elapsed-time context.

/** "3:42 PM" — falls back to the current moment when no ISO is given. */
export function formatClockTime(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "6h 32m" / "12m" elapsed since `iso` (empty when `iso` is missing). */
export function clockElapsedLabel(
  iso: string | undefined,
  nowMs: number,
): string {
  if (!iso) return "";
  const mins = Math.max(
    0,
    Math.round((nowMs - new Date(iso).getTime()) / 60_000),
  );
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export interface ClockConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** true → confirming a clock-OUT (the dangerous direction). */
  clockedIn: boolean;
  /** Current session start — powers the elapsed-time context on clock-out. */
  clockedInAt?: string;
  /** Whose shift, when a manager acts on someone else (omit for self-service). */
  subjectName?: string;
  /** Run after the explicit confirm; the dialog closes itself. */
  onConfirm: () => void;
}

export function ClockConfirm({
  open,
  onOpenChange,
  clockedIn,
  clockedInAt,
  subjectName,
  onConfirm,
}: ClockConfirmProps) {
  const [now, setNow] = useState(() => Date.now());

  // Keep the elapsed time current while the clock-out dialog is open (an
  // immediate async tick freshens it on open). Async setState in the timer
  // callbacks stays clear of the set-state-in-effect rule.
  useEffect(() => {
    if (!open || !clockedIn) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [open, clockedIn]);

  const title = clockedIn
    ? subjectName
      ? `Clock out ${subjectName}?`
      : "End your shift?"
    : subjectName
      ? `Clock in ${subjectName}?`
      : "Start your shift?";

  const description = clockedIn
    ? subjectName
      ? `This will clock ${subjectName} out. Only confirm if the shift is actually ending.`
      : "This will clock you out. Only confirm if you're actually ending your shift."
    : subjectName
      ? `${subjectName} will be clocked in as of ${formatClockTime(undefined)}.`
      : `You'll be clocked in as of ${formatClockTime(undefined)}.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={
              clockedIn
                ? "flex items-center gap-2 text-red-700 dark:text-red-400"
                : undefined
            }
          >
            {clockedIn && <TriangleAlert className="size-5" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {clockedIn && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-muted-foreground text-sm">
              On the clock since {formatClockTime(clockedInAt)}
            </p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {clockElapsedLabel(clockedInAt, now)} on the clock
            </p>
          </div>
        )}

        {clockedIn ? (
          <AlertDialogFooter className="gap-2">
            <AlertDialogAction
              onClick={onConfirm}
              className="h-9 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
            >
              Yes, clock out
            </AlertDialogAction>
            <AlertDialogCancel className="mt-0 h-11 font-semibold sm:min-w-40">
              {subjectName ? "Cancel" : "Cancel — stay clocked in"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
            >
              Confirm clock in
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
