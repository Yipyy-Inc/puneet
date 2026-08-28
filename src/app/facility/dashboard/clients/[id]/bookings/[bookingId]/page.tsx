"use client";

import { use, useState, useEffect, useMemo } from "react";
import { usePricingRules } from "@/lib/api/facility-settings";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateIncidentModal } from "@/components/incidents/CreateIncidentModal";
import { getIncidentCareCharges } from "@/lib/incidents/incident-billing";
import { getIncidentsForBooking, lockInStayCare } from "@/data/incidents";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { estimates } from "@/data/estimates";
import { clientQueries } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import { facilities } from "@/data/facilities";
import { boardingGuests, type BoardingGuest } from "@/data/boarding";
import { PrintKennelCardsModal } from "@/components/facility/boarding/kennel-card-print";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoicePanel } from "@/components/bookings/InvoicePanel";
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
import { BookingNotes } from "@/components/bookings/BookingNotes";
import type { BookingLineItem } from "@/app/api/bookings/[ref]/line-items/route";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { useInvoiceTemplate } from "@/hooks/use-invoice-template";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import type { Booking } from "@/types/booking";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { CheckOutDialog } from "@/components/facility/dashboard/check-out-dialog";
import type { UnifiedBooking } from "@/hooks/use-unified-bookings";
import { TagList } from "@/components/shared/TagList";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { PaymentCheckoutFlow } from "@/components/bookings/PaymentCheckoutFlow";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";
import { useEarnLoyaltyPoints } from "@/lib/api/loyalty-ledger";
import { TipSplitModal } from "@/components/bookings/TipSplitModal";
import { DepositChargeModal } from "@/components/bookings/DepositChargeModal";
import { PrepaymentModal } from "@/components/bookings/PrepaymentModal";
import { CareCompletionGateDialog } from "@/components/bookings/CareCompletionWarning";
import { getPendingCareItems, careSectionDomIds } from "@/lib/care-completion";
import { buildInvoiceDocumentHtml } from "@/lib/invoice-document";
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
import { MoveBookingLocationDialog } from "@/components/bookings/modals/MoveBookingLocationDialog";
import { useLocationContext } from "@/hooks/use-location-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPetAgeDisplay } from "@/lib/pet-utils";
import { useFieldMask } from "@/lib/staff/mask";
import { useAssignedScope } from "@/lib/facility-permissions";
import { bookingQueries, isBookingAssignedTo } from "@/lib/api/booking";
import {
  balanceOf,
  checkoutTender,
  refundTender,
  useCancelBooking,
  useChargeBooking,
  useRefundBooking,
  useRefundBookingToCard,
  type Tender,
} from "@/lib/api/booking-money";
import { useAddLineItems } from "@/lib/api/booking-line-items";
import { useChargeOnTerminal } from "@/lib/api/terminals";
import { useBookingTips, useSetTipSplit } from "@/lib/api/booking-tips";
import { staffQueries } from "@/lib/api/staff";
import { AccessRestricted } from "@/components/employee/AccessRestricted";
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
import type { ExtraService } from "@/types/booking";
import type { GeneratedTask } from "@/types/task";
import {
  getTasksForBooking,
  completeTask,
  startTask,
} from "@/data/generated-tasks";
import { taskTemplateQueries } from "@/lib/api/task-templates";

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
  const { role } = useFacilityRole();
  // The facility's own surcharges and discounts, from `facility_settings`.
  // These used to come from localStorage, so what a customer was charged
  // depended on which browser took the booking.
  const { rules: pricingRules, isPending: pricingPending } = usePricingRules();
  // Hide the booking dollar amount from staff without view_booking_financials
  // (Table 21). TODO: also strip server-side when a backend exists.
  const { maskAmount, canSee } = useFieldMask();
  // Section 3C / Table 5 — OMIT the invoice/payment panel and Tips card from the
  // DOM (not just mask) without view_booking_financials.
  const canSeeBookingAmounts = canSee("booking_financials");
  // Section 8B: viewer's fs-* id when view_bookings is assigned_only, else
  // undefined. Used below to 403 on a booking outside the viewer's assigned set.
  const assignedStaffId = useAssignedScope("view_bookings");
  const clientId = parseInt(id, 10);
  const bookingId = parseInt(bookingIdStr, 10);

  // The client's bookings, live. `byClient` rather than `detail` because the
  // invoice panel below needs the client's OTHER unpaid bookings too, and two
  // queries for one client's bookings would be two answers to one question.
  // The facility's own module configs and booking-flow rules. Both were read
  // from `src/data/settings.ts`, so the evaluation gate and the per-service
  // care-instruction visibility were the same for every facility.
  const {
    daycare,
    boarding,
    grooming,
    training,
    bookingFlow: facilityBookingFlowConfig,
    reportCards: reportCardConfig,
  } = useSettings();
  const { data: clientBookings = [], isPending: bookingsPending } = useQuery(
    bookingQueries.byClient(clientId),
  );
  // The clients, from the same place the booking came from. This read used to
  // be the `@/data/clients` fixture, so a client created in Postgres — which is
  // every client created since the migration — had a booking page that said the
  // booking did not exist.
  //
  // The whole list rather than `detail`, because the edit wizard below takes a
  // list and lets staff move the booking to a different customer. One request
  // answers both; `detail` would fetch the same endpoint under another key.
  const { data: allClients = [], isPending: clientPending } = useQuery(
    clientQueries.all(),
  );
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
  const chargeBooking = useChargeBooking();
  const addLineItems = useAddLineItems();
  const chargeOnTerminal = useChargeOnTerminal();
  const initialBooking = useMemo(
    () => clientBookings.find((b) => b.id === bookingId),
    [clientBookings, bookingId],
  );
  const [booking, setBooking] = useState(() => initialBooking);
  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking]);
  // Traceability: the estimate this booking was converted from, if any.
  const sourceEstimate = useMemo(
    () =>
      booking
        ? estimates.find((e) => e.convertedBookingId === booking.id)
        : undefined,
    [booking],
  );
  const earnPoints = useEarnLoyaltyPoints();
  const {
    discount: loyaltyDiscount,
    consume: consumeLoyaltyDiscount,
    release: releaseLoyaltyDiscount,
  } = useActiveLoyaltyDiscount({
    clientRef: clientId,
    subtotal: booking?.totalCost ?? 0,
    serviceType: booking?.service?.toLowerCase(),
  });
  const [reportCardSent, setReportCardSent] = useState(false);
  const [pendingLateFee, setPendingLateFee] = useState<LateFeeResult | null>(
    null,
  );
  const client = useMemo(
    () => allClients.find((c) => c.id === clientId),
    [allClients, clientId],
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

  /**
   * Apply the facility's configured transition for an action.
   *
   * This used to resolve the target status from the rules and then only
   * ANNOUNCE it — "Status auto-updated to Checked In (default rule)" — with no
   * request behind the sentence. It writes now, and reports a refusal.
   *
   * Returns the new status so a caller can await the write before doing
   * anything that depends on it.
   */
  const autoTransition = async (action: AutoTransitionAction) => {
    const { target, sourceLabel } = resolveAutoTransition(action);
    if (!target || !booking) return null;
    // Already there: the rules can name the status a booking is in, and a
    // no-op PATCH would announce a change that did not happen.
    if (target === booking.status) return target;

    const label = target
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      await updateStatus.mutateAsync({
        id: booking.id,
        status: target as Booking["status"],
      });
      toast.success(`Status updated to ${label} (${sourceLabel})`);
      return target;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `${label} could not be applied.`,
      );
      return null;
    }
  };

  const [editOpen, setEditOpen] = useState(false);
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
  const { data: tips } = useBookingTips(tipSplitOpen ? bookingId : null);
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
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [retailOpen, setRetailOpen] = useState(false);
  const [boardingSheetOpen, setBoardingSheetOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  // Flow C: checkout must lock any open incident's in-stay care first. Holds the
  // pending checkout action to run after the manager confirms the lock.
  const [checkoutLock, setCheckoutLock] = useState<null | { run: () => void }>(
    null,
  );
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
  // Above the early returns below — a hook after a conditional return is
  // called in a different order on the render where the booking is loading.
  const updateStatus = useUpdateBookingStatus();
  // The printed invoice/receipt: the facility's own identity and its own tax,
  // not the template fixture's "Example Pet Care Facility" and its fabricated
  // GST number.
  const invoiceTemplate = useInvoiceTemplate();
  const facilityTaxConfig = useFacilitySettings().settings.tax_config
    .value as TaxConfig;
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

  // The facility's task routine, which the generator needs to build this
  // booking's task list. Every module's, because the booking's service decides
  // which apply and the generator filters on it.
  const { data: allTaskTemplates = [] } = useQuery(taskTemplateQueries.all());

  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  useEffect(() => {
    setTasks(getTasksForBooking(bookingId, allTaskTemplates));
  }, [bookingId, allTaskTemplates]);

  // "Not found" is a conclusion, and it needs both answers back before it can
  // be drawn. Rendering it while either request is open told staff a booking
  // they were looking at did not exist.
  if (bookingsPending || clientPending) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  if (!booking || !client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  // Section 8B / Part 0.3: a scoped viewer opening a booking URL outside their
  // assigned set is a 403 — render the branded access screen, never the record.
  // (Admin / full-access viewers have assignedStaffId === undefined → no gate.)
  if (assignedStaffId && !isBookingAssignedTo(booking, assignedStaffId)) {
    return <AccessRestricted />;
  }

  /**
   * Check the booking in.
   *
   * Prefers the facility's configured rule so a facility that checks in to
   * something other than `checked_in` is honoured, and falls back to the system
   * status when they have configured none — the old code called
   * `autoTransition` alone, which did nothing at all when no rule matched.
   */
  const checkIn = async () => {
    const moved = await autoTransition("onCheckIn");
    if (moved) return;
    if (booking.status === "checked_in") return;
    try {
      await updateStatus.mutateAsync({ id: booking.id, status: "checked_in" });
      toast.success("Checked in — service in progress");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That booking could not be checked in.",
      );
    }
  };

  const invoice = booking.invoice;
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
  // Incident-medication charges (2B.3) — gated by the med's chargeFee + the
  // facility toggle (2G.1); per_admin lines recompute as care logs accrue.
  const incidentCareItems = getIncidentCareCharges(booking.id);
  const incidentCareTotal = incidentCareItems.reduce((s, i) => s + i.price, 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  // Flow C: open, unlocked incidents with active in-stay care that checkout must
  // lock before proceeding.
  const lockableIncidents = getIncidentsForBooking(booking.id).filter(
    (i) =>
      i.status !== "closed" &&
      !i.inStayCareLocked &&
      (i.careActions.some((a) => a.active) || i.incidentMedications.length > 0),
  );
  // Gate a checkout action behind the in-stay-care lock warning when needed.
  const guardCheckout = (run: () => void) => {
    if (lockableIncidents.length > 0) {
      setCheckoutLock({ run });
      return;
    }
    run();
  };
  const confirmCheckoutLock = () => {
    lockableIncidents.forEach((i) => lockInStayCare(i.id));
    const pending = checkoutLock;
    setCheckoutLock(null);
    toast.warning(
      "In-stay care locked — the incident stays open and its follow-up tasks continue.",
    );
    pending?.run();
  };

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

  // Care-completion check — surfaces unlogged meals/meds (and incident care,
  // 2B) before checkout.
  const careStatus = getPendingCareItems(
    booking.feedingInstructions,
    booking.medicationInstructions,
    booking.id,
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
                  void autoTransition("onDepositPaid");
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

        {/* Deposit Notice — unpaid. 5B: deposit amounts are part of the price
            breakdown, so they're omitted without view_booking_amounts. */}
        {canSeeBookingAmounts &&
          !isPaid &&
          !isCancelled &&
          (invoice?.depositCollected ?? 0) === 0 && (
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

        {/* Deposit Collected — with auto-confirm note. 5B: omitted without
            view_booking_amounts (it discloses deposit + remaining balance). */}
        {canSeeBookingAmounts &&
          (invoice?.depositCollected ?? 0) > 0 &&
          !isPaid && (
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
                    onClick={() => void checkIn()}
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
        <div className="from-card to-muted/20 rounded-xl border bg-linear-to-r p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {bookingRef}
                </h1>
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
                <p className="font-[tabular-nums] text-2xl font-bold">
                  {maskAmount(
                    `$${(booking.invoice?.total ?? booking.totalCost).toFixed(2)}`,
                    "booking_financials",
                  )}
                </p>
                <StatusBadge type="status" value={booking.paymentStatus} />
              </div>
            )}
          </div>

          {/* Action bar — primary / secondary / more / destructive */}
          <BookingDetailActionBar
            booking={booking}
            invoice={invoice}
            isPaid={isPaid}
            isCancelled={isCancelled}
            isEstimateSent={isEstimateSent}
            multiLocation={locations.length > 1}
            // The toast used to fire FIRST and unconditionally, so a refusal
            // still read as a success. The write decides now.
            onCheckIn={() => void checkIn()}
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
            onConfirmBooking={async () => {
              try {
                await updateStatus.mutateAsync({
                  id: booking.id,
                  status: "confirmed",
                });
                toast.success("Booking confirmed");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "That booking could not be confirmed.",
                );
              }
            }}
            onEdit={() => setEditOpen(true)}
            onAddItem={() => setRetailOpen(true)}
            onSendEstimate={() => setEstimateOpen(true)}
            onChargeDeposit={() => setDepositOpen(true)}
            onTakePrepayment={() => setPrepaymentOpen(true)}
            onPrintInvoice={() => {
              const inv = invoice;
              const w = window.open("", "_blank", "width=720,height=900");
              if (!w) return;
              const formatDate = (d: string) =>
                new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              const dateRange =
                booking.startDate &&
                booking.endDate &&
                booking.startDate !== booking.endDate
                  ? `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`
                  : booking.startDate
                    ? formatDate(booking.startDate)
                    : undefined;

              // ── THE SAME LINES THE REST OF THE APP CHARGES ──────────────
              //
              // This used to read `booking.invoice` — the fixture blob that
              // exists on 26 of 259 bookings — and fall back to ONE line for
              // every booking without one. So the formal document a customer
              // keeps showed a single "daycare $45.00" while the counter, the
              // terminal and the emailed receipt all said $80.00 plus tax.
              // "full_day" is a stored key, not a word. It reached the paper
              // raw, next to hand-typed item names like "Treat pack".
              const humaniseLabel = (raw: string) => {
                const words = raw.replace(/[_-]+/g, " ").trim();
                return words
                  ? words.charAt(0).toUpperCase() + words.slice(1)
                  : raw;
              };
              const printedItems = [
                {
                  name: humaniseLabel(booking.serviceType || booking.service),
                  unitPrice: booking.basePrice,
                  quantity: 1,
                  price: booking.basePrice,
                },
                ...bookingLineItems
                  .filter((item) => item.kind !== "fee")
                  .map((item) => ({
                    name: item.name,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    price: item.price,
                  })),
              ];
              const printedFees = bookingLineItems
                .filter((item) => item.kind === "fee")
                .map((item) => ({
                  name: item.name,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                  price: item.price,
                }));

              // Tax on what is owed, from the facility's own setting — the same
              // call the terminal makes, so the printed document and the card
              // cannot disagree.
              const printedSubtotal = booking.amountDue ?? booking.totalCost;
              const printedTax = computeTax(
                Math.round(printedSubtotal * 100),
                facilityTaxConfig,
              );
              const tipTotal = booking.tipAmount ?? 0;
              const printedTotal = facilityTaxConfig.pricesIncludeTax
                ? printedSubtotal + tipTotal
                : printedSubtotal + printedTax.totalCents / 100 + tipTotal;
              const paid = booking.amountPaid ?? 0;

              const html = buildInvoiceDocumentHtml(invoiceTemplate, {
                // The BOOKING's ref, so a printed document can be traced back
                // from a counter. It was `inv?.id ?? String(booking.id)`, which
                // for a booking with no fixture invoice printed a bare number
                // nobody could search for.
                invoiceNumber: inv?.id ?? bookingRef,
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
                items: printedItems,
                fees: printedFees.length > 0 ? printedFees : undefined,
                subtotal: printedSubtotal,
                discount: booking.discount || undefined,
                discountLabel: booking.discountReason,
                taxes: printedTax.lines.map(
                  (line: {
                    name: string;
                    rate: number;
                    amountCents: number;
                  }) => ({
                    name: line.name,
                    rate: line.rate,
                    amount: line.amountCents / 100,
                  }),
                ),
                taxAmount: printedTax.totalCents / 100,
                tipTotal: tipTotal || undefined,
                total: printedTotal,
                depositCollected: inv?.depositCollected,
                remainingDue: Math.max(0, printedTotal - paid),
                payments: inv?.payments,
                variant: paid >= printedTotal ? "receipt" : "invoice",
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
            onReportIncident={() => setIncidentOpen(true)}
            onTransfer={() => setTransferOpen(true)}
            onMarkAsReady={() =>
              guardCheckout(() => {
                void (async () => {
                  const moved = await autoTransition("onCheckIn");
                  if (moved) {
                    toast.success("Marked as ready — proceed to checkout");
                  }
                })();
              })
            }
            onEarlyCheckout={() =>
              guardCheckout(() => setEarlyCheckoutOpen(true))
            }
            onFinishWithoutPayment={() => {
              void (async () => {
                const moved = await autoTransition("onCheckout");
                if (moved) {
                  toast.success(
                    "Finished — the invoice stays open for later billing",
                  );
                }
              })();
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
                        key={`med-${careLogStamp(careLog)}`}
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
                        bookingId={booking.id}
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
                            setTasks(
                              getTasksForBooking(bookingId, allTaskTemplates),
                            );
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
                              setTasks(
                                getTasksForBooking(bookingId, allTaskTemplates),
                              );
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
                              <span className="font-[tabular-nums]">
                                ${(tips?.bySource.terminal ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Online</span>
                              <span className="font-[tabular-nums]">
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
              {canSeeBookingAmounts &&
                (invoice ? (
                  <InvoicePanel
                    invoice={invoice}
                    client={client}
                    pendingCare={careStatus.pending}
                    hasCriticalCare={careStatus.hasCritical}
                    extraServiceItems={incidentCareItems}
                  />
                ) : (
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
                    incidentCareTotal={incidentCareTotal}
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
                ))}
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
          clients={allClients}
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
            booking.extraServices?.filter(
              (s): s is ExtraService => typeof s !== "string",
            ) ?? []
          }
          preSelectedFeedingSchedule={booking.feedingSchedule}
          preSelectedMedications={booking.medications}
          preSelectedSpecialRequests={booking.specialRequests}
          onCreateBooking={() => {
            setEditOpen(false);
            toast.success(`${bookingRef} updated`);
          }}
        />
        <CancelBookingModal
          booking={booking}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          onConfirm={(bId, reason, refundMethod, refundAmount) => {
            setCancelOpen(false);
            cancelBooking.mutate(
              {
                bookingId: bId,
                reason,
                ...(refundAmount > 0
                  ? { refund: { amount: refundAmount, method: refundMethod } }
                  : {}),
              },
              {
                onSuccess: (refunded) =>
                  toast.success(
                    `${bookingRef} cancelled` +
                      (refunded > 0
                        ? ` — $${refunded.toFixed(2)} refunded`
                        : ""),
                  ),
                onError: (error) => toast.error(error.message),
              },
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
            onConfirm={({ reason }) => {
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
            ...(incidentCareTotal > 0
              ? [{ label: "Incident care", amount: incidentCareTotal }]
              : []),
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
          // Incident care and a pending late fee ARE added on top: neither is a
          // row yet, so neither is inside `amount_due`.
          amountDue={
            balanceOf(booking) +
            incidentCareTotal +
            (pendingLateFee?.amount ?? 0)
          }
          // What they actually handed over, so "Amount Due" and the deduction
          // above it reconcile to the balance rather than to two sources.
          depositPaid={booking.amountPaid ?? 0}
          invoiceTotal={
            (booking.amountDue ?? booking.totalCost + addedSubtotal) +
            incidentCareTotal +
            (pendingLateFee?.amount ?? 0)
          }
          otherUnpaidInvoices={clientBookings
            .filter(
              (b) =>
                b.id !== bookingId &&
                b.paymentStatus === "pending" &&
                b.status !== "cancelled",
            )
            .map((b) => ({
              invoiceId: b.invoice?.id ?? String(10000 + b.id),
              service: b.service,
              amount: b.invoice?.remainingDue ?? b.totalCost,
            }))}
          loyaltyDiscount={loyaltyDiscount ?? undefined}
          onConfirm={async (payment) => {
            const lateFee = pendingLateFee;
            const reward = loyaltyDiscount;

            // ── THE REWARD IS SPENT BEFORE THE MONEY MOVES ────────────────
            //
            // It used to be spent here unconditionally, before anything was
            // known about whether the charge would work — and, because
            // `consume` could not fail, a voucher another till had already
            // taken came off this bill anyway.
            //
            // Now a spent reward stops the checkout instead of silently
            // discounting it. If the charge later fails, `release` puts it
            // back: the customer must not retry at full price still holding a
            // reward the system has eaten.
            if (reward) {
              try {
                await consumeLoyaltyDiscount(booking.id);
              } catch (error) {
                toast.error("That reward is no longer available", {
                  description:
                    error instanceof Error
                      ? error.message
                      : "It may have been used on another bill.",
                });
                return;
              }
            }

            // ── THE TERMINAL TENDER ACTUALLY CHARGES A CARD NOW ───────────
            //
            // It used to record a `terminal` row and stop — a statement that
            // somebody had taken a card on a device, made without touching one.
            // Awaited, and thrown from on failure, so the dialog stays open and
            // prints no receipt: on a terminal the customer has not tapped yet
            // when this begins.
            if (payment.method === "terminal" && payment.deviceSerial) {
              // THE CUSTOMER IS ASKED ON THE TERMINAL, not here. A tip picked
              // on this screen is staff choosing on the payer's behalf; the
              // device asks the person actually paying. `tipCents` is therefore
              // not sent at all — the route ignores it under `tipOnDevice`, and
              // sending both would only invite the two to disagree.
              const result = await chargeOnTerminal.mutateAsync({
                bookingRef: booking.id,
                deviceSerial: payment.deviceSerial,
                tipOnDevice: true,
              });
              const card = result.cardLast4
                ? `${result.cardBrand ?? "Card"} ···${result.cardLast4}`
                : null;
              toast.success(
                `$${(result.amountCents / 100).toFixed(2)} taken on the terminal`,
                {
                  description: [
                    card,
                    result.tipPrompted
                      ? `Tip $${(result.tipCents / 100).toFixed(2)}`
                      : "No tip added.",
                    // Said out loud either way. A charge that went through with
                    // no paper is something the person at the counter has to
                    // know BEFORE the customer walks off, and silence would let
                    // them assume a receipt printed. Now that the CUSTOMER
                    // picks, the message has to name what they picked too —
                    // "no receipt printed" reads as a fault when in fact they
                    // asked for it by email.
                    result.receiptMethod === "NO_RECEIPT"
                      ? "Customer declined a receipt."
                      : result.receiptMethod === "EMAIL"
                        ? result.receiptDelivered
                          ? result.receiptItemised
                            ? "Itemised receipt emailed."
                            : "Emailed, but WITHOUT the breakdown."
                          : "Email receipt FAILED — offer a printed one."
                        : result.receiptMethod === "SMS"
                          ? result.receiptDelivered
                            ? result.receiptItemised
                              ? "Itemised receipt texted."
                              : "Texted, but WITHOUT the breakdown."
                            : "Text receipt FAILED — offer a printed one."
                          : result.receiptPrinted
                            ? "Itemised receipt printed."
                            : "No receipt printed — hand over the copy from Print.",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                },
              );
              setPendingLateFee(null);
              return;
            }

            // ── Checkout ────────────────────────────────────────────────────
            //
            // This used to build a whole invoice in `setBooking` — items, fees,
            // subtotal, total, tipTotal, a payments[] array — and send none of
            // it. Everything it assembled either lives in a table now or is
            // derived from one.
            //
            // A late fee is a LINE on the bill, so it goes on before the money
            // is taken: charging first and adding it after would settle the
            // booking and immediately reopen it.
            void (async () => {
              try {
                // ── THE DISCOUNT IS A LINE ON THE BILL ────────────────────
                //
                // The dialog already subtracted it from what it CHARGES
                // (`payment.amount`), but nothing lowered what is OWED — so
                // the booking would have been charged less than `amount_due`
                // and sat partially unpaid for ever, with no line saying why.
                //
                // A negative line item is the mechanism the late fee already
                // uses: `extras_total` moves, `amount_due` is generated from
                // it, the two agree, and the receipt says what happened.
                const items: {
                  kind: "item" | "fee";
                  name: string;
                  unitPrice: number;
                  quantity: number;
                }[] = [];
                if (lateFee) {
                  items.push({
                    kind: "fee",
                    name: lateFee.label,
                    unitPrice: lateFee.amount,
                    quantity: 1,
                  });
                }
                if (reward && reward.amount > 0) {
                  items.push({
                    kind: "item",
                    name: reward.label,
                    unitPrice: -reward.amount,
                    quantity: 1,
                  });
                }
                if (items.length > 0) {
                  await addLineItems.mutateAsync({
                    bookingRef: booking.id,
                    items,
                  });
                }
                await chargeBooking.mutateAsync({
                  booking: {
                    ...booking,
                    // The lines just added are not in `booking` yet — the
                    // refetch has not landed — and `useChargeBooking` refuses
                    // more than the balance. Tell it what the bill now is.
                    amountDue: Math.max(
                      0,
                      (booking.amountDue ?? booking.totalCost) +
                        (lateFee?.amount ?? 0) -
                        (reward?.amount ?? 0),
                    ),
                  },
                  amount: payment.amount,
                  // Throws on "Custom", which has no ledger meaning.
                  method: checkoutTender(payment.method),
                  ...(payment.tip > 0 ? { tipAmount: payment.tip } : {}),
                });
                setPendingLateFee(null);

                // ── THE POINTS THIS BOOKING EARNED ────────────────────────
                //
                // Computed on the SERVER from the booking and the facility's
                // own rules, then posted to the ledger. Fire-and-forget: the
                // money is already taken and a checkout must not fail because
                // an award did not land. The route is idempotent, so a booking
                // whose award failed can simply be awarded again.
                void earnPoints
                  .mutateAsync({ bookingRef: booking.id })
                  .then((result) => {
                    if (result.awarded && result.points > 0) {
                      toast.success(
                        `+${result.points.toLocaleString()} points`,
                        {
                          description: result.reasons.join(" · ") || undefined,
                        },
                      );
                    }
                    // News about the CUSTOMER, not about this bill — said
                    // separately so the person at the counter can pass it on.
                    if (result.tierUp) {
                      toast.success(
                        `${result.tierUp.icon} Reached ${result.tierUp.name}`,
                        {
                          description: result.tierUp.rewarded
                            ? "A tier reward has been added to their account."
                            : undefined,
                        },
                      );
                    }
                    // Named one at a time. A badge is a thing with a name, and
                    // "2 badges earned" is not something the counter can pass
                    // on to the customer standing in front of them.
                    for (const badge of result.badges) {
                      toast.success(`${badge.icon} ${badge.name}`, {
                        description: badge.rewardText
                          ? `Badge earned — reward: ${badge.rewardText}`
                          : "Badge earned",
                      });
                    }
                  })
                  .catch((error: unknown) => {
                    toast.error(
                      "The points for this booking were not awarded",
                      {
                        description:
                          error instanceof Error ? error.message : undefined,
                      },
                    );
                  });

                const extra = payment.includedInvoices?.length
                  ? ` + ${payment.includedInvoices.length} other invoices`
                  : "";
                toast.success(
                  `Charged $${payment.amount.toFixed(2)} via ${payment.method}${payment.tip > 0 ? ` + $${payment.tip.toFixed(2)} tip` : ""}${extra}`,
                );
              } catch (error) {
                // The reward is already spent and no money moved. Give it back
                // before saying so.
                await releaseLoyaltyDiscount();
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not complete that checkout.",
                );
              }
            })();

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
          // "Card on File" on this dialog, so `card_on_file` rather than
          // `card` — which the bulk dialog uses for a NEW card. Same word,
          // different tender (20260806860000).
          onCharge={(amount, method) => {
            chargeBooking.mutate(
              {
                booking,
                amount,
                method: method === "card" ? "card_on_file" : (method as Tender),
                note: `Deposit — ${ruleDepositLabel}`,
              },
              {
                onSuccess: (charged) =>
                  toast.success(
                    `Deposit of $${charged.toFixed(2)} taken by ${method}`,
                  ),
                onError: (error) => toast.error(error.message),
              },
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
          onConfirm={(result) => {
            setPrepaymentOpen(false);
            chargeBooking.mutate(
              {
                booking,
                amount: result.amount,
                // "Card on file" here too.
                method:
                  result.method === "card"
                    ? "card_on_file"
                    : (result.method as Tender),
                ...(result.note ? { note: result.note } : {}),
              },
              {
                onSuccess: (charged) =>
                  toast.success(
                    `$${charged.toFixed(2)} taken in advance — the bill stays open`,
                  ),
                onError: (error) => toast.error(error.message),
              },
            );
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

        {/* Flow C — lock in-stay care before checkout when an incident is open */}
        <AlertDialog
          open={checkoutLock !== null}
          onOpenChange={(open) => {
            if (!open) setCheckoutLock(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Lock in-stay care for checkout?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This booking has {lockableIncidents.length} open incident
                {lockableIncidents.length === 1 ? "" : "s"} with active in-stay
                care:{" "}
                <strong>
                  {lockableIncidents
                    .map((i) => `${i.id} — ${i.title}`)
                    .join("; ")}
                </strong>
                . Checking out stops in-stay care (no more care tasks in Daily
                Care), but the incident stays open and its follow-up tasks
                continue on schedule.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCheckoutLock(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmCheckoutLock}>
                Lock &amp; continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
