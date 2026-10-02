import type { ReactNode } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// The screen after a booking is made, inside the wizard (the client's mock):
// a mark, what happened ("Booking #94612 created", "Request sent to the
// team", "You’re booked!"), the booking's status as a chip, one sentence of
// what comes next, and the booking in one line. Its footer offers "Start
// another booking".
//
// `attention` (a booking created as pending) turns the mark to the warning
// ink with an exclamation: the booking exists, something is still owed.
// ============================================================================

export function SuccessScreen({
  attention = false,
  title,
  status,
  text,
  summary,
}: {
  attention?: boolean;
  title: string;
  /** A status chip (Badge), already built. */
  status: ReactNode;
  text?: string | null;
  /** The booking in one line — pets, dates, times. */
  summary?: string | null;
}) {
  return (
    <div className="mx-auto my-6 flex max-w-[560px] flex-col items-center gap-3.5 text-center sm:my-10">
      <div
        className={cn(
          "flex size-[72px] items-center justify-center rounded-full",
          attention
            ? "bg-wash-warning text-warning"
            : "bg-wash-success text-success",
        )}
      >
        {attention ? (
          <AlertTriangle className="size-8" aria-hidden />
        ) : (
          <Check className="size-8" strokeWidth={2.5} aria-hidden />
        )}
      </div>
      <h3 className="text-heading text-[24px]/[1.25] font-bold tracking-[-0.02em]">
        {title}
      </h3>
      {status}
      {text ? (
        <p className="text-body text-ink-secondary max-w-[46ch] text-pretty">
          {text}
        </p>
      ) : null}
      {summary ? (
        <p className="border-line bg-card text-body-ink shadow-card rounded-2xl border px-[18px] py-3.5 text-[14px] font-medium">
          {summary}
        </p>
      ) : null}
    </div>
  );
}
