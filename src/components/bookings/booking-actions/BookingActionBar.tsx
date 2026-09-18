"use client";

import {
  Banknote,
  Check,
  CircleCheck,
  CircleSlash,
  CircleX,
  CreditCard,
  DoorOpen,
  Ellipsis,
  FileText,
  HandCoins,
  Link2,
  ListPlus,
  MapPin,
  Pencil,
  Plus,
  Printer,
  TriangleAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  BookingAction,
  BookingActionId,
} from "@/lib/bookings/booking-lifecycle";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// The booking page's actions, from the lifecycle — never decided here.
//
// This replaced BookingDetailActionBar, which chose its own buttons from the
// status and a fixture `invoice` blob: Charge Deposit, Take Prepayment and
// No-show hung off that blob and so never appeared on a real booking, and Undo
// Check-In sat on CONFIRMED bookings. What is offered now is exactly
// `availableActions()`, and an action with no handler on this screen is not
// shown rather than shown and inert.
//
// §1: the primary action is the page header's one prominent control (48px);
// everything else is a 40px pill (48 below 1024). §6 rule 5: nothing is
// revealed on hover — the overflow is a visible "More actions" button.
// ============================================================================

export type BookingActionHandlers = Partial<
  Record<BookingActionId, () => void>
> & {
  /** The pay link, by channel — both, or neither. */
  onPayLink?: (channel: "email" | "sms") => void;
  onPrintInvoice?: () => void;
};

const ICON: Record<BookingActionId, LucideIcon> = {
  review_request: CircleCheck,
  waitlist_request: ListPlus,
  decline_request: CircleX,
  confirm: Check,
  undo_confirm: Undo2,
  charge_deposit: Banknote,
  take_prepayment: CreditCard,
  check_in: DoorOpen,
  no_show: CircleSlash,
  check_out: DoorOpen,
  check_out_unpaid: DoorOpen,
  mark_in_progress: CircleCheck,
  mark_ready: CircleCheck,
  undo_check_in: Undo2,
  finish: CircleCheck,
  take_payment: CreditCard,
  split_tips: HandCoins,
  refund: Undo2,
  undo_checkout: Undo2,
  undo_no_show: Undo2,
  reinstate: Undo2,
  edit: Pencil,
  add_item: Plus,
  transfer: MapPin,
  report_incident: TriangleAlert,
  send_pay_link: Link2,
  cancel: CircleX,
};

/** The catalogue key for an action's label. */
const LABEL: Record<BookingActionId, string> = {
  review_request: "reviewRequest",
  waitlist_request: "waitlistRequest",
  decline_request: "declineRequest",
  confirm: "confirm",
  undo_confirm: "undoConfirm",
  charge_deposit: "chargeDeposit",
  take_prepayment: "takePrepayment",
  check_in: "checkIn",
  no_show: "noShow",
  check_out: "checkOut",
  check_out_unpaid: "checkOutUnpaid",
  mark_in_progress: "markInProgress",
  mark_ready: "markReady",
  undo_check_in: "undoCheckIn",
  finish: "finish",
  take_payment: "takePayment",
  split_tips: "splitTips",
  refund: "refund",
  undo_checkout: "undoCheckout",
  undo_no_show: "undoNoShow",
  reinstate: "reinstate",
  edit: "edit",
  add_item: "addItem",
  transfer: "transfer",
  report_incident: "reportIncident",
  send_pay_link: "sendPayLink",
  cancel: "cancel",
};

/** The label naming the pet, for the two actions a pet walks through (§5r). */
const PET_LABEL: Partial<Record<BookingActionId, string>> = {
  check_in: "checkInPet",
  check_out: "checkOutPet",
};

export function BookingActionBar({
  actions,
  handlers,
  petLabel,
}: {
  actions: BookingAction[];
  handlers: BookingActionHandlers;
  /** The pet's name for "Check in Kofi" — §5r, the record's own name. */
  petLabel: string | null;
}) {
  const { t, fill } = useStaffText("bookingActions");

  const label = (id: BookingActionId) => {
    const withPet = PET_LABEL[id];
    if (withPet && petLabel) return fill(withPet, { pet: petLabel });
    return t(LABEL[id]);
  };

  // An action is shown only where this screen can perform it.
  const shown = actions.filter((a) =>
    a.id === "send_pay_link"
      ? Boolean(handlers.onPayLink)
      : Boolean(handlers[a.id]),
  );
  const at = (placement: BookingAction["placement"]) =>
    shown.filter((a) => a.placement === placement);
  const primary = at("primary")[0];
  const secondary = at("secondary");
  const more = at("more");
  const reverse = at("reverse");

  const run = (id: BookingActionId) => handlers[id]?.();

  return (
    <div className="border-line mt-4 space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <Button size="prominent" onClick={() => run(primary.id)}>
            {(() => {
              const Icon = ICON[primary.id];
              return <Icon className="size-5" aria-hidden />;
            })()}
            {label(primary.id)}
          </Button>
        )}

        {secondary.map((a) => {
          const Icon = ICON[a.id];
          return (
            <Button key={a.id} variant="outline" onClick={() => run(a.id)}>
              <Icon className="size-4" aria-hidden />
              {label(a.id)}
            </Button>
          );
        })}

        {handlers.onPrintInvoice && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="size-4" aria-hidden />
                {t("print")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handlers.onPrintInvoice}>
                <FileText className="size-4" aria-hidden />
                {t("printInvoice")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Ellipsis className="size-4" aria-hidden />
                {t("more")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {more.map((a) => {
                const Icon = ICON[a.id];
                if (a.id === "send_pay_link") {
                  return (
                    <div key={a.id}>
                      <DropdownMenuLabel className="text-ink-tertiary text-xs font-bold tracking-[.06em] uppercase">
                        {t("sendPayLink")}
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handlers.onPayLink?.("email")}
                      >
                        <Icon className="size-4" aria-hidden />
                        {t("sendByEmail")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlers.onPayLink?.("sms")}
                      >
                        <Icon className="size-4" aria-hidden />
                        {t("sendByText")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </div>
                  );
                }
                return (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => run(a.id)}
                    className={
                      a.id === "report_incident"
                        ? "text-destructive focus:text-destructive"
                        : undefined
                    }
                  >
                    <Icon className="size-4" aria-hidden />
                    {label(a.id)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {reverse.length > 0 && (
        <div className="border-line flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-ink-tertiary mr-auto text-xs font-bold tracking-[.06em] uppercase">
            {t("reverseHeading")}
          </span>
          {reverse.map((a) => {
            const Icon = ICON[a.id];
            const destructive = a.id === "cancel" || a.id === "decline_request";
            return (
              <Button
                key={a.id}
                variant="ghost"
                className={destructive ? "text-destructive" : undefined}
                onClick={() => run(a.id)}
              >
                <Icon className="size-4" aria-hidden />
                {label(a.id)}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
