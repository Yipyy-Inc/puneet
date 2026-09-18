"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type {
  BookingAction,
  BookingActionId,
} from "@/lib/bookings/booking-lifecycle";
import { useStaffText } from "@/lib/staff/use-staff-text";

import {
  bookingActionIcon,
  useBookingActionLabel,
  type BookingActionHandlers,
} from "./BookingActionBar";

// ============================================================================
// The status chip beside the booking's number, and what it can move to.
//
// It replaced BookingStatusDropdown, which offered every status from every
// status with no permission check: "Cancelled" skipped the refund and the
// reason, "Completed" skipped the payment, "Checked in" skipped the forms and
// the boards, and its confirmations promised a no-show fee and client
// notifications that nothing sends. The menu is now the status-changing
// subset of the same lifecycle actions the bar offers, running the same
// handlers — cancel opens the cancel dialog, checking out opens the till.
// With nothing this viewer may change, it is the chip alone.
// ============================================================================

const STATUS_MOVES: BookingActionId[] = [
  "confirm",
  "waitlist_request",
  "decline_request",
  "check_in",
  "mark_in_progress",
  "mark_ready",
  "check_out",
  "finish",
  "no_show",
  "undo_confirm",
  "undo_check_in",
  "undo_checkout",
  "undo_no_show",
  "reinstate",
  "cancel",
];

export function BookingStatusMenu({
  status,
  actions,
  handlers,
  petLabel,
}: {
  status: string;
  actions: BookingAction[];
  handlers: BookingActionHandlers;
  petLabel: string | null;
}) {
  const { t } = useStaffText("bookingActions");
  const label = useBookingActionLabel(petLabel);
  const moves = STATUS_MOVES.filter(
    (id) => actions.some((a) => a.id === id) && Boolean(handlers[id]),
  );
  const chip = <StatusBadge type="status" value={status} size="lg" />;
  if (moves.length === 0) return chip;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("changeStatus")}
          className="focus-visible:outline-primary inline-flex min-h-10 items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 max-lg:min-h-12"
        >
          {chip}
          <ChevronDown className="text-ink-disabled size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {moves.map((id) => {
          const Icon = bookingActionIcon(id);
          return (
            <DropdownMenuItem
              key={id}
              onClick={handlers[id]}
              className={
                id === "cancel" || id === "decline_request"
                  ? "text-destructive focus:text-destructive"
                  : undefined
              }
            >
              <Icon className="size-4" aria-hidden />
              {label(id)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
