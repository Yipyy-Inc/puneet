"use client";

import { Fragment } from "react";

import {
  useBookingActionLabel,
  type BookingActionHandlers,
} from "@/components/bookings/booking-actions/BookingActionBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BookingActionId } from "@/lib/bookings/booking-lifecycle";
import {
  isDangerItem,
  type MoreGroup,
  type MoreItem,
} from "@/lib/bookings/details/service-view";

// ============================================================================
// "More ▾", as the mock draws it: a 240px menu of 38px rows, small-capital
// headings for "Send payment link" and "Other", and the two red rows last.
// What it holds is `moreMenu()` — the lifecycle's own answer for this viewer —
// so an item the viewer may not use is not there, not greyed.
// ============================================================================

const OWN_LABELS: Partial<Record<MoreItem, string>> = {
  printBooking: "menuPrintBooking",
  printCareSheet: "menuPrintCareSheet",
  earlyCheckout: "earlyCheckout",
  reschedule: "menuReschedule",
  payLinkEmail: "menuByEmail",
  payLinkSms: "menuByText",
  emailReceipt: "menuEmailReceipt",
  tags: "menuTags",
};

export function DetailsMoreMenu({
  groups,
  handlers,
  petLabel,
  t,
  onEarlyCheckout,
  onTags,
}: {
  groups: MoreGroup[];
  handlers: BookingActionHandlers;
  petLabel: string | null;
  t: (key: string) => string;
  onEarlyCheckout: () => void;
  onTags: () => void;
}) {
  const actionLabel = useBookingActionLabel(petLabel);
  const label = (item: MoreItem) =>
    OWN_LABELS[item]
      ? t(OWN_LABELS[item]!)
      : actionLabel(item as BookingActionId);
  const run = (item: MoreItem) => {
    switch (item) {
      case "printBooking":
        return handlers.onPrintInvoice?.();
      case "printCareSheet":
        return handlers.onPrintCareSheet?.();
      case "earlyCheckout":
        return onEarlyCheckout();
      case "reschedule":
        return handlers.edit?.();
      case "payLinkEmail":
        return handlers.onPayLink?.("email");
      case "payLinkSms":
        return handlers.onPayLink?.("sms");
      case "emailReceipt":
        return handlers.onEmailReceipt?.();
      case "tags":
        return onTags();
      default:
        return handlers[item as BookingActionId]?.();
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" size="bd-44" className="gap-1.5">
          {t("menuMore")}
          <span aria-hidden>▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-line-strong w-60 rounded-[14px] p-1.5 shadow-(--bd-sh-menu)"
      >
        {groups.map((group) => (
          <Fragment key={group.heading ?? "first"}>
            {group.heading ? (
              <DropdownMenuLabel className="text-ink-disabled px-2.5 pt-2.5 pb-1 text-[11px] font-semibold tracking-[.08em] uppercase">
                {t(
                  group.heading === "sendPaymentLink"
                    ? "menuSendPaymentLink"
                    : "menuOther",
                )}
              </DropdownMenuLabel>
            ) : null}
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item}
                variant={isDangerItem(item) ? "destructive" : "default"}
                onSelect={() => run(item)}
                className="text-body-ink focus:bg-surface-inset-2 data-[variant=destructive]:text-bad data-[variant=destructive]:focus:bg-surface-inset-2 data-[variant=destructive]:focus:text-bad min-h-[38px] rounded-[8px] px-2.5 text-[14px]"
              >
                {label(item)}
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
