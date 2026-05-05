"use client";

import {
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Send,
  ShoppingBag,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Booking, Invoice } from "@/types/booking";

export interface DestructiveConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export interface BookingDetailActionBarProps {
  booking: Booking;
  invoice: Invoice | undefined;
  isPaid: boolean;
  isCancelled: boolean;
  isEstimateSent: boolean;
  multiLocation: boolean;

  // Primary
  onCheckIn: () => void;
  onProceedToCheckout: () => void;
  onTakePayment: () => void;
  onConfirmBooking: () => void;

  // Secondary
  onEdit: () => void;
  onAddItem: () => void;
  onSendEstimate: () => void;
  onChargeDeposit: () => void;
  onTakePrepayment: () => void;
  onPrintInvoice: () => void;
  onPrintCareSheet: () => void;
  onEmailInvoice: () => void;
  onSmsLink: () => void;

  // More menu
  onTransfer: () => void;
  onMarkAsReady: () => void;
  onEarlyCheckout: () => void;
  onFinishWithoutPayment: () => void;
  onSplitTips: () => void;
  onIssueRefund: () => void;

  // Destructive
  requestDestructiveConfirm: (payload: DestructiveConfirmRequest) => void;
  onCancelBooking: () => void;
}

type PrimaryAction = {
  label: string;
  icon: typeof CheckCircle2;
  onClick: () => void;
  tone: "primary" | "emerald";
} | null;

function getPrimaryAction(
  booking: Booking,
  isPaid: boolean,
  isCancelled: boolean,
  handlers: Pick<
    BookingDetailActionBarProps,
    "onCheckIn" | "onProceedToCheckout" | "onTakePayment" | "onConfirmBooking"
  >,
): PrimaryAction {
  if (isCancelled) return null;
  if (isPaid) return null;

  const status = booking.status;

  if (status === "pending" || status === "request_submitted") {
    return {
      label: "Confirm Booking",
      icon: CheckCircle2,
      onClick: handlers.onConfirmBooking,
      tone: "primary",
    };
  }
  if (status === "confirmed") {
    return {
      label: "Check In",
      icon: CheckCircle2,
      onClick: handlers.onCheckIn,
      tone: "primary",
    };
  }
  if (
    status === "checked_in" ||
    status === "in_progress" ||
    status === "ready"
  ) {
    return {
      label: "Proceed to Checkout",
      icon: CreditCard,
      onClick: handlers.onProceedToCheckout,
      tone: "primary",
    };
  }
  if (status === "completed") {
    return {
      label: "Take Payment",
      icon: CreditCard,
      onClick: handlers.onTakePayment,
      tone: "emerald",
    };
  }
  return null;
}

export function BookingDetailActionBar(props: BookingDetailActionBarProps) {
  const {
    booking,
    invoice,
    isPaid,
    isCancelled,
    isEstimateSent,
    multiLocation,
  } = props;

  const primary = getPrimaryAction(booking, isPaid, isCancelled, props);
  const isCompleted = booking.status === "completed";
  const isOpenForEdits = !isCancelled && !isCompleted && !isPaid;

  const showSendEstimate = invoice?.status === "estimate";
  const showChargeDeposit =
    invoice?.status === "estimate" &&
    !isCancelled &&
    (invoice?.depositCollected ?? 0) === 0;
  const remainingDue = invoice?.remainingDue ?? 0;
  const showTakePrepayment =
    !isCancelled &&
    !isPaid &&
    invoice?.status !== "closed" &&
    remainingDue > 0;
  const showMarkAsReady =
    booking.status === "confirmed" ||
    booking.status === "pending" ||
    booking.status === "checked_in" ||
    booking.status === "in_progress";
  const showFinishWithoutPayment = !isPaid && !isCancelled && !isCompleted;
  const showTransfer = multiLocation && !isCancelled && !isCompleted;
  const showEarlyCheckout =
    booking.status === "confirmed" ||
    booking.status === "checked_in" ||
    booking.status === "in_progress" ||
    booking.status === "ready";
  const showSplitTips = isPaid && !isCancelled;
  const showRefund = isPaid && !isCancelled;

  const showUndoCheckIn = booking.status === "confirmed";
  const showUndoConfirm = booking.status === "confirmed";
  const showUndoCheckout = isCompleted && !isCancelled;
  const showNoShow =
    !isCancelled && !isCompleted && (invoice?.depositCollected ?? 0) > 0;
  const showCancel = !isCancelled && !isCompleted;

  const hasDestructive =
    showUndoCheckIn ||
    showUndoConfirm ||
    showUndoCheckout ||
    showNoShow ||
    showCancel;

  const hasMoreItems =
    showSendEstimate ||
    showMarkAsReady ||
    showEarlyCheckout ||
    showFinishWithoutPayment ||
    showTransfer ||
    showSplitTips ||
    showRefund;

  const requestConfirm = props.requestDestructiveConfirm;

  return (
    <div className="border-border/50 mt-4 space-y-3 border-t pt-4">
      {/* Row 1 — Primary action */}
      {primary && (
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            onClick={primary.onClick}
            className={cn(
              "h-11 flex-1 gap-2 text-sm font-semibold sm:flex-none sm:min-w-[240px]",
              primary.tone === "emerald" &&
                "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            <primary.icon className="size-4" />
            {primary.label}
            <ChevronRight className="size-4 opacity-70" />
          </Button>
        </div>
      )}

      {/* Row 2 — Secondary actions */}
      <div className="flex flex-wrap items-center gap-2">
        {isOpenForEdits && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={props.onEdit}
          >
            <Pencil className="size-3.5" />
            Edit Booking
          </Button>
        )}
        {isOpenForEdits && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={props.onAddItem}
          >
            <ShoppingBag className="size-3.5" />
            Add Item
          </Button>
        )}
        {showChargeDeposit && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={props.onChargeDeposit}
          >
            <Banknote className="size-3.5" />
            Charge Deposit
          </Button>
        )}
        {showTakePrepayment && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-emerald-300 text-xs text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            onClick={props.onTakePrepayment}
          >
            <CreditCard className="size-3.5" />
            Take Prepayment
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Send className="size-3.5" />
              Send
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={props.onEmailInvoice}>
              <Mail className="size-4" />
              Email Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onSmsLink}>
              <Smartphone className="size-4" />
              SMS Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Printer className="size-3.5" />
              Print
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={props.onPrintInvoice}>
              <FileText className="size-4" />
              Invoice / Receipt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={props.onPrintCareSheet}>
              <ClipboardList className="size-4" />
              Care Sheet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More — tertiary actions */}
        {hasMoreItems && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <MoreHorizontal className="size-3.5" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {showSendEstimate && (
                <DropdownMenuItem onClick={props.onSendEstimate}>
                  <Send className="size-4" />
                  {isEstimateSent ? "Resend Estimate" : "Send Estimate"}
                </DropdownMenuItem>
              )}
              {showMarkAsReady && (
                <DropdownMenuItem onClick={props.onMarkAsReady}>
                  <CheckCircle2 className="size-4" />
                  Mark as Ready
                </DropdownMenuItem>
              )}
              {showEarlyCheckout && (
                <DropdownMenuItem onClick={props.onEarlyCheckout}>
                  <LogOut className="size-4" />
                  Early Checkout
                </DropdownMenuItem>
              )}
              {showFinishWithoutPayment && (
                <DropdownMenuItem onClick={props.onFinishWithoutPayment}>
                  <CheckCircle2 className="size-4" />
                  Finish Without Payment
                </DropdownMenuItem>
              )}
              {showTransfer && (
                <DropdownMenuItem onClick={props.onTransfer}>
                  <ArrowLeftRight className="size-4" />
                  Transfer to Location
                </DropdownMenuItem>
              )}
              {showSplitTips && (
                <DropdownMenuItem onClick={props.onSplitTips}>
                  <Banknote className="size-4" />
                  Split Tips
                </DropdownMenuItem>
              )}
              {showRefund && (
                <DropdownMenuItem onClick={props.onIssueRefund}>
                  <RotateCcw className="size-4" />
                  Issue Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Row 3 — Destructive actions, separated, muted */}
      {hasDestructive && (
        <div className="border-border/40 flex flex-wrap items-center gap-1.5 border-t pt-3">
          <span className="text-muted-foreground/70 mr-auto text-[10px] font-semibold tracking-wider uppercase">
            Reverse / Cancel
          </span>

          {showUndoCheckIn && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 gap-1.5 text-[11px]"
              onClick={() =>
                requestConfirm({
                  title: "Undo check-in?",
                  description:
                    "This reverts the booking back to Confirmed. Any deposit collected will remain on file.",
                  confirmLabel: "Undo Check-In",
                  onConfirm: () =>
                    toast.success(
                      "Check-in undone — status reverted to Confirmed. Deposit remains collected.",
                    ),
                })
              }
            >
              <RotateCcw className="size-3" />
              Undo Check-In
            </Button>
          )}
          {showUndoConfirm && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 gap-1.5 text-[11px]"
              onClick={() =>
                requestConfirm({
                  title: "Undo confirmation?",
                  description:
                    "This reverts the booking to Pending. Any deposit collected stays on file.",
                  confirmLabel: "Undo Confirm",
                  onConfirm: () =>
                    toast.success(
                      "Confirmation undone — status reverted to Pending. Deposit remains collected.",
                    ),
                })
              }
            >
              <RotateCcw className="size-3" />
              Undo Confirm
            </Button>
          )}
          {showUndoCheckout && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 gap-1.5 text-[11px]"
              onClick={() =>
                requestConfirm({
                  title: "Undo checkout?",
                  description: isPaid
                    ? "This reverts the booking to Confirmed. Payment is already recorded — issue a refund separately if needed."
                    : "This reverts the booking to Confirmed.",
                  confirmLabel: "Undo Checkout",
                  onConfirm: () =>
                    toast.success(
                      "Checkout undone — status reverted to Confirmed",
                      {
                        description: isPaid
                          ? "Payment is already recorded — issue a refund separately if needed."
                          : undefined,
                      },
                    ),
                })
              }
            >
              <RotateCcw className="size-3" />
              Undo Checkout
            </Button>
          )}
          {showNoShow && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-amber-700 hover:bg-amber-50 h-7 gap-1.5 text-[11px]"
              onClick={() =>
                requestConfirm({
                  title: "Mark as no-show?",
                  description: `The collected deposit of $${(invoice?.depositCollected ?? 0).toFixed(2)} will be forfeited as a no-show fee. This cannot be undone.`,
                  confirmLabel: "Confirm No-Show",
                  onConfirm: () =>
                    toast.success(
                      `No-show recorded — deposit of $${(invoice?.depositCollected ?? 0).toFixed(2)} forfeited as no-show fee`,
                    ),
                })
              }
            >
              <RotateCcw className="size-3" />
              No-Show
            </Button>
          )}
          {showCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 gap-1.5 text-[11px]"
              onClick={() =>
                requestConfirm({
                  title: "Cancel this booking?",
                  description:
                    "The client will be notified. Refund and deposit handling will be applied based on your cancellation policy.",
                  confirmLabel: "Cancel Booking",
                  onConfirm: props.onCancelBooking,
                })
              }
            >
              <XCircle className="size-3" />
              Cancel Booking
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
