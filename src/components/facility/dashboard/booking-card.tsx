"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bed,
  GraduationCap,
  Home,
  LogIn,
  LogOut,
  PawPrint,
  Phone,
  Scissors,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagList } from "@/components/shared/TagList";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { cn } from "@/lib/utils";
import { clients } from "@/data/clients";
import { getBookingOverviewHref } from "@/lib/booking-overview-route";
import {
  getPetImage,
  type UnifiedBooking,
  useUnifiedBookings,
} from "@/hooks/use-unified-bookings";
import { CheckInDialog } from "@/components/facility/dashboard/check-in-dialog";
import {
  CheckOutDialog,
  type EarlyCheckoutAdjustment,
} from "@/components/facility/dashboard/check-out-dialog";
import { PaymentCheckoutFlow } from "@/components/bookings/PaymentCheckoutFlow";
import { reportCardConfig } from "@/data/settings";
import {
  computeLatePickupFee,
  type LateFeeResult,
} from "@/lib/late-pickup-fee";

const findClient = (petId: number) =>
  clients.find((c) => c.pets.some((p) => p.id === petId));

interface BookingCardProps {
  booking: UnifiedBooking;
  primaryAction?: "check-in" | "check-out" | "none";
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ServiceBadge({ booking }: { booking: UnifiedBooking }) {
  const builtInIcons: Record<string, typeof Sun> = {
    daycare: Sun,
    boarding: Bed,
    grooming: Scissors,
    training: GraduationCap,
  };
  const Icon = builtInIcons[booking.serviceKey];

  return (
    <span
      data-color={booking.serviceColor}
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium"
      style={{
        color: booking.serviceColor,
        borderColor: `${booking.serviceColor}40`,
        backgroundColor: `${booking.serviceColor}12`,
      }}
    >
      {Icon ? (
        <Icon className="size-3" />
      ) : (
        <DynamicIcon name={booking.serviceIcon} className="size-3" />
      )}
      {booking.serviceLabel}
    </span>
  );
}

export function BookingCard({
  booking,
  primaryAction = "none",
}: BookingCardProps) {
  const router = useRouter();
  const { updateStatus } = useUnifiedBookings();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    timestamp: string;
    earlyCheckout?: EarlyCheckoutAdjustment;
  } | null>(null);
  const [pendingLateFee, setPendingLateFee] = useState<LateFeeResult | null>(
    null,
  );
  const [reportCardSent, setReportCardSent] = useState(false);
  const client = findClient(booking.petId);
  const petImage = getPetImage(booking.petId);
  const petHref = client
    ? `/facility/dashboard/clients/${client.id}/pets/${booking.petId}`
    : "#";
  const ownerHref = client
    ? `/facility/dashboard/clients/${client.id}`
    : undefined;

  const handleOpen = () => {
    const href = getBookingOverviewHref({
      petId: booking.petId,
      clientId: booking.ownerId,
      service: booking.serviceKey,
    });
    if (href) {
      router.push(href);
      return;
    }
    if (client) {
      router.push(`/facility/dashboard/clients/${client.id}/bookings`);
      return;
    }
    toast.error("No booking overview found for this card");
  };

  const handleCheckInClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckInOpen(true);
  };

  const handleCheckInConfirm = ({
    timestamp,
    noShow,
  }: {
    timestamp: string;
    noShow: boolean;
  }) => {
    updateStatus(booking.id, noShow ? "checked-out" : "checked-in", {
      timestamp,
      noShow,
    });
  };

  const handleCheckOutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckOutOpen(true);
  };

  const handleCheckOutConfirm = ({
    timestamp,
    earlyCheckout,
  }: {
    timestamp: string;
    earlyCheckout?: EarlyCheckoutAdjustment;
  }) => {
    const lateFee = computeLatePickupFee({
      serviceId: booking.serviceKey,
      scheduledEndIso: booking.scheduledEnd,
      actualEndIso: timestamp,
      basePrice: booking.price ?? 0,
    });
    if (lateFee) {
      toast.warning(
        `Late pickup: ${lateFee.minutesLate} min over — $${lateFee.amount.toFixed(2)} fee added`,
      );
    }
    setPendingCheckout({ timestamp, earlyCheckout });
    setPendingLateFee(lateFee);
    setCheckOutOpen(false);
    setPaymentOpen(true);
  };

  const handlePaymentConfirm = (payment: {
    method: string;
    amount: number;
    tip: number;
    includedInvoices?: string[];
  }) => {
    if (!pendingCheckout) return;
    updateStatus(booking.id, "checked-out", {
      timestamp: pendingCheckout.timestamp,
      earlyCheckout: pendingCheckout.earlyCheckout,
    });
    setPendingCheckout(null);
    setPendingLateFee(null);

    const extra = payment.includedInvoices?.length
      ? ` + ${payment.includedInvoices.length} other invoices`
      : "";
    toast.success(
      `Charged $${payment.amount.toFixed(2)} via ${payment.method}${payment.tip > 0 ? ` + $${payment.tip.toFixed(2)} tip` : ""}${extra}`,
    );

    if (!reportCardSent) {
      const mode = reportCardConfig.autoSend.mode;
      if (mode === "immediate" || mode === "checkout") {
        toast.success(`Report card sent to ${booking.ownerName}`);
        setReportCardSent(true);
      } else if (mode === "scheduled") {
        toast.success(
          `Report card scheduled for ${reportCardConfig.autoSend.sendTime ?? "18:00"}`,
        );
        setReportCardSent(true);
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className={cn(
        "group relative flex h-full cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-all",
        "hover:border-border hover:shadow-sm",
        "data-[status=checked-out]:opacity-80",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      data-status={booking.status}
    >
      {/* Info region — layout only, click handled by outer card */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={petHref}
          onClick={(e) => e.stopPropagation()}
          className="relative block size-12 shrink-0"
        >
          {petImage ? (
            <div className="size-12 overflow-hidden rounded-2xl ring-2 ring-background">
              <Image
                src={petImage}
                alt={booking.petName}
                width={48}
                height={48}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl ring-2 ring-background">
              <PawPrint className="size-5" />
            </div>
          )}
          {booking.isGoingHomeToday && booking.status === "checked-in" && (
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-violet-500 ring-2 ring-background">
              <Home className="size-2.5 text-white" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Link
              href={petHref}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 truncate text-sm font-semibold leading-none hover:underline"
            >
              {booking.petName}
            </Link>
            <ServiceBadge booking={booking} />
            <TagList
              entityType="pet"
              entityId={booking.petId}
              compact
              maxVisible={1}
              className="shrink-0 flex-nowrap"
            />
          </div>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {ownerHref ? (
              <Link
                href={ownerHref}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-foreground hover:underline"
              >
                {booking.ownerName}
              </Link>
            ) : (
              booking.ownerName
            )}
            <span className="mx-1.5">·</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {booking.ownerPhone}
            </span>
          </p>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {booking.resourceLabel && (
              <>
                <span className="font-medium text-foreground/80">
                  {booking.resourceLabel}
                </span>
                <span className="mx-1.5">·</span>
              </>
            )}
            {booking.status === "scheduled" ? (
              <>
                Arrives {formatTime(booking.scheduledStart)}
                {booking.source === "boarding" &&
                  ` · checkout ${formatDate(booking.scheduledEnd)}`}
              </>
            ) : booking.status === "checked-in" ? (
              <>
                In {formatTime(booking.actualStart ?? booking.scheduledStart)} ·
                Out{" "}
                {booking.source === "boarding"
                  ? formatDate(booking.scheduledEnd)
                  : formatTime(booking.scheduledEnd)}
              </>
            ) : (
              <>Out {formatTime(booking.actualEnd ?? booking.scheduledEnd)}</>
            )}
            {booking.totalNights ? (
              <>
                <span className="mx-1.5">·</span>
                {booking.totalNights} night{booking.totalNights > 1 ? "s" : ""}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Action region — sibling to the clickable area, no propagation possible */}
      <div className="flex shrink-0 items-center gap-2">
        {primaryAction === "check-in" && (
          <>
            <Button
              size="sm"
              onClick={handleCheckInClick}
              className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <LogIn className="size-3.5" />
              Check In
            </Button>
            {checkInOpen && (
              <CheckInDialog
                booking={booking}
                open={checkInOpen}
                onOpenChange={setCheckInOpen}
                onConfirm={handleCheckInConfirm}
              />
            )}
          </>
        )}
        {primaryAction === "check-out" && (
          <>
            <Button
              size="sm"
              onClick={handleCheckOutClick}
              className="gap-1 bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="size-3.5" />
              Check Out
            </Button>
            {checkOutOpen && (
              <CheckOutDialog
                booking={booking}
                open={checkOutOpen}
                onOpenChange={setCheckOutOpen}
                onConfirm={handleCheckOutConfirm}
              />
            )}
            {paymentOpen && (
              <div onClick={(e) => e.stopPropagation()}>
                <PaymentCheckoutFlow
                  open={paymentOpen}
                  onOpenChange={setPaymentOpen}
                  amountDue={(booking.price ?? 0) + (pendingLateFee?.amount ?? 0)}
                  depositPaid={0}
                  invoiceTotal={(booking.price ?? 0) + (pendingLateFee?.amount ?? 0)}
                  onConfirm={handlePaymentConfirm}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
