"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { usePricingRules } from "@/lib/api/facility-settings";
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
import { clientQueries } from "@/lib/api/client";
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
import {
  computeLatePickupFee,
  type LateFeeResult,
} from "@/lib/late-pickup-fee";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";
import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import { balanceOf } from "@/lib/api/booking-money";
import type {
  CheckoutPayment,
  CheckoutResult,
} from "@/components/bookings/PaymentCheckoutFlow";
import type { Booking } from "@/types/booking";

// ── WHOSE RECORD THIS CARD LINKS TO ──────────────────────────────────────
//
// This was `clients.find((c) => c.pets.some((p) => p.id === petId))` over the
// src/data fixture, and its answer drove three links: the pet, the owner, and
// the owner's bookings.
//
// MEASURED against Postgres, pet by pet. Thirteen of the seventeen real pets
// with a fixture entry agree with it. Two do NOT: pet 50 (Daisy) and pet 51
// (Max) belong to client 15, Alice Johnson, and the fixture assigns them to
// clients 34 and 31. So those cards linked staff to the WRONG customer's
// record. Six more real pets — refs 9001 to 9206 — have no fixture entry at
// all, so their cards linked nowhere.
//
// The booking already carries `ownerId` from its own source, which is the
// answer without a lookup. The client list is the fallback for a source that
// does not set it, and it is now the REAL list, so the worst case is a missing
// link rather than somebody else's customer.
function useOwnerRef(booking: UnifiedBooking): number | undefined {
  const { data: roster } = useQuery(clientQueries.all());
  if (booking.ownerId != null) return booking.ownerId;
  return roster?.find((c) => c.pets.some((p) => p.id === booking.petId))?.id;
}

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
  // The facility's own surcharges and discounts, from `facility_settings`.
  // These used to come from localStorage, so what a customer was charged
  // depended on which browser took the booking.
  const { rules: pricingRules, isPending: pricingPending } = usePricingRules();
  const { updateStatus } = useUnifiedBookings();
  const {
    discount: loyaltyDiscount,
    consume: consumeLoyaltyDiscount,
    release: releaseLoyaltyDiscount,
  } = useActiveLoyaltyDiscount({
    clientRef: booking.ownerId ?? undefined,
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
  const ownerRef = useOwnerRef(booking);

  // Training and custom services have no booking row to charge against.
  const bookingRef = Number(booking.rawId);
  const hasRow =
    booking.source !== "training" &&
    booking.source !== "custom" &&
    Number.isFinite(bookingRef);
  // The same checkout the booking page uses (hooks/use-booking-checkout):
  // awaited, every failure thrown so the dialog stays open, the late fee and
  // reward on the bill before any tender, the terminal really charged.
  const checkout = useBookingCheckout({
    booking: hasRow
      ? ({
          id: bookingRef,
          totalCost: booking.price ?? 0,
          amountDue: booking.amountDue ?? booking.price ?? 0,
          amountPaid: booking.amountPaid ?? 0,
          status: "confirmed",
        } as unknown as Booking)
      : undefined,
    clientRef: ownerRef ?? 0,
    lateFee: pendingLateFee,
    clearLateFee: () => setPendingLateFee(null),
    loyaltyDiscount,
    consumeLoyaltyDiscount,
    releaseLoyaltyDiscount,
    membershipDiscount: null,
    // This card checks the booking out through the board's own status flow.
    completeOnSettle: false,
    text: {
      discountRefused: "The member discount could not be applied.",
      giftCardNoTip: "A gift card cannot pay a tip.",
      giftCardRemaining: (amount) => `$${amount.toFixed(2)} left on the card`,
    },
  });
  const petImage = getPetImage(booking.petId);
  const petHref = ownerRef
    ? `/facility/dashboard/clients/${ownerRef}/pets/${booking.petId}`
    : "#";
  const ownerHref = ownerRef
    ? `/facility/dashboard/clients/${ownerRef}`
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
    if (ownerRef) {
      router.push(`/facility/dashboard/clients/${ownerRef}/bookings`);
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
      rules: pricingRules,
      serviceId: booking.serviceKey,
      scheduledEndIso: booking.scheduledEnd,
      actualEndIso: timestamp,
      basePrice: booking.price ?? 0,
    });
    if (lateFee) {
      toast.warning(
        `Late pickup: ${lateFee.minutesLate} min over — a $${lateFee.amount.toFixed(2)} fee goes on the bill at payment`,
      );
    }
    setPendingCheckout({ timestamp, earlyCheckout });
    setPendingLateFee(lateFee);
    setCheckOutOpen(false);
    setPaymentOpen(true);
  };

  /**
   * Check the booking out, once the money is settled.
   *
   * "Report card sent to {owner}" used to follow here, and nothing was sent or
   * scheduled: report cards are written and sent from the Report cards
   * module. The points are awarded by the checkout itself.
   */
  const afterPayment = () => {
    updateStatus(booking.id, "checked-out", {
      timestamp: pendingCheckout?.timestamp ?? new Date().toISOString(),
      earlyCheckout: pendingCheckout?.earlyCheckout,
    });
    setPendingCheckout(null);
    setPendingLateFee(null);
  };

  /**
   * Take the money, then check out.
   *
   * It used to swallow every failure — `toast.error` and `return` — so the
   * dialog it answered then said "Payment of $X taken" for a payment that was
   * refused. Failures THROW now and the dialog stays open. Its "Terminal"
   * tender recorded a terminal payment without touching a terminal; the shared
   * checkout asks the terminal for real.
   */
  const handlePaymentConfirm = async (
    payment: CheckoutPayment,
  ): Promise<CheckoutResult> => {
    if (!pendingCheckout) throw new Error("Check the booking out first.");

    if (!hasRow) {
      afterPayment();
      return {
        taken: 0,
        message: `Checked out — no payment recorded: ${booking.serviceLabel} has no booking to charge against yet.`,
      };
    }

    const owed = balanceOf({
      totalCost: booking.price ?? 0,
      amountDue:
        (booking.amountDue ?? booking.price ?? 0) +
        (pendingLateFee?.amount ?? 0),
      amountPaid: booking.amountPaid ?? 0,
    });
    if (owed <= 0) {
      afterPayment();
      return { taken: 0, message: "Checked out — nothing was left to pay." };
    }

    const result = await checkout(payment);
    afterPayment();
    return result;
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
      <div className="flex w-full shrink-0 items-center gap-2 *:flex-1 sm:w-auto sm:*:flex-none">
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
            {/* ── DISABLED UNTIL THE PRICING RULES ARRIVE ──────────────────
                `usePricingRules()` answers with the EMPTY fallback while its
                query is in flight, and empty is indistinguishable from "this
                facility charges no late fee". Checking out in that window
                computes no late-pickup fee and charges the customer the bare
                bill — silently, and only sometimes, which is the worst way for
                a money bug to behave.

                Caught by dashboard-live-board.spec.ts on 2026-08-20: it passed
                twice and then failed three times running, on nothing but how
                fast the settings query came back. */}
            <Button
              size="sm"
              onClick={handleCheckOutClick}
              disabled={pricingPending}
              className="gap-1 bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="size-3.5" />
              {pricingPending ? "Loading fees…" : "Check Out"}
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
