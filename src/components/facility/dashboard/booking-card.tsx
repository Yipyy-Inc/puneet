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
import { useLoyaltyEngine } from "@/hooks/use-loyalty-engine";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";
import {
  balanceOf,
  checkoutTender,
  useTakeBookingPayment,
} from "@/lib/api/booking-money";
import { useAddLineItems } from "@/lib/api/booking-line-items";

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
  const takePayment = useTakeBookingPayment();
  const addLineItems = useAddLineItems();
  const { recordEvent } = useLoyaltyEngine();
  const { discount: loyaltyDiscount, consume: consumeLoyaltyDiscount } =
    useActiveLoyaltyDiscount({
      customerId: booking.ownerId,
      subtotal: booking.price ?? 0,
      serviceType: booking.serviceKey,
    });
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

  /**
   * The report-card side of checkout. Unchanged, and still local.
   */
  const sendReportCard = () => {
    if (reportCardSent) return;
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
  };

  /**
   * Everything that follows a payment landing.
   *
   * INSIDE the mutation's success path, all of it. It used to run beside a
   * toast that announced a charge nobody had made: loyalty points were awarded,
   * a discount voucher was consumed and a report card was "sent" for a payment
   * that reached no ledger. The same defect the daycare board had, one screen
   * over.
   */
  const afterPayment = (charged: number) => {
    updateStatus(booking.id, "checked-out", {
      timestamp: pendingCheckout?.timestamp ?? new Date().toISOString(),
      earlyCheckout: pendingCheckout?.earlyCheckout,
    });
    setPendingCheckout(null);
    setPendingLateFee(null);

    if (loyaltyDiscount) consumeLoyaltyDiscount();

    if (booking.ownerId != null) {
      recordEvent({
        type: "booking_completed",
        id: booking.id,
        customerId: booking.ownerId,
        amount: charged,
        serviceType: booking.serviceKey,
        isService: true,
      });
    }

    toast.success(
      charged > 0
        ? `Charged $${charged.toFixed(2)}`
        : "Checked out — nothing left to pay",
    );
    sendReportCard();
  };

  /**
   * Take the money.
   *
   * ── WHAT THIS DID BEFORE ────────────────────────────────────────────────
   *
   * Nothing. It toasted `Charged $X via card`, awarded loyalty points and
   * marked the booking checked out — and called no payment endpoint at all. The
   * money was never recorded, so the booking stayed unpaid, the client's
   * balance never moved, and the only trace of the transaction was a toast that
   * had already faded.
   *
   * ── THE AMOUNT IS THE BALANCE, NOT WHAT THE MODAL ADDED UP ──────────────
   *
   * `useTakeBookingPayment` takes the booking and works the balance out itself,
   * against `amount_due` — the price plus anything added at the counter, minus
   * what the ledger already holds. The modal's figure was `price + lateFee`,
   * and `price` was undefined for boarding and daycare, so it offered to charge
   * the late fee alone.
   *
   * ── THE LATE FEE GOES ON THE BILL FIRST ─────────────────────────────────
   *
   * As a LINE ITEM, which raises `amount_due`, so the payment that follows
   * covers it. Charging it as a loose extra on the payment row would leave the
   * booking owing a fee the bill has no record of.
   */
  const handlePaymentConfirm = (payment: {
    method: string;
    amount: number;
    tip: number;
    includedInvoices?: string[];
  }) => {
    if (!pendingCheckout) return;

    // Training and custom services have no booking row to pay against — no
    // table, no ref. They keep the old behaviour and the toast says so rather
    // than claiming a charge.
    const ref = Number(booking.rawId);
    if (
      booking.source === "training" ||
      booking.source === "custom" ||
      !Number.isFinite(ref)
    ) {
      updateStatus(booking.id, "checked-out", {
        timestamp: pendingCheckout.timestamp,
        earlyCheckout: pendingCheckout.earlyCheckout,
      });
      setPendingCheckout(null);
      setPendingLateFee(null);
      toast.success(`Checked out — payment not recorded`, {
        description: `${booking.serviceLabel} has no booking to charge against yet`,
      });
      sendReportCard();
      return;
    }

    let tender;
    try {
      tender = checkoutTender(payment.method);
    } catch (error) {
      // "custom" reaches here. A tender the books do not recognise is not
      // something to guess at — the money arrived somehow, and which way it
      // came is the thing being recorded.
      toast.error((error as Error).message);
      return;
    }

    const lateFee = pendingLateFee;
    const chargeIt = () => {
      // ONE FIGURE, used for both the check and the charge. The first draft of
      // this added the late fee when deciding whether anything was owed and
      // left it out of the amount charged — taking the money for everything
      // except the fee that triggered the charge.
      //
      // The fee is already on the server's `amount_due` by the time this runs:
      // the line item is written first, on purpose.
      const money = {
        id: ref,
        totalCost: booking.price ?? 0,
        amountDue:
          (booking.amountDue ?? booking.price ?? 0) + (lateFee?.amount ?? 0),
        amountPaid: booking.amountPaid ?? 0,
      };

      if (balanceOf(money) <= 0) {
        // Already settled — a deposit that covered it, or a payment taken at
        // the counter a minute ago. Checking out is still the right thing to do.
        afterPayment(0);
        return;
      }
      takePayment.mutate(
        {
          booking: money,
          method: tender,
          tipAmount: payment.tip > 0 ? payment.tip : undefined,
        },
        {
          onSuccess: (charged) => afterPayment(charged),
          onError: (error) =>
            toast.error("The payment was not recorded", {
              description: error.message,
            }),
        },
      );
    };

    if (lateFee && lateFee.amount > 0) {
      addLineItems.mutate(
        {
          bookingRef: ref,
          items: [
            {
              kind: "fee",
              name: `Late pickup (${lateFee.minutesLate} min)`,
              unitPrice: lateFee.amount,
            },
          ],
        },
        {
          onSuccess: chargeIt,
          onError: (error) =>
            toast.error("The late fee was not added to the bill", {
              description: error.message,
            }),
        },
      );
      return;
    }

    chargeIt();
  };

  return (
    <div
      // No role="button"/tabIndex: the card contains its own links (pet, owner)
      // and action buttons (Check In / Check Out). A button wrapping buttons is
      // a WCAG "nested-interactive" failure — the card stays mouse-clickable and
      // keyboard users use the inner links/actions.
      onClick={handleOpen}
      className={cn(
        // flex-wrap + a full-width action row below sm: on a phone the card is
        // ~358px, and an inline action column left only ~199px for the details,
        // forcing the name and badges onto separate lines. Dropping the action
        // to its own row gives the details ~306px — the same single-line
        // name/badges + owner + kennel layout as desktop.
        "group border-border/70 bg-card relative flex h-full cursor-pointer flex-wrap items-center gap-3 rounded-2xl border p-3 transition-all",
        "hover:border-border hover:shadow-sm",
        "data-[status=checked-out]:opacity-80",
      )}
      data-status={booking.status}
    >
      {/* Info region — layout only, click handled by outer card */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={petHref}
          onClick={(e) => e.stopPropagation()}
          aria-label={`${booking.petName} profile`}
          className="relative block size-12 shrink-0"
        >
          {petImage ? (
            <div className="ring-background size-12 overflow-hidden rounded-2xl ring-2">
              <Image
                src={petImage}
                alt={booking.petName}
                width={48}
                height={48}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground ring-background flex size-12 items-center justify-center rounded-2xl ring-2">
              <PawPrint className="size-5" />
            </div>
          )}
          {booking.isGoingHomeToday && booking.status === "checked-in" && (
            <span className="ring-background absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-violet-500 ring-2">
              <Home className="size-2.5 text-white" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          {/* wrap rather than overflow-hidden: the service badge is shrink-0,
              so at 390px it was clipped out of view instead of moving down. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={petHref}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 truncate text-sm leading-none font-semibold hover:underline"
            >
              {booking.petName}
            </Link>
            <ServiceBadge booking={booking} />
            <TagList
              entityType="pet"
              entityId={booking.petId}
              compact
              maxVisible={1}
              className="min-w-0 flex-wrap"
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
                <span className="text-foreground/80 font-medium">
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
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
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
              // Wrapped, like the payment flow below, and for the reason
              // somebody already discovered there: A REACT PORTAL BUBBLES UP THE
              // REACT TREE, NOT THE DOM TREE. The dialog renders into
              // document.body but is a JSX child of this card, so every click
              // inside it also fires the card's own onClick — which routes to
              // the booking overview. Confirming a check-in navigated the
              // operator away from the board.
              <div onClick={(e) => e.stopPropagation()}>
                <CheckInDialog
                  booking={booking}
                  open={checkInOpen}
                  onOpenChange={setCheckInOpen}
                  onConfirm={handleCheckInConfirm}
                />
              </div>
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
              // Same wrapper, same reason — and here the consequence was worse
              // than a stray navigation. Confirming the check-out routed the
              // page away BEFORE `setPaymentOpen(true)` could render anything,
              // so the payment step simply never appeared: the guest was marked
              // departed and nobody was ever asked for the money.
              <div onClick={(e) => e.stopPropagation()}>
                <CheckOutDialog
                  booking={booking}
                  open={checkOutOpen}
                  onOpenChange={setCheckOutOpen}
                  onConfirm={handleCheckOutConfirm}
                />
              </div>
            )}
            {paymentOpen && (
              <div onClick={(e) => e.stopPropagation()}>
                {/* The bill, and what is left of it.
                    `depositPaid` was hardcoded to 0 and the total was
                    `price + lateFee` — so a booking with a deposit against it
                    was presented for the full amount again, and for boarding
                    and daycare, whose `price` was undefined, the modal offered
                    to charge the late fee on its own. */}
                <PaymentCheckoutFlow
                  open={paymentOpen}
                  onOpenChange={setPaymentOpen}
                  amountDue={Math.max(
                    0,
                    (booking.amountDue ?? booking.price ?? 0) +
                      (pendingLateFee?.amount ?? 0) -
                      (booking.amountPaid ?? 0),
                  )}
                  depositPaid={booking.amountPaid ?? 0}
                  invoiceTotal={
                    (booking.amountDue ?? booking.price ?? 0) +
                    (pendingLateFee?.amount ?? 0)
                  }
                  loyaltyDiscount={loyaltyDiscount ?? undefined}
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
