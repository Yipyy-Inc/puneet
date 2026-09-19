"use client";

import { Check, Hourglass, PencilLine, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { BookingRequest } from "@/types/booking";

export interface BookingRequestActionHandlers {
  /** Opens the request in the booking form to price and adjust it. */
  onReview: (req: BookingRequest) => void;
  /** Approves every day of it at the price the customer was quoted. */
  onApproveAtQuote?: (req: BookingRequest) => void;
  onWaitlist?: (req: BookingRequest) => void;
  onDecline: (req: BookingRequest) => void;
}

/**
 * What staff can do with a customer's request — the card and its detail
 * dialog offer the same four, worded the same.
 *
 * "Approve at $X" leads when the customer's form quoted a price: it is the
 * usual answer, and one click. "Review and approve" opens the booking form to
 * change the price, the times or the room first. The buttons are the one
 * action colour (§1) — they were emerald, amber and red, colours the system
 * gives to STATES, not to actions.
 */
export function BookingRequestActions({
  request,
  variant,
  busy,
  onReview,
  onApproveAtQuote,
  onWaitlist,
  onDecline,
}: BookingRequestActionHandlers & {
  request: BookingRequest;
  variant: "pending" | "waitlist";
  busy?: boolean;
}) {
  const { t, fill, locale } = useStaffText("bookingRequests");
  const quote = request.quote ?? null;
  const pet = request.petName || `#${request.id}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => onDecline(request)}
        aria-label={fill("declineRequestOf", { pet })}
      >
        <X className="size-4" />
        {t("declineAction")}
      </Button>
      {onWaitlist && variant === "pending" && (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onWaitlist(request)}
        >
          <Hourglass className="size-4" />
          {t("waitlistAction")}
        </Button>
      )}
      <Button
        variant={quote !== null && onApproveAtQuote ? "outline" : "default"}
        size="sm"
        disabled={busy}
        onClick={() => onReview(request)}
      >
        <PencilLine className="size-4" />
        {t("reviewAndApprove")}
      </Button>
      {quote !== null && onApproveAtQuote && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => onApproveAtQuote(request)}
        >
          <Check className="size-4" />
          {fill("approveAtQuote", { price: formatMoney(quote, locale) })}
        </Button>
      )}
    </div>
  );
}
