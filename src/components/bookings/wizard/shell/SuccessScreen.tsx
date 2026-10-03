import type { ReactNode } from "react";
import { CalendarCheck } from "lucide-react";

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
// Drawn as the booking mock draws it (2026-10-02): the mark is a typed "✓" or
// "!" at 32px, and the booking's line sits on a hairline card, no shadow.
// ============================================================================

export function SuccessScreen({
  attention = false,
  flavour = "booking",
  title,
  status,
  text,
  summary,
}: {
  attention?: boolean;
  /**
   * The evaluation mock draws its own done screen: a rounded square with a
   * calendar check, and an 800-weight title.
   */
  flavour?: "booking" | "evaluation";
  title: string;
  /** A status chip (Badge), already built. */
  status: ReactNode;
  text?: string | null;
  /** The booking in one line — pets, dates, times. */
  summary?: string | null;
}) {
  return (
    <div className="mx-auto my-10 flex max-w-[560px] flex-col items-center gap-3.5 text-center">
      {flavour === "evaluation" && !attention ? (
        <div
          aria-hidden
          className="bg-wash-success text-success flex size-[72px] items-center justify-center rounded-[24px]"
        >
          <CalendarCheck className="size-[38px]" strokeWidth={1.75} />
        </div>
      ) : (
        <div
          aria-hidden
          className={cn(
            "flex size-[72px] items-center justify-center rounded-full text-[32px] leading-none font-bold",
            attention
              ? "bg-wash-warning text-warning"
              : "bg-wash-success text-success",
          )}
        >
          {attention ? "!" : "✓"}
        </div>
      )}
      <h3
        className={cn(
          "text-heading text-[24px]/[1.25] tracking-[-0.02em]",
          flavour === "evaluation" ? "font-extrabold" : "font-bold",
        )}
      >
        {title}
      </h3>
      {status}
      {text ? (
        <p className="text-ink-secondary text-[14.5px] leading-[1.55] font-normal text-pretty">
          {text}
        </p>
      ) : null}
      {summary ? (
        <p className="border-line bg-card text-body-ink rounded-[18px] border px-[18px] py-3.5 text-[14px] font-medium">
          {summary}
        </p>
      ) : null}
    </div>
  );
}
