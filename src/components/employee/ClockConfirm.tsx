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
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatTime, formatDuration } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";

// Shared clock in/out confirmation UI, used by every surface that can start or
// end a shift (the employee header's ClockInOut and the scheduling TimeClock),
// so the two-step behavior is identical everywhere. Clocking OUT — the
// direction you don't want to trigger by accident — always requires the
// explicit "Yes, clock out" confirm and shows elapsed-time context.

/** `3:42 PM` · `15 h 42` — the current moment when no ISO is given. */
export function formatClockTime(
  iso: string | undefined,
  locale: AppLocale,
): string {
  return formatTime(iso ? new Date(iso) : new Date(), locale);
}

/** `6h 32m` · `6 h 32` elapsed since `iso` (empty when `iso` is missing). */
export function clockElapsedLabel(
  iso: string | undefined,
  nowMs: number,
  locale: AppLocale,
): string {
  if (!iso) return "";
  const mins = Math.max(
    0,
    Math.round((nowMs - new Date(iso).getTime()) / 60_000),
  );
  return formatDuration(mins, locale);
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
  const { t, fill, locale } = useStaffText("clock");
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
      ? fill("clockOutSubject", { name: subjectName })
      : t("endYourShift")
    : subjectName
      ? fill("clockInSubject", { name: subjectName })
      : t("startYourShift");

  const description = clockedIn
    ? subjectName
      ? fill("clockOutSubjectHelp", { name: subjectName })
      : t("clockOutSelfHelp")
    : subjectName
      ? fill("clockInSubjectHelp", {
          name: subjectName,
          time: formatClockTime(undefined, locale),
        })
      : fill("clockInSelfHelp", {
          time: formatClockTime(undefined, locale),
        });

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
              {fill("onTheClockSince", {
                time: formatClockTime(clockedInAt, locale),
              })}
            </p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {fill("onTheClockFor", {
                elapsed: clockElapsedLabel(clockedInAt, now, locale),
              })}
            </p>
          </div>
        )}

        {clockedIn ? (
          <AlertDialogFooter className="gap-2">
            <AlertDialogAction
              onClick={onConfirm}
              className="h-9 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
            >
              {t("yesClockOut")}
            </AlertDialogAction>
            <AlertDialogCancel className="mt-0 h-11 font-semibold sm:min-w-40">
              {subjectName ? t("cancel") : t("cancelStayClockedIn")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
            >
              {t("confirmClockIn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
