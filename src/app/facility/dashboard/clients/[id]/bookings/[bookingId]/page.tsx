"use client";

import { use, useState, useMemo } from "react";
import { useDepositRules, usePricingRules } from "@/lib/api/facility-settings";
import Link from "next/link";
import {
  PawPrint,
  CreditCard,
  Banknote,
  ClipboardList,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
  MapPin,
  AlertTriangle,
  HandCoins,
  LogOut,
  CircleAlert,
  CircleHelp,
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
import {
  BookingActionBar,
  type BookingActionHandlers,
} from "@/components/bookings/booking-actions/BookingActionBar";
import { useBookingActions } from "@/components/bookings/booking-actions/use-booking-actions";
import { useBookingArrival } from "@/lib/api/booking-arrival";
import { arrivalFailure } from "@/lib/bookings/arrival-failure";
import { usePermission } from "@/hooks/use-facility-rbac";
import { printBookingInvoice } from "./_lib/print-invoice";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClientEstimates } from "@/lib/api/estimates";
import { useClientRecord } from "@/lib/api/client";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import type { BoardingGuest } from "@/data/boarding";
import { PrintKennelCardsModal } from "@/components/facility/boarding/kennel-card-print";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AcceptPaymentButton,
  BookingPaymentBreakdown,
} from "@/components/bookings/BookingPaymentBreakdown";
import {
  applyFeedingLog,
  applyMedicationLog,
  careLogStamp,
  feedingEntriesFromSchedule,
  medicationEntriesFromItems,
  medicationTaskKey,
} from "@/lib/bookings/care-instructions";
import { careLogKeys, careLogQueries, logCare } from "@/lib/api/care-log";
import type { BookingLineItem } from "@/app/api/bookings/[ref]/line-items/route";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { useStoreCredit } from "@/lib/api/store-credit";
import { bookingMutations } from "@/lib/api/booking";
import { useBoardingStayUpdate } from "@/lib/api/boarding-attendance";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useCreateBookingFromModal } from "@/components/bookings/use-create-booking";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import {
  formatDateLong as formatDateLongIn,
  formatMoney as formatMoneyIn,
} from "@/lib/i18n/format";
import { useInvoiceTemplate } from "@/hooks/use-invoice-template";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { bookingTotals } from "@/lib/payments/booking-totals";
import type { Booking } from "@/types/booking";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { useSaveBookingEdit } from "@/components/bookings/use-save-booking-edit";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { CheckOutDialog } from "@/components/facility/dashboard/check-out-dialog";
import type { UnifiedBooking } from "@/hooks/use-unified-bookings";
import { TagList } from "@/components/shared/TagList";
import { PaymentCheckoutFlow } from "@/components/bookings/PaymentCheckoutFlow";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";
import { useMembershipPlans, useMemberships } from "@/lib/api/memberships";
import { memberDiscount } from "@/lib/memberships/figures";
import { TipSplitModal } from "@/components/bookings/TipSplitModal";
import { DepositChargeModal } from "@/components/bookings/DepositChargeModal";
import { PrepaymentModal } from "@/components/bookings/PrepaymentModal";
import { CareCompletionGateDialog } from "@/components/bookings/CareCompletionWarning";
import { getPendingCareItems, careSectionDomIds } from "@/lib/care-completion";
import {
  findApplicableDepositRule,
  computeDepositAmount,
} from "@/lib/settings/deposits";
import { RefundModal } from "@/components/bookings/RefundModal";
import { AddRetailItemModal } from "@/components/bookings/AddRetailItemModal";
import {
  computeLatePickupFee,
  type LateFeeResult,
} from "@/lib/late-pickup-fee";
import { MoveBookingLocationDialog } from "@/components/bookings/modals/MoveBookingLocationDialog";
import { useLocationContext } from "@/hooks/use-location-context";
import { toast } from "sonner";
import { getPetAgeDisplay } from "@/lib/pet-utils";
import { useFieldMask } from "@/lib/staff/mask";
import { useBookingStatusRules } from "@/lib/api/facility-settings";
import { isBookingStatus } from "@/lib/settings/booking-statuses";
import { useAssignedScope } from "@/lib/facility-permissions";
import { bookingQueries, useAssignedBookingRefs } from "@/lib/api/booking";
import { incidentQueries } from "@/lib/api/incidents";
import {
  balanceOf,
  refundTender,
  useCancelBooking,
  useChargeBooking,
  useRefundBooking,
  useRefundBookingToCard,
  useSendPayLink,
  useMarkBookingNoShow,
  type Tender,
} from "@/lib/api/booking-money";
import { useAddLineItems } from "@/lib/api/booking-line-items";
import { useBookingCheckout } from "@/hooks/use-booking-checkout";
import { useBookingTips, useSetTipSplit } from "@/lib/api/booking-tips";
import { tipStillToCollect } from "@/lib/payments/pledged-tip";
import { staffQueries } from "@/lib/api/staff";
import { AccessRestricted } from "@/components/employee/AccessRestricted";
import { ClientInfoStrip } from "@/components/clients/ClientInfoStrip";
import { NotesButton } from "@/components/shared/NotesButton";
import { NotesList } from "@/components/shared/NotesList";
import { TagsButton } from "@/components/shared/TagsButton";
import { BookingStatusDropdown } from "@/components/bookings/BookingStatusDropdown";
import { FeedingSection } from "@/components/bookings/FeedingSection";
import { MedicationSection } from "@/components/bookings/MedicationSection";
import { BelongingsSection } from "@/components/bookings/BelongingsSection";
import { BookingJournal } from "@/components/guest-journal/BookingJournal";
import { formatBookingRef } from "@/lib/booking-id";
import type { ExtraService } from "@/types/booking";
import { BookingTasksCard } from "@/components/bookings/BookingTasksCard";
import { YipyyGoBookingCard } from "@/components/yipyygo/staff/yipyy-go-booking-card";
import { taskTemplateQueries } from "@/lib/api/task-templates";
import { PageHeader } from "@/components/ui/page-header";

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

// ========================================
// Page
// ========================================

export default function ClientBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookingId: string }>;
}) {
  const { id, bookingId: bookingIdStr } = use(params);
  // The facility's own surcharges and discounts, from `facility_settings`.
  // These used to come from localStorage, so what a customer was charged
  // depended on which browser took the booking.
  const { rules: pricingRules, isPending: pricingPending } = usePricingRules();
  // The facility's deposit terms. This page called loadDepositRules() at
  // checkout — localStorage, falling back to the seed file — so what a customer
  // was asked for at the desk depended on the browser in front of them.
  const { rules: depositRules, isPending: depositRulesPending } =
    useDepositRules();
  // Hide the booking dollar amount from staff without view_booking_financials
  // (Table 21). TODO: also strip server-side when a backend exists.
  const { maskAmount, canSee } = useFieldMask();
  // Section 3C / Table 5 — OMIT the invoice/payment panel and Tips card from the
  // DOM (not just mask) without view_booking_financials.
  const canSeeBookingAmounts = canSee("booking_financials");
  // Section 8B: viewer's fs-* id when view_bookings is assigned_only, else
  // undefined. Used below to 403 on a booking outside the viewer's assigned set.
  const assignedStaffId = useAssignedScope("view_bookings");
  const { refs: assignedRefs, pending: assignedPending } =
    useAssignedBookingRefs(assignedStaffId);
  const urlClientId = parseInt(id, 10);
  const bookingId = parseInt(bookingIdStr, 10);

  // The facility's own module configs and booking-flow rules. Both were read
  // from `src/data/settings.ts`, so the evaluation gate and the per-service
  // care-instruction visibility were the same for every facility.
  const {
    daycare,
    boarding,
    grooming,
    training,
    bookingFlow: facilityBookingFlowConfig,
  } = useSettings();
  // ── ONE BOOKING, AND ITS OWN CLIENT ────────────────────────────────────
  //
  // This read the client's WHOLE booking history (`byClient`) and the
  // facility's WHOLE client list to show one booking — for an invoice panel
  // that no longer exists and an edit wizard that cannot change the client
  // anyway (`editablePatch`). On a client with a long history that read hits
  // the 8-second statement timeout, and the page said "Booking not found."
  //
  // The client is the one the BOOKING names, not the one in the URL: the URL
  // is how the page was reached, the row is what it is about.
  const {
    data: booking,
    isPending: bookingPending,
    error: bookingError,
    refetch: refetchBooking,
  } = useQuery({
    ...bookingQueries.detail(bookingId),
    enabled: Number.isInteger(bookingId),
  });
  const {
    client,
    pending: clientPending,
    error: clientError,
    retry: retryClient,
  } = useClientRecord(booking?.clientId ?? urlClientId);
  // Everything below is about the BOOKING's client.
  const clientId = booking?.clientId ?? urlClientId;
  // ── THE CARE LOG ────────────────────────────────────────────────────────
  //
  // What was actually done, from `care_log_entries` (20260819140000). Before
  // that table the FEEDING and MEDICATIONS panels kept their own useState and
  // a reload lost every meal and dose, which is why their controls were hidden
  // in PR #145.
  //
  // `logDay` is fixed for the life of the mount rather than read per render:
  // `new Date()` in a render body is what the React Compiler rules exist to
  // stop, and a journal that silently rolled over at midnight mid-shift would
  // file the 00:05 dose against tomorrow.
  const queryClient = useQueryClient();
  // The booking's incidents, for the in-stay care still due at checkout.
  const { data: facilityIncidents } = useQuery(incidentQueries.all());
  const { data: careLog } = useQuery({
    ...careLogQueries.forBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  const [logDay] = useState(() => new Date().toISOString().slice(0, 10));

  const recordCare = useMutation({
    mutationFn: logCare,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: careLogKeys.forBooking(bookingId),
      }),
    onError: (error: unknown) =>
      toast.error("Not recorded", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      }),
  });

  const cancelBooking = useCancelBooking();
  const refundBooking = useRefundBooking();
  const refundToCard = useRefundBookingToCard();
  const sendPayLink = useSendPayLink();
  const chargeBooking = useChargeBooking();
  const addLineItems = useAddLineItems();
  // Traceability: the estimate this booking was converted from, if any.
  // The estimate this booking was converted from, among the client's own —
  // the fixture matched a real booking to an invented estimate by number.
  const { estimates: clientEstimates } = useClientEstimates(clientId);
  const sourceEstimate = useMemo(
    () =>
      booking
        ? clientEstimates.find((e) => e.convertedBookingId === booking.id)
        : undefined,
    [booking, clientEstimates],
  );
  const {
    discount: loyaltyDiscount,
    consume: consumeLoyaltyDiscount,
    release: releaseLoyaltyDiscount,
  } = useActiveLoyaltyDiscount({
    clientRef: clientId,
    subtotal: booking?.totalCost ?? 0,
    serviceType: booking?.service?.toLowerCase(),
  });
  const [pendingLateFee, setPendingLateFee] = useState<LateFeeResult | null>(
    null,
  );
  // ── THE MEMBERSHIP DISCOUNT COMES OFF THE BILL ─────────────────────────
  //
  // A member was sold "10% off" and nothing on the facility side ever took it
  // off anything: the checkout read no membership at all, and the booking
  // modal's "benefits applied" box read a fixture and changed no amount. The
  // client's ACTIVE membership (customer_memberships), for a service its plan
  // covers, is offered here like the loyalty reward — and written onto the
  // bill as a negative line before the money moves, so `amount_due` agrees.
  // Once the line is on the bill it is not offered again: a second payment on
  // the same booking must not take the discount twice.
  const { data: clientMembershipRows } = useMemberships(clientId);
  const { data: membershipPlanRows } = useMembershipPlans();
  const { fill: fillJoin } = useStaffText("joinMembership");
  const pets = (() => {
    if (!client || !booking) return [];
    const pids = Array.isArray(booking.petId) ? booking.petId : [booking.petId];
    return pids
      .map((pid) => client.pets?.find((p) => p.id === pid))
      .filter(Boolean) as NonNullable<(typeof client.pets)[number]>[];
  })();
  const pet = pets[0] ?? null;

  const nights = booking
    ? nightsBetween(booking.startDate, booking.endDate)
    : 0;

  const unifiedForEarlyCheckout: UnifiedBooking | null = (() => {
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
  })();
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

  // THE FACILITY'S OWN RULES (`booking_status_rules`). These were read off
  // fixture facility 11 — every booking is mapped with `facilityId: 11` — so
  // every facility checked in and out by the demo facility's rules.
  const { rules: statusRules } = useBookingStatusRules();
  const autoTransitions: Record<string, string> = statusRules.autoTransitions;
  const iftttTransitionRules: IftttTransitionRule[] =
    statusRules.iftttTransitionRules;

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

      // A custom status is a label: `bookings.status` is an enum and would
      // refuse it, so a rule aimed at one is passed over.
      return isBookingStatus(rule.targetStatus);
    });

    if (matchedRule) {
      return {
        target: matchedRule.targetStatus,
        sourceLabel: "IFTTT rule",
      };
    }

    const fallbackTarget = autoTransitions[action];
    if (fallbackTarget && isBookingStatus(fallbackTarget)) {
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

  const [editOpen, setEditOpen] = useState(false);
  // "Review and approve" opens the same wizard; saving it confirms the request.
  const [approveOnSave, setApproveOnSave] = useState(false);
  const saveEdit = useSaveBookingEdit(booking);
  const {
    t: detailT,
    fill: detailFill,
    locale: detailLocale,
  } = useStaffText("bookingDetail");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const { locations } = useLocationContext();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [earlyCheckoutOpen, setEarlyCheckoutOpen] = useState(false);
  const [tipSplitOpen, setTipSplitOpen] = useState(false);

  // ── The tip, and who is owed it ──────────────────────────────────────────
  //
  // Read only while the modal is open: the booking page is already heavy, and
  // nothing else on it shows a tip allocation.
  // `bookingId` rather than `booking.id`: this runs above the guard that
  // narrows `booking`, and it is the same number — the route param IS the ref.
  // Always, not only while the split dialog is open: the Tips card reads the
  // ledger's figure too, instead of the fixture invoice's `tipTotal`.
  const { data: tips } = useBookingTips(bookingId);
  const setTipSplit = useSetTipSplit();
  const { data: staffProfiles } = useQuery({
    ...staffQueries.profiles(),
    enabled: tipSplitOpen,
  });

  /**
   * The facility's actual people.
   *
   * The modal used to offer five hardcoded names. `rowId` is the staff row's
   * uuid — `id` is the legacy string ("fs-003") and cannot be a foreign key —
   * and anyone without one is dropped rather than sent as an id the database
   * will reject.
   */
  const tipStaffOptions = useMemo(
    () =>
      (staffProfiles ?? [])
        .filter((p) => p.status === "active" && p.rowId)
        .map((p) => ({
          id: p.rowId!,
          name: `${p.firstName} ${p.lastName}`.trim(),
        })),
    [staffProfiles],
  );
  const [depositOpen, setDepositOpen] = useState(false);
  const [prepaymentOpen, setPrepaymentOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [retailOpen, setRetailOpen] = useState(false);
  const [boardingSheetOpen, setBoardingSheetOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  // Flow C: checkout must lock any open incident's in-stay care first. Holds the
  // pending checkout action to run after the manager confirms the lock.
  // Was `useState<InvoiceLineItem[]>` — items lived here until checkout cleared
  // them. They are rows now, summed into `extras_total` by the database
  // (20260806820000), so this reads what the booking actually carries rather
  // than what this tab happens to remember.
  const [destructiveConfirm, setDestructiveConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [careGateOpen, setCareGateOpen] = useState(false);

  const isBoarding = booking?.service.toLowerCase() === "boarding";

  const boardingGuestForPrint: BoardingGuest | null = (() => {
    if (!isBoarding || !booking || !pet) return null;
    const refId = `bk-${String(booking.id).padStart(3, "0")}`;
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
      createdAt: booking.startDate,
    } as BoardingGuest;
  })();

  const bookingRef = formatBookingRef(booking?.id ?? bookingId);
  // Above the early returns below — a hook after a conditional return is
  // called in a different order on the render where the booking is loading.
  const updateStatus = useUpdateBookingStatus();
  const boardingStay = useBoardingStayUpdate();
  // The client's store credit, so the till can offer it. The tender existed
  // and record_payment spends the ledger correctly, but the page never passed
  // a balance, so the checkout filtered store credit out for everybody.
  const { data: storeCredit } = useStoreCredit();
  const {
    t: gcT,
    fill: gcFill,
    locale: gcLocale,
  } = useStaffText("checkoutGiftCard");
  const { openBookingModal } = useBookingModal();
  const createBooking = useCreateBookingFromModal();
  const { profile: facilityProfile } = useFacilityProfile();
  // The printed invoice/receipt: the facility's own identity and its own tax,
  // not the template fixture's "Example Pet Care Facility" and its fabricated
  // GST number.
  const invoiceTemplate = useInvoiceTemplate();
  const facilityTaxConfig = useFacilitySettings().settings.tax_config
    .value as TaxConfig;
  // The facility's tax on part of the supply — a deposit, a prepayment —
  // recorded with it, as the checkout does. Nothing where prices include it.
  const taxOnSupply = (amount: number) =>
    facilityTaxConfig.pricesIncludeTax
      ? 0
      : computeTax(Math.round(amount * 100), facilityTaxConfig).totalCents /
        100;
  // ── WHAT GOES ON A PRINTED RECEIPT ──────────────────────────────────────
  //
  // The same rows the Payment Summary panel shows, so the paper a customer
  // takes away and the screen the counter is reading cannot disagree. Same
  // query key as BookingPaymentBreakdown, so this is the cache, not a second
  // request.
  //
  // ABOVE the early returns below, and keyed on `bookingId` rather than
  // `booking.id`: a hook after a conditional return is called in a different
  // order on the render where the booking is still loading.
  const { data: bookingLineItemsData } = useQuery({
    queryKey: ["bookings", booking?.id ?? bookingId, "line-items"],
    queryFn: async (): Promise<BookingLineItem[]> => {
      const response = await fetch(
        `/api/bookings/${booking?.id ?? bookingId}/line-items`,
      );
      if (!response.ok) throw new Error("Could not read the bill.");
      return (await response.json()) as BookingLineItem[];
    },
    enabled: Boolean(booking?.id ?? bookingId),
    staleTime: 30_000,
  });
  const bookingLineItems = bookingLineItemsData ?? [];
  const membershipOffer = booking
    ? memberDiscount(
        clientMembershipRows ?? [],
        membershipPlanRows ?? [],
        String(booking.service ?? ""),
        booking.totalCost ?? 0,
        booking.startDate,
      )
    : null;
  const membershipLabel = membershipOffer
    ? fillJoin("discountLine", {
        plan: membershipOffer.planName,
        pct: membershipOffer.percent,
      })
    : "";
  const membershipDiscount =
    membershipOffer &&
    !bookingLineItems.some((line) => line.name === membershipLabel)
      ? {
          label: membershipLabel,
          amount: Math.min(
            membershipOffer.amount,
            Math.max(
              0,
              (booking?.amountDue ?? booking?.totalCost ?? 0) -
                (loyaltyDiscount?.amount ?? 0),
            ),
          ),
        }
      : null;

  // The checkout's handler: awaited end to end, and it throws on every
  // failure so the dialog stays open with the reason. See the hook's banner.
  const checkout = useBookingCheckout({
    booking,
    clientRef: clientId,
    lateFee: pendingLateFee,
    clearLateFee: () => setPendingLateFee(null),
    loyaltyDiscount,
    consumeLoyaltyDiscount,
    releaseLoyaltyDiscount,
    membershipDiscount,
    text: {
      discountRefused: fillJoin("discountRefused", {}),
      giftCardNoTip: gcT("noTip"),
      giftCardRemaining: (amount) =>
        gcFill("remaining", { amount: formatMoneyIn(amount, gcLocale) }),
    },
  });

  // The facility's task routine, which the generator needs to build this
  // booking's task list. Every module's, because the booking's service decides
  // which apply and the generator filters on it.
  const { data: allTaskTemplates = [] } = useQuery(taskTemplateQueries.all());

  // ── WHAT CAN HAPPEN NEXT ────────────────────────────────────────────────
  //
  // The lifecycle's answer for this viewer (src/lib/bookings/booking-
  // lifecycle.ts), and the one write path for arriving and leaving. Above the
  // early returns: hooks.
  const arrival = useBookingArrival();
  const markNoShow = useMarkBookingNoShow();
  const canTakePayment = usePermission("take_payment");
  const { t: actT, fill: actFill } = useStaffText("bookingActions");
  const bookingActions = useBookingActions(booking, {
    depositRuleApplies: Boolean(
      booking &&
      !depositRulesPending &&
      findApplicableDepositRule(
        booking.service,
        booking.totalCost,
        depositRules,
      ),
    ),
    multiLocation: locations.length > 1,
  });

  // ── THREE ANSWERS, NOT ONE ─────────────────────────────────────────────
  //
  // "Not found" is a conclusion, and it needs the answers back before it can be
  // drawn. And a read that FAILED is not a booking that does not exist: this
  // page used to say "Booking not found." for both, so a timeout told staff
  // the booking they had just opened was gone.
  if (bookingError || clientError) {
    return (
      <RouteState
        surface="card"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={detailT("loadFailedTitle")}
        description={detailT("loadFailedBody")}
        action={{
          label: detailT("tryAgain"),
          onClick: () => {
            if (bookingError) void refetchBooking();
            if (clientError) retryClient();
          },
        }}
      />
    );
  }

  if (bookingPending || (booking && clientPending)) {
    return (
      <div className="space-y-4 p-5 md:p-7" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid gap-5 lg:grid-cols-5">
          <Skeleton className="h-96 rounded-3xl lg:col-span-3" />
          <Skeleton className="h-96 rounded-3xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!booking || !client) {
    return (
      <RouteState
        surface="card"
        pose="confused"
        icon={CircleHelp}
        inkClassName="text-ink-secondary"
        title={detailT("notFoundTitle")}
        description={detailFill("notFoundBody", {
          ref: formatBookingRef(bookingId),
        })}
        action={{
          label: detailT("backToBookings"),
          href: "/facility/dashboard/bookings",
        }}
      />
    );
  }

  // Section 8B / Part 0.3: a scoped viewer opening a booking URL outside their
  // assigned set is a 403 — render the branded access screen, never the record.
  // (Admin / full-access viewers have assignedStaffId === undefined → no gate.)
  if (assignedPending) return null;
  if (assignedStaffId && !assignedRefs?.has(booking.id)) {
    return <AccessRestricted />;
  }

  /**
   * Reverse a step, or mark a no-show, by writing the status back.
   *
   * These four were confirmation dialogs that ended in a success toast and
   * wrote nothing. What they reverse is what this page's own check-in, confirm
   * and checkout write — the booking's status — so that is what they write.
   * `sync_boarding_stay` releases the kennel on a no-show, and
   * `sync_grooming_lifecycle` reopens a groom's checkout.
   */
  const sendPayLinkBy = async (channel: "email" | "sms") => {
    try {
      const result = await sendPayLink.mutateAsync({
        bookingRef: booking.id,
        channel,
      });
      if (result.sent) {
        toast.success(
          detailFill(channel === "email" ? "payLinkEmailed" : "payLinkTexted", {
            name: client.name,
          }),
        );
      } else {
        toast.warning(detailT("payLinkNotSent"), {
          description: result.detail,
        });
      }
    } catch (error) {
      toast.error(detailT("payLinkNotSent"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const revertTo = async (status: Booking["status"], doneKey: string) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status });
      toast.success(detailFill(doneKey, { ref: bookingRef }));
    } catch (error) {
      toast.error(detailFill("statusNotChanged", { ref: bookingRef }), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const invoice = booking.invoice;

  // ── THE ACTIONS, BY LIFECYCLE ID ─────────────────────────────────────────
  //
  // Checking in and out goes through the service's own write
  // (useBookingArrival), so the required forms and the kennel rule apply and
  // the boards agree; the database mirrors it into the status. Everything
  // that is reversible is confirmed first (§5j) and says what it did (§5s).
  const petLabel =
    pets.length === 0
      ? null
      : pets.length <= 2
        ? pets.map((p) => p.name).join(" & ")
        : `${pets[0].name} +${pets.length - 1}`;
  const petName = petLabel ?? bookingRef;
  const owed = balanceOf(booking);

  const arrivalProblem = (error: unknown) => {
    const failure = arrivalFailure(error);
    const key =
      failure === "needs_kennel"
        ? "failNeedsKennel"
        : failure === "not_allowed"
          ? "failNotAllowed"
          : failure === "cannot_now"
            ? "failCannotNow"
            : "failFailed";
    toast.error(actFill(key, { pet: petName }), {
      description: error instanceof Error ? error.message : undefined,
    });
  };

  const confirmThen = (
    title: string,
    description: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) => setDestructiveConfirm({ title, description, confirmLabel, onConfirm });

  const setStatus = async (status: Booking["status"], doneKey: string) => {
    try {
      await updateStatus.mutateAsync({ id: booking.id, status });
      toast.success(actFill(doneKey, { ref: bookingRef, pet: petName }));
    } catch (error) {
      toast.error(detailFill("statusNotChanged", { ref: bookingRef }), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const undoCheckIn = async () => {
    try {
      await arrival.undoCheckIn(booking);
      toast.success(actFill("checkInUndone", { pet: petName }));
    } catch (error) {
      arrivalProblem(error);
    }
  };

  const checkIn = async () => {
    try {
      await arrival.checkIn(booking);
      toast.success(actFill("checkedIn", { pet: petName }), {
        action: { label: actT("undo"), onClick: () => void undoCheckIn() },
      });
    } catch (error) {
      arrivalProblem(error);
      return;
    }
    // A facility's own rule may take a check-in further than checked_in —
    // straight to in progress, say. The arrival is recorded either way.
    const { target } = resolveAutoTransition("onCheckIn");
    if (target && target !== "checked_in") {
      await updateStatus
        .mutateAsync({ id: booking.id, status: target as Booking["status"] })
        .catch(() => undefined);
    }
  };

  const departWithoutTill = async () => {
    try {
      await arrival.checkOut(booking);
      toast.success(actFill("checkedOut", { pet: petName }));
    } catch (error) {
      arrivalProblem(error);
    }
  };

  const reopenCheckout = async () => {
    try {
      await arrival.reopen(booking);
      toast.success(actFill("checkoutUndone", { pet: petName }));
    } catch (error) {
      arrivalProblem(error);
    }
  };

  // The till, behind the care gate: unlogged meals and doses are raised
  // before the money moves, whichever button reached it.
  const toTill = () => {
    if (careStatus.pending.length > 0) {
      setCareGateOpen(true);
      return;
    }
    openCheckout();
  };

  const handlers: BookingActionHandlers = {
    review_request: () => {
      setApproveOnSave(true);
      setEditOpen(true);
    },
    waitlist_request: () => void setStatus("waitlisted", "waitlistedDone"),
    decline_request: () =>
      confirmThen(
        actT("declineTitle"),
        actT("declineBody"),
        actT("declineRequest"),
        () => void setStatus("declined", "declinedDone"),
      ),
    confirm: () => void setStatus("confirmed", "confirmedDone"),
    undo_confirm: () =>
      confirmThen(
        detailT("undoConfirmTitle"),
        detailT("undoConfirmBody"),
        detailT("undoConfirmConfirm"),
        () => void revertTo("pending", "confirmUndone"),
      ),
    charge_deposit: () => setDepositOpen(true),
    take_prepayment: () => setPrepaymentOpen(true),
    check_in: () => void checkIn(),
    no_show: () =>
      confirmThen(
        detailT("noShowTitle"),
        detailT("noShowBody"),
        detailT("noShowConfirm"),
        () =>
          markNoShow.mutate(booking.id, {
            onSuccess: () =>
              toast.success(detailFill("noShowRecorded", { ref: bookingRef })),
            onError: (error) =>
              toast.error(detailFill("statusNotChanged", { ref: bookingRef }), {
                description: error.message,
              }),
          }),
      ),
    // With money owed and a person who can take it, checking out IS the till;
    // otherwise it records the departure and the balance stays on the booking.
    check_out: () =>
      owed > 0 && canTakePayment ? toTill() : void departWithoutTill(),
    check_out_unpaid: () =>
      confirmThen(
        actFill("checkOutUnpaidTitle", { pet: petName }),
        actFill("checkOutUnpaidBody", {
          pet: petName,
          amount: formatMoneyIn(owed, detailLocale),
        }),
        actT("checkOutUnpaid"),
        () => void departWithoutTill(),
      ),
    mark_in_progress: () => void setStatus("in_progress", "inProgressDone"),
    mark_ready: () => void setStatus("ready", "readyDone"),
    undo_check_in: () =>
      confirmThen(
        detailT("undoCheckInTitle"),
        detailT("undoCheckInBody"),
        detailT("undoCheckInConfirm"),
        () => void undoCheckIn(),
      ),
    finish: () => void setStatus("completed", "finishedDone"),
    take_payment: toTill,
    split_tips: () => setTipSplitOpen(true),
    refund: () => setRefundOpen(true),
    undo_checkout: () =>
      confirmThen(
        actT("undoCheckoutTitle"),
        actFill("undoCheckoutBody", { pet: petName }),
        detailT("undoCheckoutConfirm"),
        () => void reopenCheckout(),
      ),
    undo_no_show: () =>
      confirmThen(
        actT("undoNoShowTitle"),
        actT("undoNoShowBody"),
        actT("undoNoShow"),
        () => void setStatus("confirmed", "undoNoShowDone"),
      ),
    reinstate: () =>
      confirmThen(
        actT("reinstateTitle"),
        actT("reinstateBody"),
        actT("reinstate"),
        () => void setStatus("confirmed", "reinstatedDone"),
      ),
    edit: () => setEditOpen(true),
    add_item: () => setRetailOpen(true),
    transfer: () => setTransferOpen(true),
    report_incident: () => setIncidentOpen(true),
    // One step: the cancel dialog IS the confirmation — reason, refund, and
    // "the customer is not messaged from here".
    cancel: () => setCancelOpen(true),
    onPayLink: (channel) => void sendPayLinkBy(channel),
    onPrintInvoice: () =>
      printBookingInvoice({
        booking,
        bookingRef,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        petName: pet?.name,
        lineItems: bookingLineItems,
        taxConfig: facilityTaxConfig,
        template: invoiceTemplate,
        tipCollected: tips?.tipCollected ?? 0,
        locale: detailLocale,
      }),
  };
  const addedSubtotal = booking.extrasTotal ?? 0;

  // "Aug 19, 2026, 8:00 AM - 6:00 PM". A receipt for a day of daycare that does
  // not say which day is not a record of anything.
  const serviceWindowLabel = (() => {
    if (!booking.startDate) return null;
    const day = (value: string) =>
      new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", {
        dateStyle: "medium",
      });
    const times = [booking.checkInTime, booking.checkOutTime]
      .filter(Boolean)
      .join(" - ");
    return booking.endDate && booking.endDate !== booking.startDate
      ? `${day(booking.startDate)} - ${day(booking.endDate)}`
      : `${day(booking.startDate)}${times ? `, ${times}` : ""}`;
  })();

  const storeCreditBalance =
    storeCredit?.accounts.find((a) => a.clientRef === client.id)?.balance ?? 0;

  const openCheckout = () => {
    // ── NOT WHILE THE PRICING RULES ARE IN FLIGHT ─────────────────────────
    //
    // `usePricingRules()` answers with the EMPTY fallback until its query
    // lands, and empty is indistinguishable from "this facility charges no late
    // fee". Opening the till in that window computes no late-pickup fee and
    // presents the bare bill — silently, and only when the request happens to
    // be slow, which is the worst way for a money bug to behave.
    //
    // The same window on the dashboard card disabled its Check Out button
    // instead; here four call sites funnel through this one function, so the
    // guard belongs in it.
    if (pricingPending) {
      toast.info("One moment — loading this facility's fees.");
      return;
    }

    const scheduledEndIso = `${booking.endDate}T${booking.checkOutTime ?? "12:00"}:00`;
    const petCount = Array.isArray(booking.petId) ? booking.petId.length : 1;
    const fee = computeLatePickupFee({
      rules: pricingRules,
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
  const depositRule = depositRulesPending
    ? null
    : findApplicableDepositRule(
        booking.service,
        bookingTotalForDeposit,
        depositRules,
      );
  const ruleDepositAmount = depositRule
    ? computeDepositAmount(depositRule, bookingTotalForDeposit)
    : Math.round(bookingTotalForDeposit * 0.5 * 100) / 100;
  const ruleDepositLabel = depositRule
    ? depositRule.label
    : `50% of total ($${(bookingTotalForDeposit * 0.5).toFixed(2)})`;

  // What has been paid toward this booking, from the payments ledger. The
  // banners read `invoice?.depositCollected` — a fixture blob no real booking
  // carries — so every real booking said "Deposit Required" forever, even
  // with the deposit paid.
  const depositCollected = invoice?.depositCollected ?? booking.amountPaid ?? 0;
  const remainingDue =
    invoice?.remainingDue ?? booking.amountDue ?? booking.totalCost;

  // Care-completion check — surfaces unlogged meals/meds (and incident care,
  // 2B) before checkout.
  const careStatus = getPendingCareItems(
    booking.feedingInstructions,
    booking.medicationInstructions,
    (facilityIncidents ?? []).filter(
      (incident) => incident.bookingId === booking.id,
    ),
  );

  return (
    <div>
      {/* Client info strip — replaces the full sidebar */}
      <ClientInfoStrip
        client={client}
        backHref={`/facility/dashboard/clients/${client.id}`}
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
                // It toasted "Evaluation appointment created" and created
                // nothing. It opens the booking wizard on an evaluation for
                // this pet, and the wizard creates it.
                onClick={() =>
                  openBookingModal({
                    clients: client ? [client] : [],
                    facilityId: booking.facilityId,
                    facilityName: facilityProfile.businessName,
                    preSelectedClientId: client?.id,
                    preSelectedPetId: Array.isArray(booking.petId)
                      ? booking.petId[0]
                      : booking.petId,
                    preSelectedService: "evaluation",
                    onCreateBooking: createBooking,
                  })
                }
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
              {/* "Resend" opened a modal whose Send was a toast. An estimate is
                  its own record now, resent from the Estimates screen. And
                  Confirm said "confirmed" before — and whether or not — the
                  deposit rule moved anything; it writes the status now. */}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => void revertTo("confirmed", "bookingConfirmed")}
              >
                <CheckCircle2 className="size-3.5" />
                Confirm Booking
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => void revertTo("declined", "declinedDone")}
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

        {/* Deposit Notice — unpaid. 5B: deposit amounts are part of the price
            breakdown, so they're omitted without view_booking_amounts. */}
        {/* Only when the facility has a deposit rule that applies to this
            booking — it showed a hard-coded "Rule: 50%" on every booking. */}
        {canSeeBookingAmounts &&
          !isPaid &&
          !isCancelled &&
          depositRule &&
          depositCollected === 0 && (
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
                    {detailFill("depositRuleLine", {
                      rule: ruleDepositLabel,
                      amount: `$${ruleDepositAmount.toFixed(2)}`,
                    })}
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

        {/* Deposit Collected — with auto-confirm note. 5B: omitted without
            view_booking_amounts (it discloses deposit + remaining balance). */}
        {canSeeBookingAmounts && depositCollected > 0 && !isPaid && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Deposit Collected — ${depositCollected.toFixed(2)}
                </p>
                <p className="text-xs text-emerald-600">
                  Remaining balance:{" "}
                  <span className="font-medium tabular-nums">
                    ${remainingDue.toFixed(2)}
                  </span>{" "}
                  {booking.status === "confirmed" ? " · Booking confirmed" : ""}
                </p>
              </div>
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
        <div className="from-card to-muted/20 rounded-xl border bg-linear-to-r p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* §5r: an invoice number and a booking reference never pass
                    through the locale layer. */}
                <PageHeader title={bookingRef} />
                <BookingStatusDropdown
                  currentStatus={booking.status}
                  // Was a toast and nothing else: the dropdown reported a
                  // change the row never made, and a reload put it back.
                  onStatusChange={async (newStatus) => {
                    try {
                      await updateStatus.mutateAsync({
                        id: booking.id,
                        status: newStatus as Booking["status"],
                      });
                      toast.success(
                        `${bookingRef} is now ${newStatus.replace(/_/g, " ")}`,
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "That status could not be saved.",
                      );
                    }
                  }}
                />
                <TagsButton entityType="booking" entityId={booking.id} />
                <NotesButton entityType="booking" entityId={booking.id} />
                {sourceEstimate && (
                  <Link
                    href={`/facility/dashboard/estimates?q=${sourceEstimate.estimateId}`}
                  >
                    <Badge
                      variant="outline"
                      className="hover:bg-muted gap-1 text-xs"
                    >
                      From Estimate {sourceEstimate.estimateId}
                    </Badge>
                  </Link>
                )}
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
            {/* Section 5B / 3C — total + payment status are OMITTED (not greyed)
                without view_booking_amounts. */}
            {canSeeBookingAmounts && (
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {/* The Payment Summary's own total — price, added items,
                      tax and tip — not the bare price it used to show. */}
                  {maskAmount(
                    formatMoneyIn(
                      bookingTotals(booking, facilityTaxConfig).total,
                      detailLocale,
                    ),
                    "booking_financials",
                  )}
                </p>
                <StatusBadge type="status" value={booking.paymentStatus} />
              </div>
            )}
          </div>

          {/* The lifecycle's actions for this viewer — see the handlers. */}
          <BookingActionBar
            actions={bookingActions}
            handlers={handlers}
            petLabel={petLabel}
          />
        </div>

        {/* ── Content Grid ── */}
        <div className="grid gap-5 *:min-w-0 lg:grid-cols-5">
          {/* Left — 3 cols */}
          <div className="min-w-0 space-y-5 lg:col-span-3">
            {/* Booking Details + Pets */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                        className="border-border/70 bg-card hover:border-border flex items-center gap-3 rounded-2xl border p-3 transition-all hover:shadow-sm"
                      >
                        <Link
                          href={`/facility/dashboard/clients/${clientId}/pets/${p.id}`}
                          className="relative block size-12 shrink-0"
                        >
                          {p.imageUrl ? (
                            <div className="ring-background size-12 overflow-hidden rounded-2xl ring-2">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="size-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="bg-primary/10 text-primary ring-background flex size-12 items-center justify-center rounded-2xl font-bold ring-2">
                              {p.name.charAt(0)}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/facility/dashboard/clients/${clientId}/pets/${p.id}`}
                              className="text-sm leading-none font-semibold hover:underline"
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
              // The FACILITY's module configs, not the fixture's. Care-instruction
              // visibility per service is a setting a facility sets; reading it
              // from the shared fixture meant every facility got the same
              // answer whatever they had chosen.
              const serviceConfigMap = {
                daycare,
                boarding,
                grooming,
                training,
              } as Record<string, typeof daycare | undefined>;
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
                      {/* ── WHAT THE OWNER ASKED FOR ─────────────────────
                          `feedingInstructions` is the care CHECKLIST, and no
                          booking made in this app has ever carried one — the
                          wizard stores `feedingSchedule`, which is a different
                          field of a different type. So these panels were empty
                          for every real booking, and looked right only against
                          the two hand-written entries in src/data/bookings.ts.

                          The fixture field stays first so those demo bookings
                          still render; everything else falls through to the
                          owner's schedule, projected into the same shape. */}
                      <FeedingSection
                        key={`feed-${careLogStamp(careLog)}`}
                        entries={applyFeedingLog(
                          booking.feedingInstructions?.length
                            ? booking.feedingInstructions
                            : feedingEntriesFromSchedule(
                                booking.feedingSchedule,
                              ),
                          careLog,
                          logDay,
                        )}
                        required={feedingMode === "required"}
                        onLog={(entryId, outcome) =>
                          recordCare.mutate({
                            bookingRef: booking.id,
                            petRef: pet?.id ?? null,
                            taskKey: entryId,
                            taskType: "feeding",
                            outcome,
                            occurredOn: logDay,
                          })
                        }
                      />
                    </div>
                  )}
                  {!isCancelled && medicationMode !== "disabled" && (
                    <div
                      id={careSectionDomIds.medication}
                      className="rounded-xl transition-shadow"
                    >
                      <MedicationSection
                        // Remounted when the booking's own list changes, so an
                        // added medication appears from the row it was saved to.
                        key={`med-${careLogStamp(careLog)}-${booking.medications?.length ?? 0}`}
                        entries={applyMedicationLog(
                          booking.medicationInstructions?.length
                            ? booking.medicationInstructions
                            : medicationEntriesFromItems(
                                booking.medications,
                                logDay,
                              ),
                          careLog,
                          logDay,
                        )}
                        required={medicationMode === "required"}
                        onAdd={async (item) => {
                          await bookingMutations.update(booking.id, {
                            medications: [...(booking.medications ?? []), item],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["bookings"],
                          });
                        }}
                        onLog={(medicationId, scheduledAt, outcome, notes) =>
                          recordCare.mutate({
                            bookingRef: booking.id,
                            petRef: pet?.id ?? null,
                            taskKey: medicationTaskKey(
                              medicationId,
                              scheduledAt,
                            ),
                            taskType: "medication",
                            outcome,
                            notes,
                            occurredOn: logDay,
                          })
                        }
                      />
                    </div>
                  )}
                  {!isCancelled && belongingsMode !== "disabled" && (
                    <BelongingsSection
                      entries={booking.belongings ?? []}
                      isCompleted={booking.status === "completed"}
                      required={belongingsMode === "required"}
                      onSave={async (belongings) => {
                        await bookingMutations.update(booking.id, {
                          belongings,
                        });
                        await queryClient.invalidateQueries({
                          queryKey: ["bookings"],
                        });
                      }}
                    />
                  )}
                </>
              );
            })()}

            {/* Guest Journal — boarding, the service with multi-day care
                logs. Built from `care_log_entries`; it was the fixture
                ReservationJournalPanel, which can only ever match a fixture
                guest and so showed "no journal yet" for every real stay. */}
            {isBoarding && !isCancelled && (
              <BookingJournal
                booking={booking}
                petName={pet?.name ?? ""}
                careLog={careLog}
              />
            )}

            {/* Notes */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                  {detailT("notesTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {/* The booking's own notes, from public.notes. This card used
                    to be two hard-coded notes about a dog called Buddy, shown
                    on every booking. */}
                <NotesList category="booking" entityId={booking.id} compact />
              </CardContent>
            </Card>

            {/* Tasks — the facility's routine for this service, started and
                finished through the task board. */}
            <BookingTasksCard
              booking={booking}
              templates={allTaskTemplates}
              petName={pet?.name ?? ""}
            />

            {/* The booking’s pre-arrival forms, where the staff email links
                (#yipyy-go): each dog’s form to review or complete, and what
                the desk recorded at check-in. */}
            {booking.yipyyGo?.requirement && (
              <YipyyGoBookingCard bookingRef={booking.id} />
            )}

            {/* Tips Section — omitted without view_booking_financials (3C) */}
            {isPaid && canSeeBookingAmounts && (
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
                  {(tips?.tipCollected ?? 0) > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-muted-foreground text-sm">
                          Total Tip
                        </span>
                        <span className="text-lg font-bold tabular-nums">
                          ${(tips?.tipCollected ?? 0).toFixed(2)}
                        </span>
                      </div>

                      {/* ── WHERE THE TIP CAME FROM ────────────────────────
                          A facility reconciling a till needs to know which of
                          these went through the card reader. Only shown when
                          BOTH exist: labelling a single figure "Terminal" adds
                          nothing when there is nothing to distinguish it from. */}
                      {(tips?.bySource.terminal ?? 0) > 0 &&
                        (tips?.bySource.online ?? 0) > 0 && (
                          <div className="text-muted-foreground space-y-0.5 text-xs">
                            <div className="flex justify-between">
                              <span>Terminal</span>
                              <span className="tabular-nums">
                                ${(tips?.bySource.terminal ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Online</span>
                              <span className="tabular-nums">
                                ${(tips?.bySource.online ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      <Separator />
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Distribution
                      </p>
                      <div className="space-y-1.5">
                        {/* The split as RECORDED, when there is one. */}
                        {!invoice?.items &&
                          (tips?.allocations ?? []).map((allocation) => (
                            <div
                              key={allocation.id}
                              className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                              <p className="text-sm font-medium">
                                {tipStaffOptions.find(
                                  (o) => o.id === allocation.staffId,
                                )?.name ??
                                  allocation.authorName ??
                                  "—"}
                              </p>
                              <span className="text-sm font-semibold tabular-nums">
                                ${allocation.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
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
                                <span className="text-sm font-semibold tabular-nums">
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
          <div className="min-w-0 lg:col-span-2">
            <div className="sticky top-4 space-y-3">
              {/* Take the card THROUGH Clover, rather than recording a charge
                  that was taken on some other terminal — which is all the
                  `card` tender in the checkout dialog has ever meant.
                  Deliberately only a link: the amount, the currency and whether
                  this facility can take a card at all are decided server-side
                  at /pay/[ref], so nothing here can disagree with them. */}
              {canSeeBookingAmounts &&
                !isCancelled &&
                balanceOf(booking) > 0 && (
                  <Button variant="outline" className="w-full gap-1.5" asChild>
                    <Link href={`/pay/${booking.id}`}>
                      <CreditCard className="size-4" />
                      Pay by card — ${balanceOf(booking).toFixed(2)}
                    </Link>
                  </Button>
                )}
              {/* Invoice / payment panel — omitted without view_booking_financials (3C) */}
              {/* The LEDGER, for every booking. A booking carrying a fixture
                  `invoice` blob showed InvoicePanel instead — that blob's
                  numbers and its "3 benefits applied" box, which never moved
                  the amount due — while every other booking showed this. */}
              {canSeeBookingAmounts && (
                // ── THE BREAKDOWN, LINE BY LINE ──────────────────────────
                //
                // This was Base Price / Discount / Added Items / Total, with
                // "Added Items" aggregating every line into one number, no
                // tip, and no paid-or-owing at all — so a booking with
                // nothing added showed two rows, which is what the facility
                // reported. Each line now names what it is and where it came
                // from; see the component for which source each has.
                <BookingPaymentBreakdown
                  booking={booking}
                  action={
                    !isPaid && !isCancelled ? (
                      <AcceptPaymentButton
                        amount={balanceOf(booking)}
                        // Opens the CHECKOUT FLOW, the one with a terminal.
                        // It used to open ProcessPaymentModal, which offered
                        // card and cash only — so the button sitting directly
                        // under the itemised breakdown was the one that could
                        // not reach a card reader, while the one that could
                        // was elsewhere on the page.
                        //
                        // Same care gate as the action bar's own payment
                        // actions: reaching checkout by a different button
                        // must not skip the unlogged-care check.
                        onClick={() => {
                          if (careStatus.pending.length > 0) {
                            setCareGateOpen(true);
                            return;
                          }
                          openCheckout();
                        }}
                      />
                    ) : null
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Edit Booking Wizard — pre-filled with current booking details */}
        <BookingModal
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setApproveOnSave(false);
          }}
          clients={[client]}
          facilityId={booking.facilityId}
          facilityName={facilityProfile.businessName}
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
            booking.extraServices?.filter(
              (s): s is ExtraService => typeof s !== "string",
            ) ?? []
          }
          preSelectedFeedingSchedule={booking.feedingSchedule}
          preSelectedMedications={booking.medications}
          preSelectedSpecialRequests={booking.specialRequests}
          onCreateBooking={async (edited) => {
            // It closed and said "updated" here, and wrote nothing. The wizard
            // waits for this answer now, and stays open on `false`.
            try {
              const changed = await saveEdit.mutateAsync(edited);
              if (approveOnSave) {
                // Priced by the wizard just now; approving is the second step.
                await updateStatus.mutateAsync({
                  id: booking.id,
                  status: "confirmed",
                });
                setApproveOnSave(false);
                toast.success(actFill("confirmedDone", { ref: bookingRef }));
                return true;
              }
              toast.success(
                changed
                  ? detailFill("bookingUpdated", { ref: bookingRef })
                  : detailT("nothingChanged"),
              );
              return true;
            } catch (error) {
              toast.error(
                detailFill("bookingNotUpdated", { ref: bookingRef }),
                {
                  description:
                    error instanceof Error ? error.message : undefined,
                },
              );
              return false;
            }
          }}
        />
        <CancelBookingModal
          booking={booking}
          clientName={client.name}
          petName={pet?.name}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          // AWAITED, and refund FIRST: a refund that lands before a failed
          // cancel leaves the money right and the status stale — visible, and
          // fixed by cancelling again. The other order leaves a cancelled
          // booking whose money never went back. "Back to the card" is the
          // processor refund Issue Refund uses; it used to be a ledger row
          // that toasted "$X refunded" without touching the card.
          onConfirm={async (bId, reason, refundMethod, refundAmount) => {
            let refunded = 0;
            if (refundAmount > 0) {
              if (refundMethod === "original") {
                const result = await refundToCard.mutateAsync({
                  bookingRef: bId,
                  amountCents: Math.round(refundAmount * 100),
                  reason,
                });
                refunded = result.refundedCents / 100;
                if (result.shortfallCents > 0) {
                  throw new Error(
                    `$${refunded.toFixed(2)} went back to the card, but $${(result.shortfallCents / 100).toFixed(2)} did not — the booking is not cancelled yet. Refund the rest another way, then cancel.`,
                  );
                }
              } else {
                await refundBooking.mutateAsync({
                  bookingId: bId,
                  amount: refundAmount,
                  method: refundTender(refundMethod),
                  reason,
                });
                refunded = refundAmount;
              }
            }
            await cancelBooking.mutateAsync({ bookingId: bId, reason });
            toast.success(
              `${bookingRef} cancelled` +
                (refunded > 0
                  ? ` — $${refunded.toFixed(2)} refunded${refundMethod === "store_credit" ? " as store credit" : refundMethod === "cash" ? " in cash" : " to the card"}`
                  : ""),
              { description: "The customer has not been messaged." },
            );
          }}
        />
        <MoveBookingLocationDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          bookingId={booking.id}
          currentLocationId={booking.locationId}
        />
        {unifiedForEarlyCheckout && (
          <CheckOutDialog
            booking={unifiedForEarlyCheckout}
            open={earlyCheckoutOpen}
            onOpenChange={setEarlyCheckoutOpen}
            isEarlyCheckout
            // It toasted "Early checkout recorded" and recorded nothing. The
            // stay is shortened to the day they left (the stay follows by
            // trigger), a boarding guest's departure is stamped, and the till
            // opens on the balance. The policy's refund, credit or fee is a
            // money write this dialog does not make — the toast says so.
            onConfirm={async ({ timestamp, reason, earlyCheckout }) => {
              // The LOCAL day they left — an evening checkout is tomorrow in UTC.
              const left = new Date(timestamp);
              const leftOn = [
                left.getFullYear(),
                String(left.getMonth() + 1).padStart(2, "0"),
                String(left.getDate()).padStart(2, "0"),
              ].join("-");
              try {
                await bookingMutations.update(booking.id, {
                  endDate: leftOn,
                  earlyCheckout: {
                    at: timestamp,
                    reason: reason || undefined,
                    unusedNights: earlyCheckout?.unusedNights,
                  },
                } as Partial<Booking>);
                if (booking.service === "boarding") {
                  await boardingStay
                    .mutateAsync({ bookingRef: booking.id, checkOut: true })
                    .catch(() => undefined);
                }
                await queryClient.invalidateQueries({ queryKey: ["bookings"] });
                toast.success(
                  detailFill("earlyCheckoutDone", {
                    ref: bookingRef,
                    date: formatDateLongIn(leftOn, detailLocale),
                  }),
                  { description: detailT("earlyCheckoutHelp") },
                );
                openCheckout();
              } catch (error) {
                toast.error(detailT("earlyCheckoutFailed"), {
                  description:
                    error instanceof Error ? error.message : undefined,
                });
              }
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
        <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <CreateIncidentModal
              onClose={() => setIncidentOpen(false)}
              // Pre-add every pet on the booking (staff can add/remove); store
              // the booking link (reservationId + bookingId + clientId) on save.
              prefilledPets={pets.map((p) => ({
                id: p.id,
                name: p.name,
                clientName: client.name,
                clientId: client.id,
              }))}
              reservationId={bookingRef}
              bookingId={booking.id}
              clientId={client.id}
            />
          </DialogContent>
        </Dialog>
        <PaymentCheckoutFlow
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          clientStoreCreditBalance={storeCreditBalance}
          giftCardTender
          // What the customer is being charged FOR. The printed receipt used to
          // show a single "Amount" line — a total with no evidence behind it.
          receiptReference={bookingRef}
          receiptServiceWindow={serviceWindowLabel}
          receiptLines={[
            {
              label: booking.serviceType || booking.service,
              amount: booking.basePrice,
            },
            ...bookingLineItems.map((item) => ({
              label:
                item.quantity > 1
                  ? `${item.name} x${item.quantity}`
                  : item.name,
              amount: item.price,
            })),
            ...(pendingLateFee
              ? [{ label: "Late pickup fee", amount: pendingLateFee.amount }]
              : []),
          ]}
          // ── THE LEDGER, NOT THE INVOICE BLOB, AND NEVER THE PRICE ────────
          //
          // This read `invoice?.remainingDue ?? booking.totalCost`. That blob
          // exists only on the 26 migrated fixture bookings, so every booking
          // made since fell through to `totalCost` — the PRICE — and the
          // checkout offered to charge the whole bill again on a booking that
          // had already been part-paid. A $16 deposit against $64 opened a
          // dialog headed "Amount Due $64.00", and taking it would have
          // collected $80 for a $64 booking.
          //
          // It is the same mistake the debt map records for `RefundModal`,
          // whose `amountPaid` fell back to the price and so capped a refund at
          // what the customer was BILLED rather than what they handed over.
          //
          // `balanceOf` is what `BookingPaymentBreakdown` shows and what
          // `useTakeBookingPayment` charges, so all three agree by construction
          // instead of by coincidence. `amount_paid` and `amount_due` are
          // derived by the database from the payments ledger for every booking,
          // fixture ones included — the blob was never the better source.
          //
          // A pending late fee IS added on top: it is not a row until the
          // checkout writes it. (Fixture "incident care" used to be added here
          // too and was never billed — it is sample data, and it is gone.)
          amountDue={balanceOf(booking) + (pendingLateFee?.amount ?? 0)}
          // What they actually handed over, so "Amount Due" and the deduction
          // above it reconcile to the balance rather than to two sources.
          depositPaid={booking.amountPaid ?? 0}
          invoiceTotal={
            (booking.amountDue ?? booking.totalCost + addedSubtotal) +
            (pendingLateFee?.amount ?? 0)
          }
          clientRowId={
            (booking as { clientRowId?: string }).clientRowId ?? null
          }
          loyaltyDiscount={loyaltyDiscount ?? undefined}
          membershipDiscount={membershipDiscount ?? undefined}
          promoBookingRef={booking.id}
          // The tip the booking carries that the ledger has not taken yet.
          pledgedTip={tipStillToCollect(booking.tipAmount, tips?.tipCollected)}
          onConfirm={checkout}
        />
        <TipSplitModal
          open={tipSplitOpen}
          onOpenChange={setTipSplitOpen}
          // THE LEDGER'S FIGURE, not the invoice's. `invoice.tipTotal` is
          // assembled on the client (and before that the prop read `?? 5` — a
          // five-dollar tip conjured at render time). This is the signed sum of
          // `payments.tip` for the booking, which is the only number the
          // database will let the split be measured against.
          totalTip={tips?.tipCollected ?? 0}
          staffOptions={tipStaffOptions}
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
          onSave={async (method, allocations) => {
            // Was `() => {}`. The modal balanced to the cent, said "Tip split
            // saved" and dropped the result on the floor.
            await setTipSplit.mutateAsync({
              bookingRef: bookingId,
              method,
              allocations,
            });
            toast.success("Tip split saved", {
              description: `${allocations.length} staff member${allocations.length === 1 ? "" : "s"}`,
            });
          }}
        />
        <DepositChargeModal
          open={depositOpen}
          onOpenChange={setDepositOpen}
          ruleAmount={ruleDepositAmount}
          ruleLabel={ruleDepositLabel}
          taxFor={taxOnSupply}
          // AWAITED. The banner above says paying the deposit confirms the
          // booking; it said so while nothing confirmed it. It does now.
          onCharge={async (amount, method) => {
            const charged = await chargeBooking.mutateAsync({
              booking,
              amount,
              tax: taxOnSupply(amount),
              method: method as Tender,
              note: `Deposit — ${ruleDepositLabel}`,
            });
            let confirmed = false;
            if (
              booking.status === "pending" ||
              booking.status === "request_submitted"
            ) {
              try {
                await updateStatus.mutateAsync({
                  id: booking.id,
                  status: "confirmed",
                });
                confirmed = true;
              } catch (error) {
                toast.error(
                  "Deposit recorded, but the booking is not confirmed",
                  {
                    description:
                      error instanceof Error ? error.message : undefined,
                  },
                );
              }
            }
            toast.success(
              `Deposit of $${charged.toFixed(2)} recorded${confirmed ? " — booking confirmed" : ""}`,
            );
          }}
        />
        <PrepaymentModal
          open={prepaymentOpen}
          onOpenChange={setPrepaymentOpen}
          // From the ledger. `invoice` is fixture data in the details jsonb and
          // its `remainingDue` never moved when money was taken.
          remainingDue={balanceOf(booking)}
          invoiceTotal={booking.amountDue ?? booking.totalCost}
          alreadyCollected={booking.amountPaid ?? 0}
          taxFor={taxOnSupply}
          onConfirm={async (result) => {
            const charged = await chargeBooking.mutateAsync({
              booking,
              amount: result.amount,
              tax: taxOnSupply(result.amount),
              method: result.method as Tender,
              ...(result.note ? { note: result.note } : {}),
            });
            toast.success(
              `$${charged.toFixed(2)} recorded in advance — the bill stays open`,
            );
          }}
        />
        <RefundModal
          open={refundOpen}
          onOpenChange={setRefundOpen}
          invoiceTotal={invoice?.total ?? booking.totalCost}
          // What was actually taken, from the ledger. It used to fall back to
          // the full price, which caps a refund at the amount the customer was
          // BILLED rather than the amount they handed over.
          amountPaid={booking.amountPaid ?? 0}
          items={(invoice?.items ?? []).map((i) => ({
            name: i.name,
            price: i.price,
          }))}
          // AWAITED. The modal keeps itself open and prints no receipt until
          // this resolves — on a card the money has to actually move first.
          onConfirm={async (refund) => {
            // "Original method" against a card is the only branch that reaches
            // a processor. Store credit and cash are bookkeeping for something
            // that happened in the room, and stay on the ledger-only path.
            if (refund.method === "original") {
              const result = await refundToCard.mutateAsync({
                bookingRef: booking.id,
                amountCents: Math.round(refund.amount * 100),
                reason: refund.reason,
              });
              toast.success(
                `$${(result.refundedCents / 100).toFixed(2)} refunded to the card`,
                { description: result.results.map((r) => r.detail).join(" ") },
              );
              if (result.shortfallCents > 0) {
                // Not swallowed into the success toast: a partial refund is
                // something somebody has to finish by hand.
                toast.warning(
                  `$${(result.shortfallCents / 100).toFixed(2)} of that refund did not go through.`,
                );
              }
              return;
            }

            await refundBooking.mutateAsync({
              bookingId: booking.id,
              amount: refund.amount,
              method: refundTender(refund.method),
              reason: refund.reason,
            });
            toast.success(
              `$${refund.amount.toFixed(2)} refunded via ${refund.method.replace("_", " ")}`,
            );
          }}
        />
        <AddRetailItemModal
          open={retailOpen}
          onOpenChange={setRetailOpen}
          // These used to go into a `useState` and get cleared at checkout. A
          // bag of food is a row now, which is what makes the balance, the
          // client's debt and any bulk settle include it.
          onAddItems={(items) => {
            addLineItems.mutate(
              {
                bookingRef: booking.id,
                items: items.map((i) => ({
                  kind: "item" as const,
                  name: i.name,
                  // The dialog reports the LINE total; the row stores the unit
                  // price and multiplies it back.
                  unitPrice: i.price / i.quantity,
                  quantity: i.quantity,
                })),
              },
              {
                onSuccess: (result) =>
                  toast.success(
                    `${result.items.length} item${result.items.length === 1 ? "" : "s"} added to ${bookingRef}`,
                  ),
                onError: (error) => toast.error(error.message),
              },
            );
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
              <AlertDialogCancel>{actT("keepAsIs")}</AlertDialogCancel>
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
