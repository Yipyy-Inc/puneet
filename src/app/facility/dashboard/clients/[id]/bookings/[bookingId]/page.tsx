"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PawPrint,
  Send,
  CreditCard,
  Banknote,
  ClipboardList,
  ShieldCheck,
  XCircle,
  Circle,
  CircleDot,
  CheckCircle2,
  ListChecks,
  Clock,
  CalendarDays,
  MapPin,
  AlertTriangle,
  HandCoins,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookingDetailActionBar } from "@/components/bookings/BookingDetailActionBar";
import { Separator } from "@/components/ui/separator";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { boardingGuests, type BoardingGuest } from "@/data/boarding";
import { PrintKennelCardsModal } from "@/components/facility/boarding/kennel-card-print";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoicePanel } from "@/components/bookings/InvoicePanel";
import { BookingNotes } from "@/components/bookings/BookingNotes";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { CheckOutDialog } from "@/components/facility/dashboard/check-out-dialog";
import type { UnifiedBooking } from "@/hooks/use-unified-bookings";
import { TagList } from "@/components/shared/TagList";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { PaymentCheckoutFlow } from "@/components/bookings/PaymentCheckoutFlow";
import { TipSplitModal } from "@/components/bookings/TipSplitModal";
import { DepositChargeModal } from "@/components/bookings/DepositChargeModal";
import { PrepaymentModal } from "@/components/bookings/PrepaymentModal";
import { CareCompletionGateDialog } from "@/components/bookings/CareCompletionWarning";
import {
  getPendingCareItems,
  careSectionDomIds,
} from "@/lib/care-completion";
import { buildInvoiceDocumentHtml } from "@/lib/invoice-document";
import { loadInvoiceTemplate } from "@/data/invoice-template";
import {
  loadDepositRules,
  findApplicableDepositRule,
  computeDepositAmount,
} from "@/data/deposit-rules";
import { SendEstimateModal } from "@/components/bookings/SendEstimateModal";
import { RefundModal } from "@/components/bookings/RefundModal";
import { AddRetailItemModal } from "@/components/bookings/AddRetailItemModal";
import {
  computeLatePickupFee,
  type LateFeeResult,
} from "@/lib/late-pickup-fee";
import { BookingTransferModal } from "@/components/bookings/modals/BookingTransferModal";
import { useLocationContext } from "@/hooks/use-location-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPetAgeDisplay } from "@/lib/pet-utils";
import { ClientInfoStrip } from "@/components/clients/ClientInfoStrip";
import { NotesButton } from "@/components/shared/NotesButton";
import { TagsButton } from "@/components/shared/TagsButton";
import { QuickBooksSyncPanel } from "@/components/bookings/QuickBooksSyncPanel";
import { BookingStatusDropdown } from "@/components/bookings/BookingStatusDropdown";
import { FeedingSection } from "@/components/bookings/FeedingSection";
import { MedicationSection } from "@/components/bookings/MedicationSection";
import { BelongingsSection } from "@/components/bookings/BelongingsSection";
import { ReservationJournalPanel } from "@/components/guest-journal/ReservationJournalPanel";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { formatBookingRef } from "@/lib/booking-id";
import { facilityBookingFlowConfig } from "@/data/settings";
import type { InvoiceLineItem, ExtraService } from "@/types/booking";
import {
  daycareConfig,
  boardingConfig,
  groomingConfig,
  trainingConfig,
  reportCardConfig,
} from "@/data/settings";
import type { GeneratedTask } from "@/types/task";
import {
  getTasksForBooking,
  completeTask,
  startTask,
} from "@/data/generated-tasks";

// ========================================
// Helpers
// ========================================

function nightsBetween(start: string, end: string) {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return {
        dot: "bg-emerald-500",
        bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      };
    case "confirmed":
      return {
        dot: "bg-blue-500",
        bg: "bg-blue-50 border-blue-200 text-blue-700",
      };
    case "pending":
      return {
        dot: "bg-amber-500",
        bg: "bg-amber-50 border-amber-200 text-amber-700",
      };
    case "estimate_sent":
      return {
        dot: "bg-violet-500",
        bg: "bg-violet-50 border-violet-200 text-violet-700",
      };
    case "declined":
      return { dot: "bg-red-500", bg: "bg-red-50 border-red-200 text-red-700" };
    case "cancelled":
      return { dot: "bg-red-500", bg: "bg-red-50 border-red-200 text-red-700" };
    default:
      return { dot: "bg-muted-foreground", bg: "bg-muted" };
  }
}

// ========================================
// Page
// ========================================

export default function ClientBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookingId: string }>;
}) {
  const { id, bookingId: bookingIdStr } = use(params);
  const { role } = useFacilityRole();
  const clientId = parseInt(id, 10);
  const bookingId = parseInt(bookingIdStr, 10);

  const initialBooking = useMemo(
    () => initialBookings.find((b) => b.id === bookingId),
    [bookingId],
  );
  const [booking, setBooking] = useState(() => initialBooking);
  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking]);
  const [reportCardSent, setReportCardSent] = useState(false);
  const [pendingLateFee, setPendingLateFee] = useState<LateFeeResult | null>(
    null,
  );
  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clientId],
  );
  const pets = useMemo(() => {
    if (!client || !booking) return [];
    const pids = Array.isArray(booking.petId) ? booking.petId : [booking.petId];
    return pids
      .map((pid) => client.pets?.find((p) => p.id === pid))
      .filter(Boolean) as NonNullable<(typeof client.pets)[number]>[];
  }, [client, booking]);
  const pet = pets[0] ?? null;
  const facility = useMemo(
    () =>
      booking ? facilities.find((f) => f.id === booking.facilityId) : null,
    [booking],
  );

  const nights = booking
    ? nightsBetween(booking.startDate, booking.endDate)
    : 0;

  const unifiedForEarlyCheckout = useMemo<UnifiedBooking | null>(() => {
    if (!booking || !pet) return null;
    const svc = booking.service.toLowerCase();
    return {
      id: `booking-${booking.id}`,
      rawId: String(booking.id),
      source: svc as UnifiedBooking["source"],
      serviceKey: svc,
      serviceLabel: booking.service,
      serviceColor: "#6366f1",
      serviceIcon: "bed",
      petId: pet.id,
      petName: pet.name,
      petBreed: pet.breed ?? "",
      ownerId: client?.id,
      ownerName: client?.name ?? "",
      ownerPhone: client?.phone ?? "",
      status: "checked-in",
      scheduledStart: booking.startDate + "T12:00:00.000Z",
      actualStart: null,
      scheduledEnd: booking.endDate + "T12:00:00.000Z",
      actualEnd: null,
      isGoingHomeToday: false,
      price: booking.totalCost,
      totalNights: nights,
    };
  }, [booking, pet, client, nights]);
  const isCancelled = booking?.status === "cancelled";
  const isDeclined = booking?.status === "declined";
  const isEstimateSent = booking?.status === "estimate_sent";
  const isPaid = booking?.paymentStatus === "paid";

  type AutoTransitionAction =
    | "onDepositPaid"
    | "onCheckIn"
    | "onCheckout"
    | "onPaymentComplete";

  type IftttTransitionRule = {
    id: string;
    service: string;
    action: AutoTransitionAction;
    currentStatus: string;
    targetStatus: string;
    enabled: boolean;
  };

  const bookingStatusConfig = facility?.bookingStatusConfig as
    | {
        autoTransitions?: Record<string, string>;
        iftttTransitionRules?: IftttTransitionRule[];
        advancedAutoTransitions?: IftttTransitionRule[];
      }
    | undefined;

  const autoTransitions = bookingStatusConfig?.autoTransitions;

  const iftttTransitionRules =
    bookingStatusConfig?.iftttTransitionRules ??
    bookingStatusConfig?.advancedAutoTransitions ??
    [];

  const resolveAutoTransition = (action: AutoTransitionAction) => {
    if (!booking) {
      return {
        target: null,
        sourceLabel: null,
      };
    }

    const bookingService = String(booking.service).toLowerCase();
    const bookingStatus = booking.status;

    const matchedRule = iftttTransitionRules.find((rule) => {
      if (!rule || rule.enabled === false) return false;
      if (rule.action !== action) return false;

      const serviceMatches =
        rule.service === "any" || rule.service === bookingService;
      if (!serviceMatches) return false;

      const statusMatches =
        rule.currentStatus === "any" || rule.currentStatus === bookingStatus;
      if (!statusMatches) return false;

      return Boolean(rule.targetStatus && rule.targetStatus !== "none");
    });

    if (matchedRule) {
      return {
        target: matchedRule.targetStatus,
        sourceLabel: "IFTTT rule",
      };
    }

    const fallbackTarget = autoTransitions?.[action];
    if (fallbackTarget && fallbackTarget !== "none") {
      return {
        target: fallbackTarget,
        sourceLabel: "default rule",
      };
    }

    return {
      target: null,
      sourceLabel: null,
    };
  };

  const autoTransition = (action: AutoTransitionAction) => {
    const { target, sourceLabel } = resolveAutoTransition(action);
    if (!target) return;

    const label = target
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    toast.success(`Status auto-updated to ${label} (${sourceLabel})`);
  };

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const { locations } = useLocationContext();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false);
  const [tipSplitOpen, setTipSplitOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [prepaymentOpen, setPrepaymentOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [retailOpen, setRetailOpen] = useState(false);
  const [boardingSheetOpen, setBoardingSheetOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<InvoiceLineItem[]>([]);
  const [destructiveConfirm, setDestructiveConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [careGateOpen, setCareGateOpen] = useState(false);

  const isBoarding = booking?.service.toLowerCase() === "boarding";

  const boardingGuestForPrint = useMemo<BoardingGuest | null>(() => {
    if (!isBoarding || !booking || !pet) return null;
    const refId = `bk-${String(booking.id).padStart(3, "0")}`;
    const matched = boardingGuests.find((g) => g.bookingId === refId);
    if (matched) return matched;
    const allergyList = pet.allergies
      ? pet.allergies
          .split(/[,;]/)
          .map((a) => a.trim())
          .filter(Boolean)
      : [];
    return {
      id: `synthetic-${booking.id}`,
      petId: pet.id,
      bookingId: refId,
      petName: pet.name,
      petBreed: pet.breed,
      petSize: "medium",
      petWeight: pet.weight,
      petColor: pet.color,
      petPhotoUrl: pet.imageUrl,
      petAge: pet.age,
      ownerId: client?.id ?? 0,
      ownerName: client?.name ?? "",
      ownerPhone: client?.phone ?? "",
      emergencyVetContact: "",
      checkInDate: booking.startDate,
      checkOutDate: booking.endDate,
      kennelId: booking.kennel ?? "",
      kennelName: booking.kennel ?? "Unassigned",
      status: "checked-in",
      packageType: booking.serviceType ?? "Standard",
      totalNights: nights,
      nightlyRate: booking.basePrice,
      discountApplied: 0,
      peakSurcharge: 0,
      totalPrice: booking.totalCost,
      allergies: allergyList,
      feedingInstructions: booking.specialRequests ?? "",
      foodBrand: "",
      feedingTimes: [],
      feedingAmount: "",
      medications: [],
      tags: [],
      notes: booking.specialRequests ?? "",
      createdAt: new Date().toISOString(),
    } as BoardingGuest;
  }, [isBoarding, booking, pet, client, nights]);

  const bookingRef = formatBookingRef(booking?.id ?? bookingId);

  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  useEffect(() => {
    setTasks(getTasksForBooking(bookingId));
  }, [bookingId]);

  if (!booking || !client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  const invoice = booking.invoice;
  const addedSubtotal = addedItems.reduce((s, i) => s + i.price, 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  const openCheckout = () => {
    const scheduledEndIso = `${booking.endDate}T${booking.checkOutTime ?? "12:00"}:00`;
    const petCount = Array.isArray(booking.petId) ? booking.petId.length : 1;
    const fee = computeLatePickupFee({
      serviceId: booking.service.toLowerCase(),
      scheduledEndIso,
      actualEndIso: new Date().toISOString(),
      petCount,
      basePrice: booking.basePrice,
    });
    if (fee) {
      toast.warning(
        `Late pickup: ${fee.minutesLate} min over — $${fee.amount.toFixed(2)} fee added`,
      );
    }
    setPendingLateFee(fee);
    setCheckoutOpen(true);
  };

  const bookingTotalForDeposit = invoice?.total ?? booking.totalCost;
  const depositRule = findApplicableDepositRule(
    booking.service,
    bookingTotalForDeposit,
    loadDepositRules(),
  );
  const ruleDepositAmount = depositRule
    ? computeDepositAmount(depositRule, bookingTotalForDeposit)
    : Math.round(bookingTotalForDeposit * 0.5 * 100) / 100;
  const ruleDepositLabel = depositRule
    ? depositRule.label
    : `50% of total ($${(bookingTotalForDeposit * 0.5).toFixed(2)})`;

  // Care-completion check — surfaces unlogged meals/meds before checkout
  const careStatus = getPendingCareItems(
    booking.feedingInstructions,
    booking.medicationInstructions,
  );

  return (
    <div>
      {/* Client info strip — replaces the full sidebar */}
      <ClientInfoStrip
        client={client}
        backHref={`/facility/dashboard/clients/${clientId}`}
        currentContext={`${bookingRef}${pet ? ` · ${pet.name}` : ""}`}
      />

      <div className="space-y-5 p-5 md:p-7">
        {/* Evaluation Reminder — non-blocking mode */}
        {!isCancelled &&
          booking.status !== "completed" &&
          facilityBookingFlowConfig.evaluationRequired &&
          facilityBookingFlowConfig.servicesRequiringEvaluation.includes(
            booking.service,
          ) &&
          !facilityBookingFlowConfig.hideServicesUntilEvaluationCompleted && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <ClipboardList className="size-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Evaluation Recommended
                  </p>
                  <p className="text-xs text-amber-600">
                    This pet may need an evaluation for {booking.service}.
                    Consider scheduling one before check-in.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => toast.success("Evaluation appointment created")}
              >
                <ClipboardList className="size-3.5" />
                Add Evaluation
              </Button>
            </div>
          )}

        {/* Checkout Alert — unrecorded evaluation results */}
        {booking.service === "evaluation" &&
          booking.status === "confirmed" &&
          !isCancelled && (
            <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                  <ClipboardList className="size-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Evaluation results not recorded
                  </p>
                  <p className="text-xs text-orange-600">
                    Please complete the evaluation form and record pass/fail
                    before checkout
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-orange-600 text-white hover:bg-orange-700"
                onClick={() =>
                  toast.info("Open the evaluation form to record results")
                }
              >
                <ClipboardList className="size-3.5" />
                Record Results
              </Button>
            </div>
          )}

        {/* Estimate Sent — waiting for client confirmation */}
        {isEstimateSent && (
          <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Clock className="size-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-violet-800">
                  Waiting for client confirmation
                </p>
                <p className="text-xs text-violet-600">
                  Estimate sent to {client.name} — awaiting response
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-100"
                onClick={() => setEstimateOpen(true)}
              >
                <Send className="size-3.5" />
                Resend
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  toast.success("Booking confirmed — deposit rules now apply");
                  autoTransition("onDepositPaid");
                }}
              >
                <CheckCircle2 className="size-3.5" />
                Confirm Booking
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => toast.info("Booking marked as declined")}
              >
                <XCircle className="size-3.5" />
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Declined — client rejected the estimate */}
        {isDeclined && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
                <XCircle className="size-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">
                  Estimate Declined
                </p>
                <p className="text-xs text-red-600">
                  {client.name} declined this estimate
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Notice — unpaid */}
        {!isPaid && !isCancelled && (invoice?.depositCollected ?? 0) === 0 && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Banknote className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Deposit Required
                </p>
                <p className="text-xs text-blue-600">
                  Rule: 50% of service total — $
                  {(booking.totalCost * 0.5).toFixed(2)} due before check-in
                </p>
                <p className="text-[10px] text-blue-500">
                  Paying the deposit will auto-confirm this booking
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setDepositOpen(true)}
            >
              <Banknote className="size-3.5" />
              Charge Deposit
            </Button>
          </div>
        )}

        {/* Deposit Collected — with auto-confirm note */}
        {(invoice?.depositCollected ?? 0) > 0 && !isPaid && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Deposit Collected — $
                  {(invoice?.depositCollected ?? 0).toFixed(2)}
                </p>
                <p className="text-xs text-emerald-600">
                  Remaining balance:{" "}
                  <span className="font-[tabular-nums] font-medium">
                    ${(invoice?.remainingDue ?? booking.totalCost).toFixed(2)}
                  </span>{" "}
                  · Booking auto-confirmed
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {booking.status !== "confirmed" && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    toast.success(
                      "Checked in — invoice status changed to Open",
                    );
                    autoTransition("onCheckIn");
                  }}
                >
                  Continue to Check In
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Finished Notice */}
        {(booking.status === "completed" || isPaid) && !isCancelled && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              This booking is <strong>finished</strong>. Date, time, service
              prices, and items are locked. You can still view the receipt,
              split tips, or issue a refund. If a correction is needed, cancel
              and refund this invoice, then create a new booking.
            </span>
          </div>
        )}

        {/* ── Hero Header ── */}
        <div className="from-card to-muted/20 rounded-xl border bg-linear-to-r p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {bookingRef}
                </h1>
                <BookingStatusDropdown
                  currentStatus={booking.status}
                  onStatusChange={(newStatus) => {
                    toast.success(
                      `${bookingRef} status changed to ${newStatus.replace(/_/g, " ")}`,
                    );
                  }}
                />
                <TagsButton entityType="booking" entityId={booking.id} />
                <NotesButton entityType="booking" entityId={booking.id} />
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {formatDateShort(booking.startDate)}
                  {booking.startDate !== booking.endDate &&
                    ` → ${formatDateShort(booking.endDate)}`}
                </span>
                {nights > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="capitalize">{booking.service}</span>
                {booking.kennel && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {booking.kennel}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-[tabular-nums] text-2xl font-bold">
                ${(booking.invoice?.total ?? booking.totalCost).toFixed(2)}
              </p>
              <StatusBadge type="status" value={booking.paymentStatus} />
            </div>
          </div>

          {/* Action bar — primary / secondary / more / destructive */}
          <BookingDetailActionBar
            booking={booking}
            invoice={invoice}
            isPaid={isPaid}
            isCancelled={isCancelled}
            isEstimateSent={isEstimateSent}
            multiLocation={locations.length > 1}
            onCheckIn={() => {
              toast.success("Booking checked in — service in progress");
              autoTransition("onCheckIn");
            }}
            onProceedToCheckout={() => {
              if (careStatus.pending.length > 0) {
                setCareGateOpen(true);
                return;
              }
              openCheckout();
            }}
            onTakePayment={() => {
              if (careStatus.pending.length > 0) {
                setCareGateOpen(true);
                return;
              }
              openCheckout();
            }}
            onConfirmBooking={() => {
              toast.success("Booking confirmed");
            }}
            onEdit={() => setEditOpen(true)}
            onAddItem={() => setRetailOpen(true)}
            onSendEstimate={() => setEstimateOpen(true)}
            onChargeDeposit={() => setDepositOpen(true)}
            onTakePrepayment={() => setPrepaymentOpen(true)}
            onPrintInvoice={() => {
              const inv = invoice;
              const template = loadInvoiceTemplate();
              const w = window.open("", "_blank", "width=720,height=900");
              if (!w) return;
              const formatDate = (d: string) =>
                new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              const dateRange =
                booking.startDate && booking.endDate &&
                booking.startDate !== booking.endDate
                  ? `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`
                  : booking.startDate
                    ? formatDate(booking.startDate)
                    : undefined;
              const html = buildInvoiceDocumentHtml(template, {
                invoiceNumber: inv?.id ?? String(booking.id),
                invoiceStatus: inv?.status,
                issuedDate: new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                bookingDateRange: dateRange,
                clientName: client.name,
                clientEmail: client.email,
                clientPhone: client.phone,
                petName: pet?.name,
                serviceLabel: booking.service,
                items:
                  inv?.items ?? [
                    {
                      name: booking.service,
                      unitPrice: booking.basePrice,
                      quantity: 1,
                      price: booking.totalCost,
                    },
                  ],
                fees: inv?.fees,
                subtotal: inv?.subtotal ?? booking.totalCost,
                discount: inv?.discount,
                discountLabel: inv?.discountLabel,
                taxes: inv?.taxes,
                taxAmount: inv?.taxAmount,
                taxRate: inv?.taxRate,
                tipTotal: inv?.tipTotal,
                total: inv?.total ?? booking.totalCost,
                depositCollected: inv?.depositCollected,
                remainingDue: inv?.remainingDue,
                payments: inv?.payments,
                variant: inv?.status === "closed" ? "receipt" : "invoice",
              });
              w.document.write(html);
              w.document.close();
              w.print();
            }}
            onPrintCareSheet={() => {
              if (isBoarding && boardingGuestForPrint) {
                setBoardingSheetOpen(true);
              } else {
                toast.success("Care sheet printed");
              }
            }}
            onEmailInvoice={() => toast.success("Invoice emailed")}
            onSmsLink={() => toast.success("SMS sent")}
            onTransfer={() => setTransferOpen(true)}
            onMarkAsReady={() => {
              toast.success("Service marked as ready — proceed to checkout");
              autoTransition("onCheckIn");
            }}
            onEarlyCheckout={() => setEarlyCheckoutOpen(true)}
            onFinishWithoutPayment={() => {
              toast.success(
                "Appointment marked as finished — invoice stays open for later billing",
              );
              autoTransition("onCheckout");
            }}
            onSplitTips={() => setTipSplitOpen(true)}
            onIssueRefund={() => setRefundOpen(true)}
            requestDestructiveConfirm={(payload) =>
              setDestructiveConfirm(payload)
            }
            onCancelBooking={() => setCancelOpen(true)}
          />
        </div>

        {/* ── Content Grid ── */}
        <div className="grid gap-5 lg:grid-cols-5">
          {/* Left — 3 cols */}
          <div className="space-y-5 lg:col-span-3">
            {/* Booking Details + Pets */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Details */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                    <CalendarDays className="size-3.5" />
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium capitalize">
                        {booking.service}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in</span>
                      <span className="font-medium">
                        {formatDateLong(booking.startDate)}
                        {booking.checkInTime && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            {booking.checkInTime}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out</span>
                      <span className="font-medium">
                        {formatDateLong(booking.endDate)}
                        {booking.checkOutTime && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            {booking.checkOutTime}
                          </span>
                        )}
                      </span>
                    </div>
                    {booking.service.toLowerCase() === "boarding" &&
                      !isCancelled &&
                      booking.status !== "completed" &&
                      unifiedForEarlyCheckout && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 border-amber-300 text-xs text-amber-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                            onClick={() => setEarlyCheckoutOpen(true)}
                          >
                            <LogOut className="size-3.5" />
                            Early Checkout
                          </Button>
                        </div>
                      )}
                    {booking.kennel && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Room</span>
                        <span className="font-medium">{booking.kennel}</span>
                      </div>
                    )}
                    {booking.specialRequests && (
                      <div className="border-t pt-3">
                        <p className="text-muted-foreground mb-1 text-xs">
                          Special Requests
                        </p>
                        <p className="text-sm italic">
                          {booking.specialRequests}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pets */}
              {pets.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <PawPrint className="size-3.5" />
                      {pets.length === 1 ? "Pet" : `Pets (${pets.length})`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pt-4 pb-4">
                    {pets.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-all hover:border-border hover:shadow-sm"
                      >
                        <Link
                          href={`/facility/dashboard/clients/${clientId}/pets/${p.id}`}
                          className="relative block size-12 shrink-0"
                        >
                          {p.imageUrl ? (
                            <div className="size-12 overflow-hidden rounded-2xl ring-2 ring-background">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="size-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl font-bold ring-2 ring-background">
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/facility/dashboard/clients/${clientId}/pets/${p.id}`}
                              className="text-sm font-semibold leading-none hover:underline"
                            >
                              {p.name}
                            </Link>
                            <TagList
                              entityType="pet"
                              entityId={p.id}
                              compact
                              maxVisible={2}
                            />
                          </div>
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {p.breed} · {p.type} · {getPetAgeDisplay(p)} ·{" "}
                            {p.weight} lbs
                            {p.sex && (
                              <>
                                {" · "}
                                <span className="capitalize">{p.sex}</span>
                              </>
                            )}
                          </p>
                          {((p.allergies && p.allergies !== "None") ||
                            (p.specialNeeds && p.specialNeeds !== "None")) && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {p.allergies && p.allergies !== "None" && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                                  <ShieldCheck className="size-2.5 shrink-0" />
                                  {p.allergies}
                                </span>
                              )}
                              {p.specialNeeds && p.specialNeeds !== "None" && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                                  <AlertTriangle className="size-2.5 shrink-0" />
                                  {p.specialNeeds}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Care-instruction visibility is per-service config; default "optional" is backwards-compatible */}
            {(() => {
              const serviceConfigMap: Record<string, typeof daycareConfig> = {
                daycare: daycareConfig,
                boarding: boardingConfig,
                grooming: groomingConfig,
                training: trainingConfig,
              };
              const svcConfig = serviceConfigMap[booking.service];
              const care = svcConfig?.settings?.careInstructions;
              const feedingMode = care?.feeding ?? "optional";
              const medicationMode = care?.medication ?? "optional";
              const belongingsMode = care?.belongings ?? "optional";

              return (
                <>
                  {!isCancelled && feedingMode !== "disabled" && (
                    <div
                      id={careSectionDomIds.feeding}
                      className="rounded-xl transition-shadow"
                    >
                      <FeedingSection
                        entries={booking.feedingInstructions ?? []}
                        required={feedingMode === "required"}
                      />
                    </div>
                  )}
                  {!isCancelled && medicationMode !== "disabled" && (
                    <div
                      id={careSectionDomIds.medication}
                      className="rounded-xl transition-shadow"
                    >
                      <MedicationSection
                        entries={booking.medicationInstructions ?? []}
                        required={medicationMode === "required"}
                      />
                    </div>
                  )}
                  {!isCancelled && belongingsMode !== "disabled" && (
                    <BelongingsSection
                      entries={booking.belongings ?? []}
                      isCompleted={booking.status === "completed"}
                      required={belongingsMode === "required"}
                    />
                  )}
                </>
              );
            })()}

            {/* Guest Journal — only for boarding (the only service with multi-day care logs) */}
            {isBoarding && !isCancelled && (
              <ReservationJournalPanel
                bookingId={booking.id}
                petIds={
                  Array.isArray(booking.petId) ? booking.petId : [booking.petId]
                }
              />
            )}

            {/* Notes */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <BookingNotes />
              </CardContent>
            </Card>

            {/* Tasks */}
            {tasks.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <ListChecks className="size-3.5" />
                      Tasks
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[11px]">
                        {completedTasks} of {tasks.length} done
                      </span>
                      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{
                            width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-0.5">
                    {tasks.slice(0, 10).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                          task.status === "completed"
                            ? "opacity-50"
                            : "hover:bg-muted/40",
                        )}
                      >
                        <button
                          onClick={() => {
                            if (task.status === "pending") startTask(task.id);
                            else if (task.status === "in_progress")
                              completeTask(task.id, "You");
                            setTasks(getTasksForBooking(bookingId));
                          }}
                          disabled={
                            task.status === "completed" ||
                            task.status === "skipped"
                          }
                          className="shrink-0"
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : task.status === "in_progress" ? (
                            <CircleDot className="size-4 text-blue-500" />
                          ) : (
                            <Circle className="text-muted-foreground/30 size-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "text-[13px]",
                              task.status === "completed" &&
                                "text-muted-foreground line-through",
                            )}
                          >
                            {task.name}
                          </span>
                        </div>
                        {task.isRequired && task.status !== "completed" && (
                          <Badge
                            variant="outline"
                            className="border-red-200 bg-red-50 text-[8px] text-red-600"
                          >
                            Required
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[8px] capitalize"
                        >
                          {task.category}
                        </Badge>
                        {task.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              completeTask(task.id, "You");
                              setTasks(getTasksForBooking(bookingId));
                              toast.success("Task completed");
                            }}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips Section */}
            {isPaid && (
              <Card id="tips" className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <HandCoins className="size-3.5" />
                      Tips
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px]"
                      onClick={() => setTipSplitOpen(true)}
                    >
                      Edit Split
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {(invoice?.tipTotal ?? 0) > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-muted-foreground text-sm">
                          Total Tip
                        </span>
                        <span className="font-[tabular-nums] text-lg font-bold">
                          ${(invoice?.tipTotal ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <Separator />
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Distribution
                      </p>
                      <div className="space-y-1.5">
                        {(invoice?.items ?? [])
                          .filter(
                            (item) =>
                              item.price > 0 && item.type !== "package_credit",
                          )
                          .map((item, idx) => {
                            const staffName =
                              item.staffName ??
                              booking.stylistPreference ??
                              "Staff";
                            const totalSvc = (invoice?.items ?? [])
                              .filter(
                                (i) =>
                                  i.price > 0 && i.type !== "package_credit",
                              )
                              .reduce((s, i) => s + i.price, 0);
                            const pct =
                              totalSvc > 0 ? item.price / totalSvc : 0;
                            const tipShare =
                              Math.round((invoice?.tipTotal ?? 0) * pct * 100) /
                              100;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-md border px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {staffName}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {item.name} · ${item.price.toFixed(2)} (
                                    {(pct * 100).toFixed(0)}%)
                                  </p>
                                </div>
                                <span className="font-[tabular-nums] text-sm font-semibold">
                                  ${tipShare.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-2 text-center text-sm">
                      No tip recorded for this booking
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right — 2 cols — Invoice */}
          <div className="lg:col-span-2">
            <div className="sticky top-4">
              {invoice ? (
                <InvoicePanel
                  invoice={invoice}
                  client={client}
                  pendingCare={careStatus.pending}
                  hasCriticalCare={careStatus.hasCritical}
                />
              ) : (
                <Card>
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                      Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Base Price
                        </span>
                        <span className="font-[tabular-nums] font-medium">
                          ${booking.basePrice.toFixed(2)}
                        </span>
                      </div>
                      {booking.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Discount
                          </span>
                          <span className="font-[tabular-nums] font-medium text-emerald-600">
                            -${booking.discount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {addedSubtotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Added Items
                          </span>
                          <span className="font-[tabular-nums] font-medium text-amber-600">
                            +${addedSubtotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="font-[tabular-nums] text-2xl font-bold">
                          ${(booking.totalCost + addedSubtotal).toFixed(2)}
                        </span>
                      </div>
                      {!isPaid && !isCancelled && (
                        <Button
                          className="mt-2 h-10 w-full gap-1.5"
                          onClick={() => setPaymentOpen(true)}
                        >
                          <CreditCard className="size-4" />
                          Accept Payment
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        <PageAuditTrail area="bookings" />

        {/* QuickBooks Sync — owner/manager only, below Change History */}
        {(role === "owner" || role === "manager") && (
          <QuickBooksSyncPanel
            sync={booking.quickbooksSync}
            invoiceId={invoice?.id}
          />
        )}

        {/* Edit Booking Wizard — pre-filled with current booking details */}
        <BookingModal
          open={editOpen}
          onOpenChange={setEditOpen}
          clients={clients}
          facilityId={booking.facilityId}
          facilityName={facility?.name ?? ""}
          editMode
          preSelectedClientId={booking.clientId}
          preSelectedPetId={
            Array.isArray(booking.petId) ? booking.petId[0] : booking.petId
          }
          preSelectedService={booking.service}
          preSelectedStartDate={booking.startDate}
          preSelectedEndDate={booking.endDate}
          preSelectedCheckInTime={booking.checkInTime}
          preSelectedCheckOutTime={booking.checkOutTime}
          preSelectedRoomId={booking.unitAssignment ?? undefined}
          preSelectedDaycareSectionId={booking.sectionId ?? undefined}
          preSelectedDaycareDates={booking.daycareSelectedDates}
          preSelectedExtraServices={
            (booking.extraServices?.filter(
              (s): s is ExtraService => typeof s !== "string",
            ) ?? [])
          }
          preSelectedFeedingSchedule={booking.feedingSchedule}
          preSelectedMedications={booking.medications}
          preSelectedSpecialRequests={booking.specialRequests}
          onCreateBooking={() => {
            setEditOpen(false);
            toast.success(`${bookingRef} updated`);
          }}
        />
        <ProcessPaymentModal
          booking={booking}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onConfirm={(bId, m) => {
            setPaymentOpen(false);
            toast.success(`Payment via ${m} for #${bId}`);
          }}
        />
        <CancelBookingModal
          booking={booking}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          onConfirm={(bId, r) => {
            setCancelOpen(false);
            toast.success(`${bookingRef} cancelled: ${r}`);
          }}
        />
        <BookingTransferModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          bookingId={booking.id}
          currentLocationId={locations[0]?.id ?? "loc-dv-main"}
          service={booking.service}
          basePrice={booking.basePrice}
          petName={pet?.name ?? "Pet"}
          clientName={client.name}
          startDate={booking.startDate}
          endDate={booking.endDate}
          locations={locations}
        />
        {unifiedForEarlyCheckout && (
          <CheckOutDialog
            booking={unifiedForEarlyCheckout}
            open={earlyCheckoutOpen}
            onOpenChange={setEarlyCheckoutOpen}
            isEarlyCheckout
            onConfirm={({ timestamp, reason }) => {
              toast.success(
                `Early checkout recorded for ${bookingRef}${reason ? ` · "${reason}"` : ""}`,
              );
            }}
          />
        )}
        {boardingGuestForPrint && (
          <PrintKennelCardsModal
            open={boardingSheetOpen}
            onClose={() => setBoardingSheetOpen(false)}
            guests={[boardingGuestForPrint]}
            initialFormat="kennel"
          />
        )}
        <PaymentCheckoutFlow
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          amountDue={
            (invoice?.remainingDue ?? booking.totalCost) +
            addedSubtotal +
            (pendingLateFee?.amount ?? 0)
          }
          depositPaid={invoice?.depositCollected ?? 0}
          invoiceTotal={
            (invoice?.total ?? booking.totalCost) +
            addedSubtotal +
            (pendingLateFee?.amount ?? 0)
          }
          otherUnpaidInvoices={initialBookings
            .filter(
              (b) =>
                b.clientId === clientId &&
                b.id !== bookingId &&
                b.paymentStatus === "pending" &&
                b.status !== "cancelled",
            )
            .map((b) => ({
              invoiceId: b.invoice?.id ?? String(10000 + b.id),
              service: b.service,
              amount: b.invoice?.remainingDue ?? b.totalCost,
            }))}
          onConfirm={(payment) => {
            const lateFee = pendingLateFee;
            setBooking((prev) => {
              if (!prev) return prev;
              const existing = prev.invoice;
              const newPayment = {
                date: new Date().toISOString(),
                method: payment.method,
                amount: payment.amount,
                kind: "final" as const,
              };
              const lateFeeAmount = lateFee?.amount ?? 0;
              const lateFeeLineItem: InvoiceLineItem | null = lateFee
                ? {
                    name: lateFee.label,
                    unitPrice: lateFee.amount,
                    quantity: 1,
                    price: lateFee.amount,
                  }
                : null;
              return {
                ...prev,
                status: "completed",
                paymentStatus: "paid",
                invoice: existing
                  ? {
                      ...existing,
                      status: "closed",
                      remainingDue: 0,
                      items: [...existing.items, ...addedItems],
                      fees: lateFeeLineItem
                        ? [...existing.fees, lateFeeLineItem]
                        : existing.fees,
                      subtotal: existing.subtotal + addedSubtotal,
                      total: existing.total + addedSubtotal + lateFeeAmount,
                      tipTotal: (existing.tipTotal ?? 0) + payment.tip,
                      payments: [...existing.payments, newPayment],
                    }
                  : existing,
              };
            });
            setAddedItems([]);
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
                toast.success(`Report card sent to ${client.name}`);
                setReportCardSent(true);
              } else if (mode === "scheduled") {
                toast.success(
                  `Report card scheduled for ${reportCardConfig.autoSend.sendTime ?? "18:00"}`,
                );
                setReportCardSent(true);
              }
            }
          }}
        />
        <TipSplitModal
          open={tipSplitOpen}
          onOpenChange={setTipSplitOpen}
          totalTip={invoice?.tipTotal ?? 5}
          staffServices={
            invoice?.items
              ? invoice.items
                  .filter(
                    (item) => item.type !== "package_credit" && item.price > 0,
                  )
                  .map((item) => ({
                    staffName:
                      item.staffName ?? booking.stylistPreference ?? "Staff",
                    serviceName: item.name,
                    serviceValue: item.price,
                    multiStaff: false,
                  }))
              : [
                  {
                    staffName: booking.stylistPreference ?? "Staff",
                    serviceName: `${booking.service} — ${booking.serviceType?.replace("_", " ") ?? "standard"}`,
                    serviceValue: booking.basePrice,
                    multiStaff: false,
                  },
                ]
          }
          onSave={() => {}}
        />
        <DepositChargeModal
          open={depositOpen}
          onOpenChange={setDepositOpen}
          ruleAmount={ruleDepositAmount}
          ruleLabel={ruleDepositLabel}
          onCharge={(amount, method) => {
            toast.success(
              `Deposit of $${amount.toFixed(2)} charged via ${method}`,
            );
          }}
        />
        <PrepaymentModal
          open={prepaymentOpen}
          onOpenChange={setPrepaymentOpen}
          remainingDue={invoice?.remainingDue ?? booking.totalCost}
          invoiceTotal={invoice?.total ?? booking.totalCost}
          alreadyCollected={invoice?.depositCollected ?? 0}
          onConfirm={() => {
            // Invoice stays Open; staff can still add items and run final checkout later.
          }}
        />
        <SendEstimateModal
          open={estimateOpen}
          onOpenChange={setEstimateOpen}
          clientName={client.name}
          clientEmail={client.email}
          clientPhone={client.phone}
          subtotal={invoice?.subtotal ?? booking.totalCost}
          discount={invoice?.discount ?? booking.discount}
          taxAmount={invoice?.taxAmount ?? 0}
          total={invoice?.total ?? booking.totalCost}
          depositRequired={ruleDepositAmount}
          onApplyDiscount={(amount, reason) => {
            toast.success(
              `Discount applied: $${amount.toFixed(2)} — ${reason}`,
            );
          }}
        />
        <RefundModal
          open={refundOpen}
          onOpenChange={setRefundOpen}
          invoiceTotal={invoice?.total ?? booking.totalCost}
          amountPaid={invoice?.depositCollected ?? booking.totalCost}
          items={(invoice?.items ?? []).map((i) => ({
            name: i.name,
            price: i.price,
          }))}
          onConfirm={(refund) => {
            toast.success(
              `Refund of $${refund.amount.toFixed(2)} processed via ${refund.method}`,
            );
          }}
        />
        <AddRetailItemModal
          open={retailOpen}
          onOpenChange={setRetailOpen}
          onAddItems={(items) => {
            setAddedItems((prev) => [
              ...prev,
              ...items.map((i) => ({
                name: i.name,
                unitPrice: i.price / i.quantity,
                quantity: i.quantity,
                price: i.price,
              })),
            ]);
          }}
        />
        <CareCompletionGateDialog
          open={careGateOpen}
          pending={careStatus.pending}
          hasCritical={careStatus.hasCritical}
          onClose={() => setCareGateOpen(false)}
          onReview={() => {
            setCareGateOpen(false);
            const firstId = careStatus.pending[0]?.domId;
            if (firstId && typeof document !== "undefined") {
              const el = document.getElementById(firstId);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          onContinueAnyway={() => {
            setCareGateOpen(false);
            toast(
              `Proceeding to checkout with ${careStatus.pending.length} unlogged care item${careStatus.pending.length > 1 ? "s" : ""}`,
              {
                description:
                  "Recorded on the booking audit trail for manager review",
              },
            );
            openCheckout();
          }}
        />
        <AlertDialog
          open={destructiveConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setDestructiveConfirm(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {destructiveConfirm?.title ?? "Are you sure?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {destructiveConfirm?.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep as is</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  destructiveConfirm?.onConfirm();
                  setDestructiveConfirm(null);
                }}
              >
                {destructiveConfirm?.confirmLabel ?? "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
