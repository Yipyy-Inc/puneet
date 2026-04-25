"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  CreditCard,
  Printer,
  Pencil,
  XCircle,
  RotateCcw,
  Copy,
  ChevronDown,
  Mail,
  Smartphone,
  Link2,
  FileText,
  Tag as TagIcon,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/types/booking";
import { EvaluationCheckoutAlert } from "@/components/evaluations/EvaluationCheckoutAlert";
import { useLocationContext } from "@/hooks/use-location-context";

interface BookingActionBarProps {
  booking: Booking;
  onEdit?: () => void;
  onCancel?: () => void;
  onRefund?: () => void;
  onPayment?: () => void;
  onRecordEvaluation?: () => void;
  onTransfer?: () => void;
}

export function BookingActionBar({
  booking,
  onEdit,
  onCancel,
  onRefund,
  onPayment,
  onRecordEvaluation,
  onTransfer,
}: BookingActionBarProps) {
  const { isMultiLocation } = useLocationContext();
  const isActive =
    booking.status === "confirmed" || booking.status === "pending";
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const isPaid = booking.paymentStatus === "paid";

  const isEvaluationBooking =
    booking.serviceType?.toLowerCase().includes("evaluation") ?? false;

  return (
    <div className="space-y-2">
      {isEvaluationBooking && booking.status === "confirmed" && (
        <EvaluationCheckoutAlert
          petName="this pet"
          hasEvaluationToday
          evaluationRecorded={false}
          onRecordResult={onRecordEvaluation}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {/* Send Invoice */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Send className="size-3.5" />
              Send Invoice
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => toast.success("Invoice sent via email")}
            >
              <Mail className="size-4" />
              Send via Email
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.success("Invoice sent via SMS")}
            >
              <Smartphone className="size-4" />
              Send via SMS
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/invoices/${booking.id}`,
                );
                toast.success("Invoice link copied");
              }}
            >
              <Link2 className="size-4" />
              Copy Invoice Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Accept Payment */}
        {!isPaid && !isCancelled && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (onPayment) onPayment();
              else toast.info("Payment modal would open");
            }}
          >
            <CreditCard className="size-3.5" />
            Accept Payment
          </Button>
        )}

        {/* Print */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="size-3.5" />
              Print
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => toast.info("Print invoice/receipt")}
            >
              <FileText className="size-4" />
              Invoice / Receipt
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Print boarding sheet")}
            >
              <FileText className="size-4" />
              Boarding Sheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Print kennel label")}>
              <TagIcon className="size-4" />
              Kennel Label
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit */}
        {isActive && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (onEdit) onEdit();
              else toast.info("Edit modal would open");
            }}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}

        {/* Early Checkout */}
        {booking.status === "confirmed" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Early checkout flow would start")}
          >
            <LogOut className="size-3.5" />
            Checkout
          </Button>
        )}

        {/* Cancel */}
        {isActive && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive gap-1.5"
            onClick={() => {
              if (onCancel) onCancel();
              else toast.info("Cancel modal would open");
            }}
          >
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        )}

        {/* Refund */}
        {isPaid && !isCancelled && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (onRefund) onRefund();
              else toast.info("Refund modal would open");
            }}
          >
            <RotateCcw className="size-3.5" />
            Refund
          </Button>
        )}

        {/* Transfer — multi-location only */}
        {isMultiLocation && !isCancelled && isActive && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (onTransfer) onTransfer();
              else toast.info("Transfer booking to another location");
            }}
          >
            <ArrowLeftRight className="size-3.5" />
            Transfer
          </Button>
        )}

        {/* Duplicate */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Duplicate booking created in draft")}
        >
          <Copy className="size-3.5" />
          Duplicate
        </Button>
      </div>
    </div>
  );
}
