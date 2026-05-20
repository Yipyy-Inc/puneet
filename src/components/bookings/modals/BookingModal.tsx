"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Check,
  Clock,
  Pill,
  Utensils,
  Scissors,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceStep, ClientPetStep, DetailsStep, ConfirmStep } from "./steps";
import { TipWizardContent } from "./steps/TipWizardContent";
import {
  STEPS,
  DAYCARE_SUB_STEPS,
  BOARDING_SUB_STEPS,
  EVALUATION_SUB_STEPS,
  GROOMING_SUB_STEPS,
  CUSTOM_SERVICE_SUB_STEPS,
  getServiceAccent,
} from "./constants";
import { useCustomServices } from "@/hooks/use-custom-services";
import { isBuiltinService } from "@/lib/service-registry";
import {
  applyDynamicPricingRules,
  getPricingRulesStorageKey,
  getServiceAddOnsStorageKey,
  getStoredServiceAddOns,
} from "@/lib/pricing-rules";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import { useRooms } from "@/hooks/use-rooms";
import {
  autoAssignDaycareSection,
  autoAssignBoardingUnit,
} from "@/lib/capacity-engine";
import { evaluationConfig } from "@/data/settings";
import { bookings as historicalBookings } from "@/data/bookings";
import { toast } from "sonner";
import { getNextEstimateId } from "@/data/estimates";
import { facilities } from "@/data/facilities";
import { facilityConfig, isApprovalRequired } from "@/data/facility-config";
import { facilityStaff } from "@/data/facility-staff";
import { groomingPackages } from "@/data/grooming";
import { saveCustomPetPricingOverride } from "@/lib/grooming-pet-pricing-store";
import { notificationToggles } from "@/data/settings";
import {
  digitalWaivers,
  waiverSignatures,
} from "@/data/additional-features";
import {
  loadDepositRules,
  findApplicableDepositRule,
  computeDepositAmount,
} from "@/data/deposit-rules";
import {
  BookingDepositPrompt,
  type DepositPromptValue,
} from "./BookingDepositPrompt";
import { CustomerDepositPanel } from "./CustomerDepositPanel";

import type { Client } from "@/types/client";
import type { AppointmentStage } from "@/types/grooming";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type {
  NewBooking,
  Booking,
  DaycareDateTime,
  Task,
  ExtraService,
} from "@/types/booking";
import type { Pet, Evaluation } from "@/types/pet";

// Types

export interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  facilityId: number;
  facilityName: string;
  onCreateBooking: (booking: NewBooking) => void;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  preSelectedService?: string;
  /** Pre-fill the wizard with details the customer submitted in their online booking request. */
  preSelectedStartDate?: string; // "YYYY-MM-DD"
  preSelectedEndDate?: string; // "YYYY-MM-DD"
  preSelectedCheckInTime?: string; // "HH:mm"
  preSelectedCheckOutTime?: string; // "HH:mm"
  preSelectedDaycareDates?: string[]; // "YYYY-MM-DD"[]
  preSelectedRoomId?: string;
  preSelectedDaycareSectionId?: string;
  preSelectedExtraServices?: ExtraService[];
  preSelectedFeedingSchedule?: FeedingScheduleItem[];
  preSelectedMedications?: MedicationItem[];
  preSelectedSpecialRequests?: string;
  preSelectedNotificationEmail?: boolean;
  preSelectedNotificationSMS?: boolean;
  booking?: Booking;
  /** When true, the wizard is being used by a customer making a booking request (not facility staff). */
  isCustomerMode?: boolean;
  /** Custom message shown to the customer after they submit a booking request. Configured by the facility. */
  bookingRequestMessage?: string;
  /** When true, opens the wizard in estimate mode instead of booking mode. */
  estimateMode?: boolean;
  /** When true, opens the wizard in edit mode — hides service/client-pet steps and changes labels. */
  editMode?: boolean;
}

interface EstimatePricingSnapshot {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  addOnsTotal: number;
  discount: number;
  adjustmentsSignature: string;
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildAdjustmentsSignature(
  adjustments: Array<{ id: string; amount: number }> = [],
): string {
  return adjustments
    .map((adjustment) => `${adjustment.id}:${adjustment.amount.toFixed(4)}`)
    .sort()
    .join("|");
}

function buildEstimatePricingSnapshot(input: {
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  addOnsTotal?: number;
  discount: number;
  adjustments?: Array<{ id: string; amount: number }>;
}): EstimatePricingSnapshot {
  return {
    subtotal: input.subtotal,
    taxRate: input.taxRate ?? 0,
    taxAmount: input.taxAmount ?? 0,
    total: input.total,
    addOnsTotal: input.addOnsTotal ?? 0,
    discount: input.discount,
    adjustmentsSignature: buildAdjustmentsSignature(input.adjustments),
  };
}

function pricingSnapshotChanged(
  previous: EstimatePricingSnapshot,
  current: EstimatePricingSnapshot,
): boolean {
  const epsilon = 0.005;
  return (
    Math.abs(previous.subtotal - current.subtotal) > epsilon ||
    Math.abs(previous.taxRate - current.taxRate) > epsilon ||
    Math.abs(previous.taxAmount - current.taxAmount) > epsilon ||
    Math.abs(previous.total - current.total) > epsilon ||
    Math.abs(previous.addOnsTotal - current.addOnsTotal) > epsilon ||
    Math.abs(previous.discount - current.discount) > epsilon ||
    previous.adjustmentsSignature !== current.adjustmentsSignature
  );
}

export function BookingModal({
  open,
  onOpenChange,
  clients,
  facilityId,
  facilityName,
  onCreateBooking,
  preSelectedClientId,
  preSelectedPetId,
  preSelectedService,
  preSelectedStartDate,
  preSelectedEndDate,
  preSelectedCheckInTime,
  preSelectedCheckOutTime,
  preSelectedDaycareDates,
  preSelectedRoomId,
  preSelectedDaycareSectionId,
  preSelectedExtraServices,
  preSelectedFeedingSchedule,
  preSelectedMedications,
  preSelectedSpecialRequests,
  preSelectedNotificationEmail,
  preSelectedNotificationSMS,
  booking,
  isCustomerMode = false,
  bookingRequestMessage,
  estimateMode = false,
  editMode = false,
}: NewBookingModalProps) {
  const {
    daycare,
    boarding,
    grooming,
    training,
    bookingFlow,
    serviceNotifDefaults,
    tipConfig,
  } = useSettings();
  const configs = useMemo(
    () => ({ daycare, boarding, grooming, training }),
    [daycare, boarding, grooming, training],
  );
  const { getModuleBySlug } = useCustomServices();
  const { sections: daycareSections } = useDaycareAreas();
  const { categories: roomCategories, rooms: facilityRooms } = useRooms();

  // Estimate mode — initialized from prop, key-remount resets it correctly
  const [isEstimateMode, setIsEstimateMode] = useState(estimateMode);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [estimateSent, setEstimateSent] = useState(false);
  const [generatedEstimateId, setGeneratedEstimateId] = useState<string | null>(
    null,
  );
  const [estimatePricingSnapshot, setEstimatePricingSnapshot] =
    useState<EstimatePricingSnapshot | null>(null);

  // Customer booking request confirmation state
  const [bookingRequested, setBookingRequested] = useState(false);

  const pricingRulesStorageKey = useMemo(
    () => getPricingRulesStorageKey(facilityId),
    [facilityId],
  );
  const addOnsStorageKey = useMemo(
    () => getServiceAddOnsStorageKey(facilityId),
    [facilityId],
  );
  const [pricingStorageVersion, setPricingStorageVersion] = useState(0);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key === pricingRulesStorageKey ||
        event.key === addOnsStorageKey ||
        event.key === getPricingRulesStorageKey() ||
        event.key === getServiceAddOnsStorageKey()
      ) {
        setPricingStorageVersion((prev) => prev + 1);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [pricingRulesStorageKey, addOnsStorageKey]);

  const facilityTaxConfig = useMemo(
    () => facilities.find((facility) => facility.id === facilityId)?.taxConfig,
    [facilityId],
  );

  const estimateTaxRate = useMemo(() => {
    if (!facilityTaxConfig || facilityTaxConfig.pricesIncludeTax) return 0;
    return facilityTaxConfig.taxes
      .filter(
        (tax) =>
          tax.enabled &&
          (tax.appliesTo === "all" || tax.appliesTo === "services_only"),
      )
      .reduce((sum, tax) => sum + tax.rate, 0);
  }, [facilityTaxConfig]);

  // Guest estimate fields
  const [isGuestEstimate, setIsGuestEstimate] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPetNames, setGuestPetNames] = useState<string[]>([""]);
  // Parallel array — same index as guestPetNames. Stored as string for input control;
  // parsed when needed for eligibility / synthesized Pet.
  const [guestPetWeights, setGuestPetWeights] = useState<string[]>([""]);

  // Wrap setGuestPetNames so weight slots are kept aligned when pets are added/removed
  // by ClientPetStep's existing handlers.
  const setGuestPetNamesSynced = useCallback<
    React.Dispatch<React.SetStateAction<string[]>>
  >((next) => {
    setGuestPetNames((prev) => {
      const updated = typeof next === "function" ? next(prev) : next;
      setGuestPetWeights((prevWeights) => {
        if (updated.length === prevWeights.length) return prevWeights;
        if (updated.length > prevWeights.length) {
          return [
            ...prevWeights,
            ...Array(updated.length - prevWeights.length).fill(""),
          ];
        }
        return prevWeights.slice(0, updated.length);
      });
      return updated;
    });
  }, []);

  // Quick-create state (declared before prevOpen so the close-side reset
  // below can clear it). The handler callbacks live further down with the
  // other action handlers.
  const [draftClients, setDraftClients] = useState<Client[]>([]);
  const [addedPets, setAddedPets] = useState<Record<number, Pet[]>>({});
  const nextDraftIdRef = useRef(-1);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setEstimateCreated(false);
      setEstimateSent(false);
      setGeneratedEstimateId(null);
      setEstimatePricingSnapshot(null);
    } else {
      setIsEstimateMode(false);
      setEstimateCreated(false);
      setEstimateSent(false);
      setGeneratedEstimateId(null);
      setEstimatePricingSnapshot(null);
      // Reset quick-create drafts so a re-opened wizard starts clean.
      setDraftClients([]);
      setAddedPets({});
      nextDraftIdRef.current = -1;
    }
  }

  // Staff options for assignment
  const staffOptions = [
    { value: "Mike Chen", label: "Mike Chen" },
    { value: "Emily Davis", label: "Emily Davis" },
    { value: "David Wilson", label: "David Wilson" },
    { value: "Lisa Rodriguez", label: "Lisa Rodriguez" },
    { value: "Tom Anderson", label: "Tom Anderson" },
    { value: "Manager One", label: "Manager One" },
    { value: "Admin User", label: "Admin User" },
  ];

  // Task assignments state
  const [taskAssignments, setTaskAssignments] = useState<
    Record<string, string>
  >({});

  // Step management
  // In edit mode, hide both client-pet and service steps — user can only edit
  // dates, room, add-ons, and feeding/medication details.
  const displayedSteps = STEPS.filter(
    (step) =>
      !(step.id === "client-pet" && (editMode || (preSelectedClientId && preSelectedPetId))) &&
      !(step.id === "service" && editMode),
  );
  // Wizard now runs client-pet → service → details → confirm. When both client
  // and pet are preselected, client-pet is filtered out and we start at service
  // (or details, when a service is also preselected).
  const initialStepIndex = (() => {
    // Edit mode always starts at the details step (first step after filtering)
    if (editMode) return 0;
    if (preSelectedClientId && preSelectedPetId && preSelectedService) {
      return Math.max(
        0,
        displayedSteps.findIndex((s) => s.id === "details"),
      );
    }
    if (preSelectedClientId && preSelectedPetId) {
      return Math.max(
        0,
        displayedSteps.findIndex((s) => s.id === "service"),
      );
    }
    return 0;
  })();
  const [currentStep, setCurrentStep] = useState(initialStepIndex);
  const [currentSubStep, setCurrentSubStep] = useState(0);

  // Reset the main content scroll position when moving between wizard steps
  // or sub-steps. Without this, scroll carries over from the previous step —
  // e.g. scrolling down the client list and clicking Next would leave the
  // service step scrolled past its first row of service cards.
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) viewport.scrollTop = 0;
  }, [currentStep, currentSubStep]);
  const [highestStepReached, setHighestStepReached] =
    useState(initialStepIndex);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Client selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preSelectedClientId ?? null,
  );
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>(
    preSelectedPetId ? [preSelectedPetId] : [],
  );

  // Quick-create callbacks — state is declared earlier (above prevOpen) so
  // the close-side reset can clear it. Drafts use negative ids to avoid
  // colliding with real records; the parent caller decides whether to
  // persist them after submission.
  const allocateDraftId = useCallback(() => {
    const id = nextDraftIdRef.current;
    nextDraftIdRef.current -= 1;
    return id;
  }, []);

  const handleAddClient = useCallback(
    (draft: { name: string; phone: string; email: string }): number => {
      const id = allocateDraftId();
      const trimmedPhone = draft.phone.trim();
      const newClient: Client = {
        id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: trimmedPhone || undefined,
        status: "Active",
        facility: facilityName,
        pets: [],
        additionalContacts: [],
      };
      setDraftClients((prev) => [newClient, ...prev]);
      return id;
    },
    [allocateDraftId, facilityName],
  );

  const handleAddPet = useCallback(
    (
      clientId: number,
      draft: {
        name: string;
        breed: string;
        size: string;
        coatType?: string;
        ageMonths?: number;
        weight?: number;
      },
    ): number => {
      const id = allocateDraftId();
      const newPet: Pet = {
        id,
        name: draft.name.trim(),
        type: "Dog",
        breed: draft.breed.trim(),
        // Age stored as years (Pet schema) — convert from months input.
        age:
          draft.ageMonths !== undefined && draft.ageMonths > 0
            ? Math.round((draft.ageMonths / 12) * 10) / 10
            : 0,
        weight: draft.weight ?? 0,
        color: "",
        microchip: "",
        allergies: "",
        specialNeeds: "",
        coatType: (draft.coatType as Pet["coatType"]) || undefined,
      };
      setDraftClients((prev) => {
        const draft = prev.find((c) => c.id === clientId);
        if (!draft) return prev;
        return prev.map((c) =>
          c.id === clientId ? { ...c, pets: [...c.pets, newPet] } : c,
        );
      });
      // For existing (prop) clients, accumulate in addedPets keyed by id.
      const isDraftClient = draftClients.some((c) => c.id === clientId);
      if (!isDraftClient) {
        setAddedPets((prev) => ({
          ...prev,
          [clientId]: [...(prev[clientId] ?? []), newPet],
        }));
      }
      return id;
    },
    [allocateDraftId, draftClients],
  );

  // Service selection state
  const [selectedService, setSelectedService] = useState<string>(
    preSelectedService ?? "",
  );
  const accent = getServiceAccent(selectedService);
  const approvalRequired = useMemo(() => {
    if (!selectedService) return false;
    // Built-in services: check facility config
    if (isBuiltinService(selectedService))
      return isApprovalRequired(selectedService);
    // Custom services: check module's onlineBooking.approvalRequired
    const mod = getModuleBySlug(selectedService);
    return mod?.onlineBooking?.approvalRequired ?? false;
  }, [selectedService, getModuleBySlug]);
  const handleServiceChange = (service: string) => {
    setSelectedService(service);
    if (service === "evaluation") {
      setServiceType("evaluation");
    } else if (service === "daycare") {
      setServiceType("full_day");
    } else {
      setServiceType("");
    }
    setCurrentSubStep(0);
    // Apply per-service notification defaults from settings
    const defaults = getNotifDefaults(service);
    setNotificationEmail(defaults.email);
    setNotificationSMS(defaults.sms);
  };

  // Service-specific state
  const [serviceType, setServiceType] = useState<string>(
    preSelectedService === "evaluation"
      ? evaluationConfig.duration
      : preSelectedService === "daycare"
        ? "full_day"
        : "",
  );
  const [startDate, setStartDate] = useState(preSelectedStartDate ?? "");
  const [endDate, setEndDate] = useState(preSelectedEndDate ?? "");
  const [checkInTime, setCheckInTime] = useState(
    preSelectedCheckInTime ?? "08:00",
  );
  const [checkOutTime, setCheckOutTime] = useState(
    preSelectedCheckOutTime ?? "17:00",
  );

  // Daycare specific - multi-date selection
  const [daycareSelectedDates, setDaycareSelectedDates] = useState<Date[]>(
    () => {
      const isoList =
        preSelectedDaycareDates && preSelectedDaycareDates.length > 0
          ? preSelectedDaycareDates
          : preSelectedService === "daycare" && preSelectedStartDate
            ? [preSelectedStartDate]
            : [];
      // "YYYY-MM-DD" → local Date (avoids UTC midnight off-by-one)
      return isoList.map((d) => new Date(`${d}T00:00:00`));
    },
  );
  const [daycareDateTimes, setDaycareDateTimes] = useState<DaycareDateTime[]>(
    [],
  );

  // Boarding specific - date range selection
  const [boardingRangeStart, setBoardingRangeStart] = useState<Date | null>(
    () =>
      preSelectedService === "boarding" && preSelectedStartDate
        ? new Date(`${preSelectedStartDate}T00:00:00`)
        : null,
  );
  const [boardingRangeEnd, setBoardingRangeEnd] = useState<Date | null>(() =>
    preSelectedService === "boarding" && preSelectedEndDate
      ? new Date(`${preSelectedEndDate}T00:00:00`)
      : null,
  );
  const [boardingDateTimes, setBoardingDateTimes] = useState<DaycareDateTime[]>(
    [],
  );

  // Boarding specific
  const [kennel, setKennel] = useState("");
  const [roomAssignments, setRoomAssignments] = useState<
    Array<{ petId: number; roomId: string }>
  >(() => {
    if (!preSelectedPetId) return [];
    // Daycare uses play-area section IDs as the "roomId"; boarding uses room IDs.
    const roomId =
      preSelectedService === "daycare"
        ? preSelectedDaycareSectionId
        : preSelectedRoomId;
    return roomId ? [{ petId: preSelectedPetId, roomId }] : [];
  });
  const [feedingSchedule, setFeedingSchedule] = useState<FeedingScheduleItem[]>(
    preSelectedFeedingSchedule ?? [],
  );
  const [walkSchedule, setWalkSchedule] = useState("");
  const [medications, setMedications] = useState<MedicationItem[]>(
    preSelectedMedications ?? [],
  );
  const [feedingMedicationTab, setFeedingMedicationTab] = useState<
    "feeding" | "medication"
  >("feeding");
  const [extraServices, setExtraServices] = useState<ExtraService[]>(
    preSelectedExtraServices ?? [],
  );

  // Derive notification defaults for a given service from settings
  const getNotifDefaults = useCallback(
    (serviceId: string) => {
      const def = serviceNotifDefaults.find((d) => d.serviceId === serviceId);
      return { email: def?.email ?? true, sms: def?.sms ?? false };
    },
    [serviceNotifDefaults],
  );

  const initDefaults = getNotifDefaults(preSelectedService ?? "");
  const [notificationEmail, setNotificationEmail] = useState(
    preSelectedNotificationEmail ?? initDefaults.email,
  );
  const [notificationSMS, setNotificationSMS] = useState(
    preSelectedNotificationSMS ?? initDefaults.sms,
  );
  // Confirm-screen additions:
  //   1) Express Check-In auto-send — sent after the booking is created. The
  //      default flips per selected client (ON for new / draft clients, OFF
  //      for returning clients who already have info on file). The effect
  //      below re-evaluates whenever the selected client changes; staff can
  //      override either way per booking.
  //   2) Package redemption — when set, a session is debited from this
  //      client package as part of the booking submission.
  const [expressCheckInEnabled, setExpressCheckInEnabled] = useState(true);
  const [redeemedPackageId, setRedeemedPackageId] = useState<string | null>(
    null,
  );
  // Primary staff member assigned to this booking — drives which calendar
  // column the appointment lands in (e.g. the groomer's column for grooming).
  // Optional: an unassigned booking is still valid and falls into the
  // "Unassigned" column on the calendar.
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  // Grooming-only: whether the customer chose mobile (van) service vs salon.
  // Drives arrival-window display, service-area filtering, and the booking's
  // `isMobile` flag on submit.
  const [groomingIsMobile, setGroomingIsMobile] = useState(false);
  // Grooming-only: primary stylist (groomer). Empty until staff assigns one.
  const [groomingStylistId, setGroomingStylistId] = useState<string>("");
  // Grooming-only: secondary co-groomers working alongside the primary stylist.
  const [groomingAdditionalStylistIds, setGroomingAdditionalStylistIds] =
    useState<string[]>([]);
  // Grooming-only: assigned station (table/tub) — filtered by pet size.
  const [groomingStationId, setGroomingStationId] = useState<string>("");
  // Grooming-only: split-service stages — when set, the booking renders as
  // sequential blocks on the calendar instead of one continuous block.
  const [groomingStages, setGroomingStages] = useState<AppointmentStage[]>([]);
  // Grooming-only: manual price/duration override. Wins over the resolver-
  // computed value. Cleared whenever the pet or package changes.
  const [groomingManualPrice, setGroomingManualPrice] = useState<
    number | undefined
  >(undefined);
  const [groomingManualDuration, setGroomingManualDuration] = useState<
    number | undefined
  >(undefined);
  // Grooming-only: when true, the manual price/duration is persisted as the
  // pet's per-service rate on submit so the next booking pre-fills with it.
  const [groomingSavePriceToPet, setGroomingSavePriceToPet] = useState(false);
  // Grooming-only: ids of grooming-specific add-ons (GROOMING_ADD_ONS catalog)
  // selected for this booking. Separate from `extraServices` which holds
  // facility-wide service add-ons (different catalog, per-pet quantities).
  const [groomingSelectedAddOnIds, setGroomingSelectedAddOnIds] = useState<
    string[]
  >([]);
  // Grooming-only: subset of `groomingSelectedAddOnIds` that came from the
  // package's default-rules (vs explicitly chosen by staff). Tracked so the
  // rule engine can swap out only the auto picks when the package or pet changes.
  const [groomingAutoAttachedAddOnIds, setGroomingAutoAttachedAddOnIds] =
    useState<string[]>([]);
  // Track waiver ids signed during this wizard session — combined with the
  // already-stored signatures in waiverSignatures (read on the Confirm step)
  // to decide whether the customer can submit. Reset on form reset.
  const [sessionSignedWaiverIds, setSessionSignedWaiverIds] = useState<
    Set<string>
  >(new Set());
  // Customer-mode card selection. When a deposit rule applies, the customer
  // must pick a card before they can submit; staff mode uses the existing
  // BookingDepositPrompt flow instead.
  const [
    customerPaymentMethodId,
    setCustomerPaymentMethodId,
  ] = useState<string | null>(null);

  useEffect(() => {
    // "Returning" = the client has at least one historical booking.
    // Draft clients (negative ids from the quick-create flow) always count
    // as new — they were just created in this session.
    const hasHistory =
      selectedClientId !== null &&
      selectedClientId > 0 &&
      historicalBookings.some((b) => b.clientId === selectedClientId);
    setExpressCheckInEnabled(!hasHistory);
  }, [selectedClientId]);

  // Clear redemption whenever the client or service changes — otherwise a
  // stale "$0 - covered by package" carries over to a service the package
  // doesn't apply to.
  useEffect(() => {
    setRedeemedPackageId(null);
  }, [selectedClientId, selectedService]);

  // Clear grooming manual price/duration whenever the chosen package or pets
  // change — a price tied to "Full Groom on Buddy" shouldn't carry to
  // "Bath Only on Bella".
  useEffect(() => {
    if (selectedService !== "grooming") return;
    setGroomingManualPrice(undefined);
    setGroomingManualDuration(undefined);
    setGroomingSavePriceToPet(false);
  }, [selectedService, serviceType, selectedPetIds]);

  // Clear staff selection when the service changes — the previously chosen
  // staff member may not be assigned to the new service module.
  useEffect(() => {
    setSelectedStaffId(null);
  }, [selectedService]);

  // Reset grooming-only fields whenever the service changes — they only
  // apply when grooming is selected, and stale values would otherwise leak
  // into the next service's booking.
  useEffect(() => {
    if (selectedService !== "grooming") {
      setGroomingIsMobile(false);
      setGroomingStylistId("");
      setGroomingAdditionalStylistIds([]);
      setGroomingStationId("");
      setGroomingStages([]);
      setGroomingManualPrice(undefined);
      setGroomingManualDuration(undefined);
      setGroomingSavePriceToPet(false);
      setGroomingSelectedAddOnIds([]);
      setGroomingAutoAttachedAddOnIds([]);
    }
  }, [selectedService]);
  const [tipAmount, setTipAmount] = useState(0);
  const [showingTipStep, setShowingTipStep] = useState(false);
  const [includesEvaluation, setIncludesEvaluation] = useState(false);
  const [depositPrompt, setDepositPrompt] = useState<DepositPromptValue>({
    collectNow: true,
    amount: 0,
    method: "card",
    ruleLabel: "",
    required: 0,
  });

  // Get current sub-steps based on selected service (estimate mode now includes feeding/medication for fee calculation)
  // Customers never see the Room Assignment sub-step (id=1): the facility auto-assigns
  // based on configured rules and can override from the facility side.
  const currentSubSteps = useMemo(() => {
    const hideRoomAssignment = <T extends { id: number }>(arr: readonly T[]) =>
      isCustomerMode ? arr.filter((s) => s.id !== 1) : [...arr];
    if (selectedService === "daycare") {
      return hideRoomAssignment(DAYCARE_SUB_STEPS);
    }
    if (selectedService === "boarding") {
      return hideRoomAssignment(BOARDING_SUB_STEPS);
    }
    if (selectedService === "evaluation") return EVALUATION_SUB_STEPS;
    if (selectedService === "grooming") return GROOMING_SUB_STEPS;
    if (selectedService) {
      return CUSTOM_SERVICE_SUB_STEPS;
    }
    return [];
  }, [selectedService, isEstimateMode, isCustomerMode]);

  // Check if a specific sub-step is complete, keyed by the canonical sub-step
  // `id` (not the array position in `currentSubSteps`). This keeps the logic
  // stable when customer mode removes the Room Assignment step from the list.
  const isSubStepComplete = useCallback(
    (stepId: number) => {
      // Pets that need a room assignment: real selected pets, or guest pets in
      // estimate mode (each named entry counts as one).
      const effectivePetCount =
        isEstimateMode && isGuestEstimate
          ? guestPetNames.filter((n) => n.trim()).length
          : selectedPetIds.length;
      if (selectedService === "daycare") {
        switch (stepId) {
          case 0:
            return daycareSelectedDates.length > 0;
          case 1:
            return (
              effectivePetCount > 0 &&
              roomAssignments.length === effectivePetCount
            );
          case 2:
            return true;
          case 3:
            return true;
          case 4:
            return true;
          default:
            return false;
        }
      }
      if (selectedService === "boarding") {
        switch (stepId) {
          case 0:
            return boardingRangeStart !== null && boardingRangeEnd !== null;
          case 1:
            return (
              effectivePetCount > 0 &&
              roomAssignments.length === effectivePetCount
            );
          case 2:
            return true;
          case 3:
            return true;
          case 4:
            return true;
          default:
            return false;
        }
      }
      if (selectedService === "evaluation") {
        switch (stepId) {
          case 0:
            return !!startDate && !!checkInTime && !!checkOutTime;
          case 1: // Add-ons — always complete (optional)
            return true;
          default:
            return false;
        }
      }
      if (selectedService === "grooming") {
        switch (stepId) {
          case 0: // Package picked
            return !!serviceType;
          case 1: // Add-ons — always optional
            return true;
          case 2: // Schedule
            return !!startDate && !!checkInTime && !!checkOutTime;
          default:
            return false;
        }
      }
      // Training, custom services — schedule sub-step only
      if (stepId === 0) {
        return !!startDate && !!checkInTime && !!checkOutTime;
      }
      return true;
    },
    [
      selectedService,
      daycareSelectedDates,
      roomAssignments,
      selectedPetIds,
      isEstimateMode,
      isGuestEstimate,
      guestPetNames,
      boardingRangeStart,
      boardingRangeEnd,
      startDate,
      checkInTime,
      checkOutTime,
      serviceType,
    ],
  );

  // Combined view that folds quick-created drafts into the prop list so the
  // rest of the wizard (filtered list, selection lookup, room logic) treats
  // them as first-class clients/pets.
  const mergedClients = useMemo<Client[]>(() => {
    const augmented = clients.map((c) => {
      const extras = addedPets[c.id];
      if (!extras || extras.length === 0) return c;
      return { ...c, pets: [...c.pets, ...extras] };
    });
    return [...draftClients, ...augmented];
  }, [clients, draftClients, addedPets]);

  // Filtered clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return mergedClients;
    const query = searchQuery.toLowerCase();
    return mergedClients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone?.includes(query),
    );
  }, [mergedClients, searchQuery]);

  const selectedClient = useMemo(() => {
    return mergedClients.find((c) => c.id === selectedClientId);
  }, [mergedClients, selectedClientId]);

  const petHasValidEvaluation = useCallback((pet: Pet) => {
    const evals: Evaluation[] = pet.evaluations ?? [];
    return evals.some((e) => e.status === "passed" && e.isExpired !== true);
  }, []);

  const petHasExpiredEvaluation = useCallback((pet: Pet) => {
    const evals: Evaluation[] = pet.evaluations ?? [];
    return evals.some(
      (e) =>
        (e.status === "passed" && e.isExpired === true) ||
        e.status === "outdated",
    );
  }, []);

  const petHasFailedEvaluation = useCallback((pet: Pet) => {
    const evals: Evaluation[] = pet.evaluations ?? [];
    return evals.some((e) => e.status === "failed");
  }, []);

  const selectedPets = useMemo(() => {
    return (
      selectedClient?.pets.filter((p) => selectedPetIds.includes(p.id)) || []
    );
  }, [selectedClient, selectedPetIds]);

  const guestPetSummary = useMemo(
    () => guestPetNames.map((name) => name.trim()).filter(Boolean),
    [guestPetNames],
  );

  // Returns the parsed weight (lbs) for the named pet at index `i`, or 0 if missing/invalid.
  const parseGuestWeight = useCallback(
    (i: number) => {
      const raw = guestPetWeights[i];
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    [guestPetWeights],
  );

  const isGuestInquiryComplete = useMemo(() => {
    if (!(isEstimateMode && isGuestEstimate)) return true;

    const hasName = guestName.trim().length > 0;
    const normalizedEmail = guestEmail.trim();
    const hasValidEmail = SIMPLE_EMAIL_REGEX.test(normalizedEmail);

    // Every named pet must also have a valid weight (> 0). This prevents staff from
    // generating estimates with the wrong room category, since boarding rooms are
    // weight-gated.
    const namedIndexes = guestPetNames
      .map((name, i) => (name.trim() ? i : -1))
      .filter((i) => i >= 0);
    const hasAtLeastOnePet = namedIndexes.length > 0;
    const allNamedHaveWeight =
      hasAtLeastOnePet && namedIndexes.every((i) => parseGuestWeight(i) > 0);

    return hasName && hasValidEmail && hasAtLeastOnePet && allNamedHaveWeight;
  }, [
    isEstimateMode,
    isGuestEstimate,
    guestName,
    guestEmail,
    guestPetNames,
    parseGuestWeight,
  ]);

  const guestPricingPetNames = useMemo(() => {
    if (!(isEstimateMode && isGuestEstimate)) return [];
    return guestPetSummary.length > 0 ? guestPetSummary : ["Guest Pet"];
  }, [isEstimateMode, isGuestEstimate, guestPetSummary]);

  const pricingSelectedPetIds = useMemo(() => {
    if (isEstimateMode && isGuestEstimate) {
      return guestPricingPetNames.map((_, index) => -1 * (index + 1));
    }
    return selectedPetIds;
  }, [isEstimateMode, isGuestEstimate, guestPricingPetNames, selectedPetIds]);

  const pricingPets = useMemo(() => {
    if (isEstimateMode && isGuestEstimate) {
      return pricingSelectedPetIds.map((id) => ({ id }));
    }
    return selectedPets;
  }, [isEstimateMode, isGuestEstimate, pricingSelectedPetIds, selectedPets]);

  // Pets visible to UI sub-steps that need name/type (room picker, add-ons, feeding, etc.).
  // For guest estimates we synthesize Pet shapes from the inquiry names + weights so they
  // can be dragged onto rooms with real eligibility rules applied; real client pets pass
  // through unchanged.
  const effectiveSelectedPets = useMemo<Pet[]>(() => {
    if (isEstimateMode && isGuestEstimate) {
      return guestPetNames
        .map((name, index) => ({ name: name.trim(), index }))
        .filter((p) => p.name.length > 0)
        .map(({ name, index }) => ({
          id: -1 * (index + 1),
          name,
          type: "Dog",
          breed: "",
          age: 0,
          weight: parseGuestWeight(index),
          color: "",
          microchip: "",
          allergies: "",
          specialNeeds: "",
        }));
    }
    return selectedPets;
  }, [
    isEstimateMode,
    isGuestEstimate,
    guestPetNames,
    parseGuestWeight,
    selectedPets,
  ]);

  const effectiveSelectedPetIds = useMemo(() => {
    if (isEstimateMode && isGuestEstimate) {
      return effectiveSelectedPets.map((p) => p.id);
    }
    return selectedPetIds;
  }, [isEstimateMode, isGuestEstimate, effectiveSelectedPets, selectedPetIds]);

  // In customer mode the Room Assignment step is hidden — the system
  // auto-assigns each pet to the best-fit section/unit based on the facility's
  // configured rules (pet type, weight) and available capacity. The facility
  // can override from the facility side after the booking request arrives.
  useEffect(() => {
    if (!isCustomerMode) return;
    if (effectiveSelectedPets.length === 0) return;

    if (selectedService === "daycare") {
      if (daycareSelectedDates.length === 0) return;
      const firstDate = daycareSelectedDates[0].toISOString().split("T")[0];
      const next: Array<{ petId: number; roomId: string }> = [];
      for (const pet of effectiveSelectedPets) {
        const section = autoAssignDaycareSection(
          pet,
          firstDate,
          daycareSections,
          historicalBookings,
        );
        if (section) next.push({ petId: pet.id, roomId: section.id });
      }
      setRoomAssignments(next);
      return;
    }

    if (selectedService === "boarding") {
      if (!boardingRangeStart || !boardingRangeEnd) return;
      const startStr = boardingRangeStart.toISOString().split("T")[0];
      const endStr = boardingRangeEnd.toISOString().split("T")[0];
      const next: Array<{ petId: number; roomId: string }> = [];
      for (const pet of effectiveSelectedPets) {
        const unit = autoAssignBoardingUnit(
          pet,
          startStr,
          endStr,
          null,
          roomCategories,
          facilityRooms,
          historicalBookings,
        );
        if (unit) next.push({ petId: pet.id, roomId: unit.id });
      }
      setRoomAssignments(next);
    }
  }, [
    isCustomerMode,
    selectedService,
    effectiveSelectedPets,
    daycareSelectedDates,
    boardingRangeStart,
    boardingRangeEnd,
    daycareSections,
    roomCategories,
    facilityRooms,
  ]);

  const selectedClientBookings = useMemo(() => {
    if (selectedClientId == null) return [];
    return historicalBookings.filter(
      (existingBooking) => existingBooking.clientId === selectedClientId,
    );
  }, [selectedClientId]);

  const isNewCustomer = useMemo(() => {
    if (selectedClientId == null) return false;
    return selectedClientBookings.length === 0;
  }, [selectedClientId, selectedClientBookings]);

  const newPetIdsForCustomer = useMemo(() => {
    if (selectedPetIds.length === 0) return [];

    if (selectedClientBookings.length === 0) {
      return selectedPetIds;
    }

    return selectedPetIds.filter(
      (petId) =>
        !selectedClientBookings.some((existingBooking) =>
          Array.isArray(existingBooking.petId)
            ? existingBooking.petId.includes(petId)
            : existingBooking.petId === petId,
        ),
    );
  }, [selectedPetIds, selectedClientBookings]);

  const effectiveIsNewCustomer =
    isEstimateMode && isGuestEstimate ? true : isNewCustomer;

  const effectiveNewPetIds =
    isEstimateMode && isGuestEstimate
      ? pricingSelectedPetIds
      : newPetIdsForCustomer;

  const canAccessLockedServices = useMemo(() => {
    if (
      !bookingFlow.evaluationRequired ||
      !bookingFlow.hideServicesUntilEvaluationCompleted
    ) {
      return true;
    }
    if (selectedPets.length === 0) return false;
    return selectedPets.every((pet) => petHasValidEvaluation(pet));
  }, [bookingFlow, selectedPets, petHasValidEvaluation]);

  // Derive effective service: reset if hidden, force evaluation if locked
  const effectiveService = useMemo(() => {
    if (!selectedService || selectedService === "evaluation")
      return selectedService;
    if (bookingFlow.hiddenServices.includes(selectedService)) return "";
    if (
      bookingFlow.evaluationRequired &&
      bookingFlow.hideServicesUntilEvaluationCompleted &&
      !canAccessLockedServices
    ) {
      return "evaluation";
    }
    return selectedService;
  }, [bookingFlow, selectedService, canAccessLockedServices]);

  if (effectiveService !== selectedService) {
    setSelectedService(effectiveService);
  }

  const requiresEvaluationForService = useCallback(
    (serviceId: string) => {
      if (serviceId === "evaluation") return false;
      if (bookingFlow.evaluationRequired) return true;
      if (bookingFlow.servicesRequiringEvaluation.includes(serviceId))
        return true;
      const config =
        configs[serviceId as "daycare" | "boarding" | "grooming" | "training"];
      return config?.settings.evaluation.enabled ?? false;
    },
    [bookingFlow, configs],
  );

  const isEvaluationOptionalForService = useCallback(
    (serviceId: string) => {
      if (bookingFlow.evaluationRequired) return false;
      if (bookingFlow.servicesRequiringEvaluation.includes(serviceId))
        return false;
      const config =
        configs[serviceId as "daycare" | "boarding" | "grooming" | "training"];
      return config?.settings.evaluation.optional ?? false;
    },
    [bookingFlow, configs],
  );

  const storedAddOns = useMemo(
    () => getStoredServiceAddOns(facilityId).filter((addOn) => addOn.isActive),
    [open, facilityId, pricingStorageVersion],
  );

  // Auto-seed extraServices with the facility's default + required add-ons
  // for the picked service, applied per selected pet. Defaults are
  // pre-selected (and removable); required are auto-included and cannot be
  // removed (lock enforced in the UI). We only ADD missing rows — never
  // remove rows the user has toggled on — so navigating back and forth in
  // the wizard doesn't wipe customer choices.
  useEffect(() => {
    if (!selectedService) return;
    if (selectedPetIds.length === 0) return;
    const applicable = storedAddOns.filter(
      (a) =>
        a.isActive &&
        (a.isDefault || a.isRequired) &&
        (a.applicableServices?.includes(selectedService) ?? false),
    );
    if (applicable.length === 0) return;
    setExtraServices((prev) => {
      const next = [...prev];
      for (const pid of selectedPetIds) {
        for (const a of applicable) {
          const already = next.some(
            (es) => es.serviceId === a.id && es.petId === pid,
          );
          if (!already) {
            next.push({ serviceId: a.id, quantity: 1, petId: pid });
          }
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, selectedPetIds.join(","), storedAddOns]);

  const boardingNights = useMemo(() => {
    if (!boardingRangeStart || !boardingRangeEnd) return 0;
    return Math.max(
      1,
      Math.ceil(
        (boardingRangeEnd.getTime() - boardingRangeStart.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }, [boardingRangeStart, boardingRangeEnd]);

  // Calculate total price with dynamic pricing rules
  const calculatePrice = useMemo(() => {
    let basePrice = 0;

    if (selectedService === "daycare") {
      const pricePerDay =
        serviceType === "half_day" ? daycare.basePrice / 2 : daycare.basePrice;
      basePrice = pricePerDay * daycareSelectedDates.length;
    } else if (selectedService === "boarding") {
      basePrice = boarding.basePrice * Math.max(boardingNights, 1);
    } else if (selectedService === "grooming") {
      // When a package is picked, use its starting price (smallest size).
      // Final price resolves on the facility side once pet size/breed/coat
      // are taken into account. Falls back to the category base price until
      // staff/customer pick a package.
      const pkg = serviceType
        ? groomingPackages.find((p) => p.id === serviceType)
        : undefined;
      const perPet = pkg ? pkg.sizePricing.small : grooming.basePrice;
      basePrice = perPet * Math.max(pricingSelectedPetIds.length, 1);
    } else if (selectedService === "training") {
      basePrice =
        training.basePrice * Math.max(pricingSelectedPetIds.length, 1);
    } else if (selectedService === "evaluation") {
      basePrice = evaluationConfig.price;
    } else if (selectedService && !isBuiltinService(selectedService)) {
      const customModule = getModuleBySlug(selectedService);
      if (customModule) {
        basePrice = customModule.pricing.basePrice;
      }
    }

    const groomingDurationMinutes =
      selectedService === "grooming"
        ? (() => {
            const checkIn = new Date(`2000-01-01T${checkInTime}`);
            const checkOut = new Date(`2000-01-01T${checkOutTime}`);
            const diff = Math.round(
              (checkOut.getTime() - checkIn.getTime()) / (1000 * 60),
            );
            return Number.isFinite(diff) && diff > 0 ? diff : undefined;
          })()
        : undefined;

    const formatDateOnly = (date: Date): string => {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const day = `${date.getDate()}`.padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const daycareServiceDates =
      daycareDateTimes.length > 0
        ? daycareDateTimes.map((entry) => entry.date)
        : daycareSelectedDates.map((date) => formatDateOnly(date));

    const pricingComputation = applyDynamicPricingRules({
      serviceId: selectedService,
      basePrice,
      existingExtraServices: extraServices,
      selectedPetIds: pricingSelectedPetIds,
      isNewCustomer: effectiveIsNewCustomer,
      newPetIds: effectiveNewPetIds,
      customer:
        selectedClient && !(isEstimateMode && isGuestEstimate)
          ? {
              status: selectedClient.status,
              membershipPlan: selectedClient.membership?.plan,
              membershipStatus: selectedClient.membership?.status,
              storeCreditBalance: selectedClient.storeCredit?.balance,
              hasPackageCredits: (selectedClient.packages ?? []).some(
                (pkg) => pkg.remainingCredits > 0,
              ),
            }
          : undefined,
      pets: pricingPets,
      addOnsCatalog: storedAddOns,
      roomAssignments,
      boardingNights,
      sessionUnits:
        selectedService === "daycare"
          ? daycareSelectedDates.length
          : selectedService === "boarding"
            ? boardingNights
            : 1,
      serviceStartDate:
        selectedService === "daycare"
          ? daycareServiceDates[0]
          : selectedService === "boarding" && boardingRangeStart
            ? formatDateOnly(boardingRangeStart)
            : startDate || undefined,
      serviceEndDate:
        selectedService === "daycare"
          ? daycareServiceDates[daycareServiceDates.length - 1]
          : selectedService === "boarding" && boardingRangeEnd
            ? formatDateOnly(boardingRangeEnd)
            : endDate || startDate || undefined,
      serviceDates:
        selectedService === "daycare" && daycareServiceDates.length > 0
          ? daycareServiceDates
          : undefined,
      groomingDurationMinutes,
      appointmentTime: selectedService === "grooming" ? checkInTime : undefined,
      scheduledCheckInTime: checkInTime,
      scheduledCheckOutTime: checkOutTime,
      actualCheckInTime: checkInTime,
      actualCheckOutTime: checkOutTime,
    });

    // ── Medication & feeding service fees ──────────────────────────
    const sfConfig = facilityConfig.serviceFees;
    let medicationFeeTotal = 0;
    let feedingFeeTotal = 0;
    const serviceFeeItems: Array<{ label: string; amount: number }> = [];

    // Medication admin fee
    if (
      sfConfig.medication.adminFee.enabled &&
      medications.length > 0 &&
      sfConfig.medication.adminFee.applicableServices.includes(selectedService)
    ) {
      const scope = sfConfig.medication.adminFee.scope;
      const amt = sfConfig.medication.adminFee.amount;
      if (scope === "per_medication") {
        medicationFeeTotal = amt * medications.length;
      } else if (scope === "per_pet") {
        const petCount = new Set(medications.map((m) => m.petId)).size || 1;
        medicationFeeTotal = amt * petCount;
      } else {
        medicationFeeTotal = amt;
      }
      if (medicationFeeTotal > 0) {
        serviceFeeItems.push({
          label: sfConfig.medication.adminFee.label,
          amount: medicationFeeTotal,
        });
      }
    }

    // Medication aid fee (facility-provided pill pockets, cheese, etc.)
    if (sfConfig.medication.facilityProvides.enabled) {
      for (const med of medications) {
        if (med.facilityProvidesMedAid && med.facilityMedAidItem) {
          const aidItem = sfConfig.medication.facilityProvides.items.find(
            (i) => i.id === med.facilityMedAidItem,
          );
          if (aidItem && aidItem.fee > 0) {
            medicationFeeTotal += aidItem.fee;
            serviceFeeItems.push({
              label: `${sfConfig.medication.facilityProvides.label}: ${aidItem.name}`,
              amount: aidItem.fee,
            });
          }
        }
      }
    }

    // Feeding fee (daycare only — boarding is included)
    if (
      selectedService === "daycare" &&
      sfConfig.feeding.daycare.enabled &&
      feedingSchedule.length > 0 &&
      feedingSchedule.some((f) => f.occasions.length > 0)
    ) {
      const scope = sfConfig.feeding.daycare.scope;
      const amt = sfConfig.feeding.daycare.amount;
      if (scope === "per_pet") {
        const feedingPetCount =
          new Set(
            feedingSchedule
              .filter((f) => f.occasions.length > 0)
              .map((f) => f.petId),
          ).size || 1;
        feedingFeeTotal = amt * feedingPetCount;
      } else if (scope === "per_meal") {
        const totalMeals = feedingSchedule.reduce(
          (sum, f) => sum + f.occasions.length,
          0,
        );
        feedingFeeTotal = amt * totalMeals;
      } else {
        feedingFeeTotal = amt;
      }
      if (feedingFeeTotal > 0) {
        serviceFeeItems.push({
          label: sfConfig.feeding.daycare.label,
          amount: feedingFeeTotal,
        });
      }
    }

    // Evaluation fee — charged per pet that still needs an evaluation
    let evaluationFeeTotal = 0;
    if (includesEvaluation && evaluationConfig.price > 0) {
      const petsNeedingEval = pricingPets.filter((pet) => {
        const p = pet as { evaluations?: Array<{ status: string; isExpired?: boolean }> };
        return !p.evaluations?.some(
          (e) => e.status === "passed" && e.isExpired !== true,
        );
      });
      const evalCount = Math.max(petsNeedingEval.length, 1);
      evaluationFeeTotal = evaluationConfig.price * evalCount;
      serviceFeeItems.push({
        label: `${evaluationConfig.internalName ?? "Evaluation"} Fee (×${evalCount})`,
        amount: evaluationFeeTotal,
      });
    }

    const subtotal =
      pricingComputation.total + medicationFeeTotal + feedingFeeTotal + evaluationFeeTotal;
    const taxRate = isEstimateMode ? estimateTaxRate : 0;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return {
      basePrice,
      addOnsTotal: pricingComputation.addOnsTotal,
      adjustments: pricingComputation.adjustments,
      discount: pricingComputation.discountTotal,
      subtotal,
      taxRate,
      taxAmount,
      total,
      effectiveExtraServices: pricingComputation.extraServices,
      medicationFeeTotal,
      feedingFeeTotal,
      evaluationFeeTotal,
      serviceFeeItems,
    };
  }, [
    selectedService,
    serviceType,
    boardingNights,
    boardingRangeStart,
    boardingRangeEnd,
    startDate,
    endDate,
    daycareSelectedDates,
    daycareDateTimes,
    pricingSelectedPetIds,
    effectiveIsNewCustomer,
    effectiveNewPetIds,
    selectedClient,
    pricingPets,
    extraServices,
    roomAssignments,
    checkInTime,
    checkOutTime,
    boarding.basePrice,
    daycare.basePrice,
    grooming.basePrice,
    training.basePrice,
    getModuleBySlug,
    storedAddOns,
    isEstimateMode,
    isGuestEstimate,
    estimateTaxRate,
    medications,
    feedingSchedule,
    includesEvaluation,
  ]);

  // Check if service requires evaluation
  const serviceRequiresEvaluation = useMemo(() => {
    return requiresEvaluationForService(selectedService);
  }, [requiresEvaluationForService, selectedService]);

  // Check if evaluation is optional
  const isEvaluationOptional = useMemo(() => {
    return isEvaluationOptionalForService(selectedService);
  }, [isEvaluationOptionalForService, selectedService]);

  // Resolve any deposit rule that applies to this booking. Customer-mode
  // now participates so the deposit + card picker can render on Confirm.
  const applicableDepositRule = useMemo(() => {
    if (isEstimateMode || !selectedService) return null;
    const rules = loadDepositRules();
    return findApplicableDepositRule(
      selectedService,
      calculatePrice.total,
      rules,
    );
  }, [isEstimateMode, selectedService, calculatePrice.total]);

  // Sync prompt defaults when the rule or total changes
  useEffect(() => {
    if (!applicableDepositRule) return;
    const required = computeDepositAmount(
      applicableDepositRule,
      calculatePrice.total,
    );
    setDepositPrompt((prev) => ({
      collectNow: prev.ruleLabel === applicableDepositRule.label
        ? prev.collectNow
        : true,
      amount: required,
      method: prev.method ?? "card",
      ruleLabel: applicableDepositRule.label,
      required,
    }));
  }, [applicableDepositRule, calculatePrice.total]);

  // Validation for each step
  const canProceed = useMemo(() => {
    const currentStepId = displayedSteps[currentStep]?.id;
    switch (currentStepId) {
      case "client-pet":
        if (isEstimateMode && isGuestEstimate) {
          return isGuestInquiryComplete;
        }
        if (selectedClientId === null || selectedPetIds.length === 0)
          return false;
        return true;
      case "service":
        if (selectedService === "") return false;
        // Evaluation-eligibility guards — now enforced at the service step
        // because the user picks pets first. This blocks moving forward when
        // the chosen service requires an evaluation the selected pets don't have.
        if (selectedService !== "evaluation") {
          const hasExpired = selectedPets.some((pet) =>
            petHasExpiredEvaluation(pet),
          );
          const hasFailed = selectedPets.some((pet) =>
            petHasFailedEvaluation(pet),
          );
          if (hasExpired || hasFailed) return false;
          if (serviceRequiresEvaluation && !isEvaluationOptional) {
            const petsWithoutEvaluation = selectedPets.filter(
              (pet) => !petHasValidEvaluation(pet),
            );
            if (petsWithoutEvaluation.length > 0) return false;
          }
        }
        return true;
      case "details": {
        if (
          selectedService !== "evaluation" &&
          (selectedService === "daycare" || selectedService === "boarding")
        ) {
          const hasExpired = selectedPets.some((pet) =>
            petHasExpiredEvaluation(pet),
          );
          const hasFailed = selectedPets.some((pet) =>
            petHasFailedEvaluation(pet),
          );
          if (hasExpired || hasFailed) return false;
        }
        return isSubStepComplete(
          currentSubSteps[currentSubStep]?.id ?? currentSubStep,
        );
      }
      case "confirm": {
        if (selectedService !== "evaluation") {
          const hasExpired = selectedPets.some((pet) =>
            petHasExpiredEvaluation(pet),
          );
          const hasFailed = selectedPets.some((pet) =>
            petHasFailedEvaluation(pet),
          );
          if (hasExpired || hasFailed) return false;
        }
        // Waivers: every active, signature-required waiver matching this
        // service (or "general") must be signed before submit. Signatures
        // can be either previously-stored or freshly captured this session.
        const previouslySigned = new Set(
          waiverSignatures.map((s) => s.waiverId),
        );
        const pending = digitalWaivers.filter(
          (w) =>
            w.isActive &&
            w.requiresSignature &&
            !previouslySigned.has(w.id) &&
            !sessionSignedWaiverIds.has(w.id) &&
            (w.type === selectedService || w.type === "general"),
        );
        if (pending.length > 0) return false;
        // Customer-mode deposit: when a rule applies and a deposit > 0 is
        // required, the customer must pick a card before they can submit.
        if (isCustomerMode && applicableDepositRule) {
          const required = computeDepositAmount(
            applicableDepositRule,
            calculatePrice.total,
          );
          if (required > 0 && !customerPaymentMethodId) return false;
        }
        return true;
      }
      default:
        return false;
    }
  }, [
    currentStep,
    displayedSteps,
    currentSubStep,
    selectedClientId,
    selectedPetIds,
    selectedService,
    startDate,
    isSubStepComplete,
    serviceRequiresEvaluation,
    isEvaluationOptional,
    isEstimateMode,
    isGuestEstimate,
    isGuestInquiryComplete,
    selectedPets,
    petHasExpiredEvaluation,
    petHasFailedEvaluation,
    petHasValidEvaluation,
    sessionSignedWaiverIds,
    applicableDepositRule,
    customerPaymentMethodId,
    calculatePrice.total,
    isCustomerMode,
  ]);

  const handleNext = () => {
    // Tip step is showing — dismiss it and proceed to confirm
    if (showingTipStep) {
      setShowingTipStep(false);
      return;
    }

    const currentStepId = displayedSteps[currentStep]?.id;
    // Handle sub-steps for services that split details into multiple panes
    if (
      currentStepId === "details" &&
      (selectedService === "daycare" ||
        selectedService === "boarding" ||
        selectedService === "evaluation" ||
        selectedService === "grooming")
    ) {
      if (currentSubStep < currentSubSteps.length - 1) {
        setCurrentSubStep(currentSubStep + 1);
        return;
      }
    }
    if (currentStep < displayedSteps.length - 1) {
      const nextStep = currentStep + 1;
      const nextStepId = displayedSteps[nextStep]?.id;
      setCurrentStep(nextStep);
      setCurrentSubStep(0);
      setHighestStepReached((prev) => Math.max(prev, nextStep));
      // Show tip step before confirm when tip is enabled
      if (nextStepId === "confirm" && tipConfig?.enabled && !isEstimateMode) {
        setShowingTipStep(true);
      }
    }
  };

  const handlePrevious = () => {
    // Tip step is showing — go back to the previous step (details)
    if (showingTipStep) {
      setShowingTipStep(false);
      const prevStep = currentStep - 1;
      const prevStepId = displayedSteps[prevStep]?.id;
      setCurrentStep(prevStep);
      if (
        prevStepId === "details" &&
        (selectedService === "daycare" ||
          selectedService === "boarding" ||
          selectedService === "evaluation" ||
          selectedService === "grooming")
      ) {
        setCurrentSubStep(currentSubSteps.length - 1);
      } else {
        setCurrentSubStep(0);
      }
      return;
    }

    const currentStepId = displayedSteps[currentStep]?.id;
    const prevStepId = displayedSteps[currentStep - 1]?.id;

    // From confirm, go back to tip step instead of jumping straight to details
    if (currentStepId === "confirm" && tipConfig?.enabled && !isEstimateMode) {
      setShowingTipStep(true);
      return;
    }

    // Handle sub-steps for services that split details into multiple panes
    if (
      currentStepId === "details" &&
      (selectedService === "daycare" ||
        selectedService === "boarding" ||
        selectedService === "evaluation" ||
        selectedService === "grooming")
    ) {
      if (currentSubStep > 0) {
        setCurrentSubStep(currentSubStep - 1);
        return;
      }
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Reset to last sub-step if going back to a multi-pane details step
      if (
        prevStepId === "details" &&
        (selectedService === "daycare" ||
          selectedService === "boarding" ||
          selectedService === "evaluation" ||
          selectedService === "grooming")
      ) {
        setCurrentSubStep(currentSubSteps.length - 1);
      } else {
        setCurrentSubStep(0);
      }
    }
  };

  const handleComplete = () => {
    if (isEstimateMode && isGuestEstimate) {
      setEstimatePricingSnapshot(buildEstimatePricingSnapshot(calculatePrice));
      setGeneratedEstimateId(getNextEstimateId());
      setEstimateCreated(true);
      return;
    }

    const clientId = selectedClientId;
    const petId: number | number[] =
      selectedPetIds.length === 1 ? selectedPetIds[0] : selectedPetIds;

    if (!clientId || !petId) return;

    // Check if service requires evaluation
    const requiresEvaluation = requiresEvaluationForService(selectedService);

    if (requiresEvaluation) {
      const petsNeedingEvaluation = selectedPets.filter((pet) => {
        const hasValidEval =
          pet.evaluations?.some(
            (e) => e.status === "passed" && e.isExpired !== true,
          ) ?? false;
        return !hasValidEval;
      });

      if (petsNeedingEvaluation.length > 0) {
        // Create evaluation bookings for pets that need them
        petsNeedingEvaluation.forEach((pet) => {
          const evaluationBooking: NewBooking = {
            clientId,
            petId: pet.id,
            facilityId,
            service: "evaluation",
            serviceType: evaluationConfig.duration,
            startDate: new Date().toISOString().split("T")[0], // Schedule for today or next available
            endDate: new Date().toISOString().split("T")[0],
            checkInTime: "09:00",
            checkOutTime:
              evaluationConfig.duration === "half-day" ? "12:00" : "17:00",
            status: "pending",
            basePrice: evaluationConfig.price,
            discount: 0,
            totalCost: evaluationConfig.price,
            paymentStatus: "pending",
            notificationEmail: true,
            notificationSMS: false,
          };
          onCreateBooking(evaluationBooking);
        });
        // Show confirmation message
        alert(
          `Evaluation bookings have been created for: ${petsNeedingEvaluation.map((p) => p.name).join(", ")}. The main booking will be created after evaluations are completed.`,
        );
        // Still create the main booking - evaluations can be completed later
      }
    }

    const booking: NewBooking = {
      clientId,
      petId,
      facilityId,
      service: selectedService,
      serviceType:
        selectedService === "evaluation" ? "evaluation" : serviceType,
      startDate:
        selectedService === "daycare" && daycareSelectedDates.length > 0
          ? daycareSelectedDates[0].toISOString().split("T")[0]
          : selectedService === "boarding" && boardingRangeStart
            ? boardingRangeStart.toISOString().split("T")[0]
            : startDate,
      endDate:
        selectedService === "evaluation"
          ? startDate
          : selectedService === "boarding" && boardingRangeEnd
            ? boardingRangeEnd.toISOString().split("T")[0]
            : endDate || startDate,
      checkInTime:
        selectedService === "boarding" && boardingDateTimes.length > 0
          ? boardingDateTimes[0].checkInTime
          : checkInTime,
      checkOutTime:
        selectedService === "boarding" && boardingDateTimes.length > 0
          ? boardingDateTimes[boardingDateTimes.length - 1].checkOutTime
          : checkOutTime,
      status: approvalRequired ? "request_submitted" : "confirmed",
      basePrice: calculatePrice.basePrice,
      discount: calculatePrice.discount,
      totalCost: calculatePrice.total,
      paymentStatus: "pending",
      daycareSelectedDates:
        daycareSelectedDates.length > 0
          ? daycareSelectedDates.map((d) => d.toISOString().split("T")[0])
          : undefined,
      daycareDateTimes:
        daycareDateTimes.length > 0 ? daycareDateTimes : undefined,

      kennel: kennel || undefined,
      // Persist the first pet's auto/manual room assignment so the facility
      // inherits it on the booking record. The facility can override from
      // their side if they want a different room.
      sectionId:
        selectedService === "daycare" && roomAssignments.length > 0
          ? roomAssignments[0].roomId
          : undefined,
      unitAssignment:
        selectedService === "boarding" && roomAssignments.length > 0
          ? roomAssignments[0].roomId
          : undefined,
      feedingSchedule: feedingSchedule || undefined,
      walkSchedule: walkSchedule || undefined,
      medications: medications || undefined,
      extraServices:
        calculatePrice.effectiveExtraServices.length > 0
          ? calculatePrice.effectiveExtraServices
          : undefined,
      notificationEmail: notificationEmail,
      notificationSMS: notificationSMS,
      assignedStaff: (() => {
        if (!selectedStaffId) return undefined;
        const s = facilityStaff.find((m) => m.id === selectedStaffId);
        return s ? `${s.firstName} ${s.lastName}` : undefined;
      })(),
      // For grooming, serviceType holds the picked GroomingPackage.id —
      // mirror it onto the schema's dedicated field so downstream consumers
      // (calendar bridge, invoice line item, etc.) can read it semantically.
      groomingStyle:
        selectedService === "grooming" && serviceType ? serviceType : undefined,
      isMobile:
        selectedService === "grooming" && groomingIsMobile ? true : undefined,
      // Primary groomer assignment — mirror it onto both `stylistPreference`
      // (the dedicated field) and `assignedStaff` (the calendar column key)
      // so the grooming calendar bridge can route the booking correctly.
      stylistPreference:
        selectedService === "grooming" && groomingStylistId
          ? groomingStylistId
          : undefined,
      // Secondary co-groomers + split-service stages.
      additionalStylistIds:
        selectedService === "grooming" &&
        groomingAdditionalStylistIds.length > 0
          ? groomingAdditionalStylistIds
          : undefined,
      groomingStages:
        selectedService === "grooming" && groomingStages.length > 0
          ? groomingStages.map(({ completedAt: _completedAt, ...keep }) => keep)
          : undefined,
      // Manual duration override — already reflected in checkInTime / checkOutTime,
      // but surfaced as a dedicated field so the calendar bridge can pin the
      // block height to staff's choice.
      groomingDurationOverrideMin:
        selectedService === "grooming" && groomingManualDuration !== undefined
          ? groomingManualDuration
          : undefined,
      // Grooming station assignment (filtered by pet size on the wizard side).
      stationAssignment:
        selectedService === "grooming" && groomingStationId
          ? groomingStationId
          : undefined,
      // Grooming-specific add-ons (separate catalog from facility-wide
      // ServiceAddOns which still live on `extraServices`).
      groomingAddOns:
        selectedService === "grooming" && groomingSelectedAddOnIds.length > 0
          ? groomingSelectedAddOnIds
          : undefined,
      tipAmount: tipAmount > 0 ? tipAmount : undefined,
      includesEvaluation: includesEvaluation || undefined,
      evaluationStatus: includesEvaluation ? "pending" : undefined,
      initialDeposit: (() => {
        if (!applicableDepositRule) return undefined;
        // Customer flow: payment method picked on the Confirm panel.
        if (isCustomerMode) {
          const required = computeDepositAmount(
            applicableDepositRule,
            calculatePrice.total,
          );
          if (required <= 0 || !customerPaymentMethodId) return undefined;
          return {
            amount: required,
            method: "card",
            ruleLabel: applicableDepositRule.label,
            collectedAt: new Date().toISOString(),
            paymentMethodId: customerPaymentMethodId,
          };
        }
        // Staff flow: BookingDepositPrompt's collectNow / method / amount.
        if (depositPrompt.collectNow && depositPrompt.amount > 0) {
          return {
            amount: depositPrompt.amount,
            method: depositPrompt.method,
            ruleLabel: applicableDepositRule.label,
            collectedAt: new Date().toISOString(),
          };
        }
        return undefined;
      })(),
    };

    if (isEstimateMode) {
      // In estimate mode, show success state instead of creating a booking
      setEstimatePricingSnapshot(buildEstimatePricingSnapshot(calculatePrice));
      setGeneratedEstimateId(getNextEstimateId());
      setEstimateCreated(true);
      return;
    }

    // Persist the grooming manual price/duration to this pet so the next
    // booking for the same pet+package starts from this number. Only fires
    // when staff explicitly opted in and the pet has a real id (drafted-
    // only pets get a negative id from the quick-create flow — skip those).
    if (
      selectedService === "grooming" &&
      groomingSavePriceToPet &&
      effectiveSelectedPets.length > 0 &&
      effectiveSelectedPets[0].id > 0 &&
      serviceType &&
      (groomingManualPrice !== undefined ||
        groomingManualDuration !== undefined)
    ) {
      saveCustomPetPricingOverride({
        petId: effectiveSelectedPets[0].id,
        packageId: serviceType,
        customPrice: groomingManualPrice,
        customDurationMin: groomingManualDuration,
        note: `Saved from booking on ${startDate || "today"}.`,
        createdBy: "facility-staff",
      });
    }

    if (isCustomerMode) {
      onCreateBooking(booking);
      setBookingRequested(true);
      return;
    }

    onCreateBooking(booking);

    // Post-submit side effects driven by Confirm-screen toggles.
    // 1) Booking confirmation (email / SMS) — driven by the per-booking
    //    notification toggles. The actual content (groomer name, address,
    //    care instructions) is composed by the backend from the booking
    //    record; here we just acknowledge dispatch.
    if (notificationEmail || notificationSMS) {
      const channel =
        notificationEmail && notificationSMS
          ? "email + SMS"
          : notificationEmail
            ? "email"
            : "SMS";
      toast.success("Booking confirmation sent", {
        description: `${channel} with date, time, address, and care instructions.`,
      });
    }

    // 2) SMS / email reminder schedule — driven by the facility-wide
    //    "Booking Reminder" toggle in Settings → Notifications.
    const reminderToggle = notificationToggles.find(
      (t) => t.name === "Booking Reminder",
    );
    if (reminderToggle) {
      const channels = [
        reminderToggle.email && "email",
        reminderToggle.sms && "SMS",
        reminderToggle.push && "push",
      ].filter(Boolean);
      if (channels.length > 0) {
        toast.success("Reminder scheduled", {
          description: `24h before the appointment via ${channels.join(" + ")}.`,
        });
      }
    }

    // 3) Deposit collected → invoice updated with paid amount + remaining
    //    balance. Surfaces the same data the invoice surface will show.
    if (
      applicableDepositRule &&
      depositPrompt.collectNow &&
      depositPrompt.amount > 0
    ) {
      const remaining = Math.max(
        0,
        calculatePrice.total - depositPrompt.amount,
      );
      toast.success(`Deposit of $${depositPrompt.amount.toFixed(2)} applied`, {
        description: `Invoice updated · $${remaining.toFixed(2)} remaining.`,
      });
    }

    if (expressCheckInEnabled) {
      const channel =
        selectedClient?.email && selectedClient.phone
          ? "email + SMS"
          : selectedClient?.email
            ? "email"
            : selectedClient?.phone
              ? "SMS"
              : "the client's contact on file";
      // Lead time is now configured globally per facility (Yipyy → Timing &
      // Reminders → "Initial send time"). Resolve it lazily to avoid pulling
      // the yipyygo-config module into the BookingModal's module graph.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getYipyyGoConfig } =
        require("@/data/yipyygo-config") as typeof import("@/data/yipyygo-config");
      const sendBefore =
        getYipyyGoConfig(facilityId)?.timing.initialSendTime;
      toast.success("Express Check-In form sent", {
        description: `Heading to ${channel}${
          sendBefore ? ` · ${sendBefore}h before the appointment` : ""
        }.`,
      });
    }
    if (redeemedPackageId) {
      const pkg = selectedClient?.packages?.find(
        (p) => p.id === redeemedPackageId,
      );
      if (pkg) {
        toast.success(`Redeemed 1 session from ${pkg.name}`, {
          description: `${Math.max(0, pkg.remainingCredits - 1)} session${
            Math.max(0, pkg.remainingCredits - 1) === 1 ? "" : "s"
          } remaining.`,
        });
      }
    }

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setCurrentSubStep(0);
    setHighestStepReached(0);
    setSearchQuery("");
    setSelectedClientId(null);
    setSelectedPetIds([]);
    setIsGuestEstimate(false);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setGuestPetNames([""]);
    setGuestPetWeights([""]);
    setEstimatePricingSnapshot(null);
    setGeneratedEstimateId(null);
    setDaycareSelectedDates([]);
    setDaycareDateTimes([]);
    setBoardingRangeStart(null);
    setBoardingRangeEnd(null);
    setBoardingDateTimes([]);

    setSelectedService("");
    setServiceType("");
    setStartDate("");
    setEndDate("");
    setCheckInTime("08:00");
    setCheckOutTime("17:00");

    setKennel("");
    setRoomAssignments([]);
    setFeedingSchedule([]);
    setWalkSchedule("");
    setMedications([]);
    setExtraServices([]);
    setNotificationEmail(true);
    setNotificationSMS(false);
    setTipAmount(0);
    setIncludesEvaluation(false);
    setBookingRequested(false);
    setSelectedStaffId(null);
    setRedeemedPackageId(null);
    setExpressCheckInEnabled(true);
    setGroomingIsMobile(false);
    setGroomingStylistId("");
    setGroomingAdditionalStylistIds([]);
    setGroomingStationId("");
    setGroomingStages([]);
    setGroomingManualPrice(undefined);
    setGroomingManualDuration(undefined);
    setGroomingSavePriceToPet(false);
    setGroomingSelectedAddOnIds([]);
    setGroomingAutoAttachedAddOnIds([]);
    setSessionSignedWaiverIds(new Set());
    setCustomerPaymentMethodId(null);
  };

  const handleSendEstimate = () => {
    const latestSnapshot = buildEstimatePricingSnapshot(calculatePrice);

    if (
      estimatePricingSnapshot &&
      pricingSnapshotChanged(estimatePricingSnapshot, latestSnapshot)
    ) {
      setEstimatePricingSnapshot(latestSnapshot);
      setEstimateCreated(false);
      alert(
        "Pricing rules changed while preparing this estimate. Please review the updated total before sending.",
      );
      return;
    }

    setEstimatePricingSnapshot(latestSnapshot);
    setEstimateSent(true);
  };

  const isViewMode = !!booking;

  const getTaskIcon = (type: string): LucideIcon => {
    switch (type) {
      case "feeding":
        return Utensils;
      case "medication":
        return Pill;
      case "service":
        return Scissors;
      case "walking":
        return Clock;
      default:
        return Clock;
    }
  };

  const tasks = useMemo((): Task[] => {
    if (!booking) return [];

    const taskList: Task[] = [];
    const now = new Date();
    const bookingStart = new Date(booking.startDate);
    const isFutureBooking = bookingStart > now;

    // Feeding tasks
    if (booking.feedingSchedule) {
      booking.feedingSchedule.forEach((feed) => {
        const petId = Array.isArray(booking.petId)
          ? booking.petId[0]
          : booking.petId;
        taskList.push({
          id: `feed-${feed.id}`,
          bookingId: booking.id,
          petId,
          type: "feeding",
          title: `Feed ${feed.occasions?.[0]?.label || "Feeding"}`,
          time: feed.occasions?.[0]?.time || "",
          details: feed.prepInstructions?.join(", ") || "",
          assignedStaff: taskAssignments[`feed-${feed.id}`] || undefined,
          completionStatus: "pending",
          assignable: isFutureBooking && !taskAssignments[`feed-${feed.id}`],
        });
      });
    }

    // Medication tasks
    if (booking.medications) {
      booking.medications.forEach((med) => {
        med.times.forEach((time: string) => {
          const petId = Array.isArray(booking.petId)
            ? booking.petId[0]
            : booking.petId;
          taskList.push({
            id: `med-${med.id}-${time}`,
            bookingId: booking.id,
            petId,
            type: "medication",
            title: `Give ${med.name}`,
            time,
            details: med.adminInstructions?.join(", ") || "",
            assignedStaff:
              taskAssignments[`med-${med.id}-${time}`] || undefined,
            completionStatus: "pending",
            assignable:
              isFutureBooking && !taskAssignments[`med-${med.id}-${time}`],
          });
        });
      });
    }

    // Extra services
    if (booking.extraServices) {
      booking.extraServices.forEach((service, index) => {
        // Handle both string[] (grooming) and ExtraService[] (daycare/boarding) types
        if (typeof service === "string") {
          // For string type (grooming), use the string as service name
          const petId = Array.isArray(booking.petId)
            ? booking.petId[0]
            : booking.petId;
          taskList.push({
            id: `service-${service}-${petId}-${index}`,
            bookingId: booking.id,
            petId: petId,
            type: "service",
            title: `Perform ${service}`,
            time: null,
            details: "Extra service",
            assignedStaff:
              taskAssignments[`service-${service}-${petId}-${index}`] ||
              undefined,
            completionStatus: "pending",
            assignable:
              isFutureBooking &&
              !taskAssignments[`service-${service}-${petId}-${index}`],
          });
        } else {
          // For ExtraService object type (daycare/boarding)
          taskList.push({
            id: `service-${service.serviceId}-${service.petId}`,
            bookingId: booking.id,
            petId: service.petId,
            type: "service",
            title: `Perform ${service.serviceId} service`,
            time: null,
            details: `Quantity: ${service.quantity}`,
            assignedStaff:
              taskAssignments[
                `service-${service.serviceId}-${service.petId}`
              ] || undefined,
            completionStatus: "pending",
            assignable:
              isFutureBooking &&
              !taskAssignments[`service-${service.serviceId}-${service.petId}`],
          });
        }
      });
    }

    // Walk schedule for boarding
    if (booking.service === "boarding" && booking.walkSchedule) {
      const petId = Array.isArray(booking.petId)
        ? booking.petId[0]
        : booking.petId;
      taskList.push({
        id: "walk-schedule",
        bookingId: booking.id,
        petId,
        type: "walking",
        title: "Walk Schedule",
        time: null,
        details: booking.walkSchedule,
        assignedStaff: taskAssignments["walk-schedule"] || undefined,
        completionStatus: "pending",
        assignable: isFutureBooking && !taskAssignments["walk-schedule"],
      });
    }

    return taskList;
  }, [booking, taskAssignments]);

  if (isViewMode && booking) {
    const client = clients.find((c) => c.id === booking.clientId);
    const pet = client?.pets.find(
      (p) =>
        p.id ===
        (Array.isArray(booking.petId) ? booking.petId[0] : booking.petId),
    );

    const latestEvaluation = (() => {
      const evals = pet?.evaluations ?? [];
      if (evals.length === 0) return null;
      return [...evals].sort((a, b) => {
        const da = a?.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
        const db = b?.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
        return db - da;
      })[0];
    })();

    const evalExpired =
      latestEvaluation?.isExpired === true ||
      latestEvaluation?.status === "outdated";
    const evalOutcome =
      latestEvaluation?.status === "passed"
        ? "PASS"
        : latestEvaluation?.status === "failed"
          ? "FAIL"
          : latestEvaluation?.status
            ? String(latestEvaluation.status).toUpperCase()
            : "MISSING";

    const requiresEvalForBooking =
      requiresEvaluationForService(booking.service) &&
      !isEvaluationOptionalForService(booking.service);

    const evalCompleted =
      latestEvaluation?.status === "passed" ||
      latestEvaluation?.status === "failed";

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[85vh] w-[90vw] min-w-4xl flex-col overflow-hidden p-0">
          <DialogTitle className="sr-only">Booking Details</DialogTitle>
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Booking #{booking.id}</h2>
                <p className="text-muted-foreground">
                  {client?.name} - {pet?.name} - {booking.service}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {booking.status}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-6 mt-4 grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Service</label>
                        <p className="capitalize">{booking.service}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Service Type
                        </label>
                        <p>{booking.serviceType || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Badge variant="outline" className="capitalize">
                          {booking.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Payment Status
                        </label>
                        <Badge variant="outline" className="capitalize">
                          {booking.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates & Times */}
                <Card>
                  <CardHeader>
                    <CardTitle>Dates & Times</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Start Date
                        </label>
                        <p>{booking.startDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <p>{booking.endDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Check In</label>
                        <p>{booking.checkInTime || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Check Out</label>
                        <p>{booking.checkOutTime || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Base Price
                        </label>
                        <p>${booking.basePrice}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Discount</label>
                        <p>${booking.discount}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Total Cost
                        </label>
                        <p className="font-semibold">${booking.totalCost}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Evaluation (staff) */}
                {(requiresEvalForBooking ||
                  booking.service === "evaluation") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Evaluation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!latestEvaluation ? (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm">
                            No evaluation result
                          </span>
                          <Badge variant="destructive">Missing</Badge>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="text-muted-foreground text-sm">
                              Latest outcome
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  evalOutcome === "PASS"
                                    ? "secondary"
                                    : evalOutcome === "FAIL"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {evalOutcome}
                              </Badge>
                              {(latestEvaluation.status === "passed" ||
                                latestEvaluation.status === "outdated") && (
                                <Badge
                                  variant={
                                    evalExpired ? "destructive" : "secondary"
                                  }
                                >
                                  {evalExpired ? "Expired" : "Valid"}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {(latestEvaluation.evaluatedAt ||
                            latestEvaluation.evaluatedBy) && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">
                                  Evaluated at
                                </div>
                                <div>{latestEvaluation.evaluatedAt || "—"}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Evaluator
                                </div>
                                <div>{latestEvaluation.evaluatedBy || "—"}</div>
                              </div>
                            </div>
                          )}

                          {/* Staff-only notes / failure reason */}
                          {latestEvaluation.notes && (
                            <div className="text-sm">
                              <div className="text-muted-foreground">
                                Notes (staff)
                              </div>
                              <div>{latestEvaluation.notes}</div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Staff reminders */}
                      {requiresEvalForBooking &&
                        booking.status === "completed" &&
                        !evalCompleted && (
                          <Alert variant="destructive">
                            <AlertTitle>Evaluation result missing</AlertTitle>
                            <AlertDescription>
                              Evaluation is required but has not been completed
                              before checkout.
                            </AlertDescription>
                          </Alert>
                        )}
                      {requiresEvalForBooking &&
                        (evalOutcome === "FAIL" ||
                          evalExpired ||
                          evalOutcome === "MISSING") && (
                          <Alert variant="destructive">
                            <AlertTitle>Services locked</AlertTitle>
                            <AlertDescription>
                              Customer must book a new evaluation to unlock
                              services.
                            </AlertDescription>
                          </Alert>
                        )}
                    </CardContent>
                  </Card>
                )}

                {/* Service-specific details */}
                {booking.service === "boarding" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Boarding Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {booking.kennel && (
                        <div>
                          <label className="text-sm font-medium">Kennel</label>
                          <p>{booking.kennel}</p>
                        </div>
                      )}
                      {booking.walkSchedule && (
                        <div>
                          <label className="text-sm font-medium">
                            Walk Schedule
                          </label>
                          <p>{booking.walkSchedule}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {booking.service === "daycare" &&
                  booking.daycareSelectedDates && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Daycare Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <label className="text-sm font-medium">
                            Selected Dates
                          </label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {booking.daycareSelectedDates.map((date) => (
                              <Badge key={date} variant="secondary">
                                {date}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {booking.specialRequests && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Special Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{booking.specialRequests}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Check className="text-muted-foreground/50 mb-4 h-16 w-16" />
                      <h3 className="mb-2 text-lg font-semibold">No Tasks</h3>
                      <p className="text-muted-foreground text-center">
                        This booking does not have any scheduled tasks.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <Card key={task.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-muted rounded-lg p-2">
                              {React.createElement(getTaskIcon(task.type), {
                                className: "size-4",
                              })}
                            </div>
                            <div className="flex-1">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <Badge
                                    variant="outline"
                                    className="text-xs capitalize"
                                  >
                                    {task.type}
                                  </Badge>
                                  <Badge
                                    variant={
                                      task.completionStatus === "completed"
                                        ? "default"
                                        : task.completionStatus ===
                                            "in_progress"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {task.completionStatus.replace("_", " ")}
                                  </Badge>
                                </div>
                                {task.assignedStaff && (
                                  <Badge variant="outline" className="text-xs">
                                    Assigned: {task.assignedStaff}
                                  </Badge>
                                )}
                              </div>
                              {task.time && (
                                <p className="text-muted-foreground mb-1 text-sm">
                                  Time: {task.time}
                                </p>
                              )}
                              <p className="mb-2 text-sm">{task.details}</p>
                              {task.assignable && (
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium">
                                    Assign to:
                                  </label>
                                  <Select
                                    value={task.assignedStaff || ""}
                                    onValueChange={(value) =>
                                      setTaskAssignments((prev) => ({
                                        ...prev,
                                        [task.id]: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Select staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {staffOptions.map((staff) => (
                                        <SelectItem
                                          key={staff.value}
                                          value={staff.value}
                                        >
                                          {staff.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Prevent closing via overlay/escape if user has progress — show confirm instead
        if (!nextOpen && (currentStep > 0 || selectedService)) {
          setShowCancelConfirm(true);
        } else {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="flex h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[90vh] sm:w-[95vw] sm:rounded-lg sm:border lg:min-w-[1024px] xl:min-w-[1200px] [&>button]:hidden">
        <DialogTitle className="sr-only">
          {editMode ? "Edit Booking" : isEstimateMode ? "New Estimate" : "New Booking"}
        </DialogTitle>
        <div className="flex min-h-0 flex-1">
          {/* Side Navigation Tabs */}
          <div className="bg-muted/30 hidden w-80 flex-col border-r lg:flex">
            {/* Title in Sidebar */}
            <div className="bg-background shrink-0 border-b p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="size-5" />
                {editMode ? "Edit Booking" : (() => {
                  const preSelectedClient = clients.find(
                    (c) => c.id === preSelectedClientId,
                  );
                  const preSelectedPet = preSelectedClient?.pets.find(
                    (p) => p.id === preSelectedPetId,
                  );
                  if (preSelectedPet) {
                    return `Book ${preSelectedPet.name}`;
                  } else if (preSelectedClient) {
                    return `Book for ${preSelectedClient.name}`;
                  } else if (selectedService === "daycare") {
                    return daycare.clientFacingName;
                  } else if (selectedService === "boarding") {
                    return boarding.clientFacingName;
                  } else {
                    return isEstimateMode ? "New Estimate" : "New Booking";
                  }
                })()}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {editMode ? "Update dates, room, and add-ons" : (() => {
                  const preSelectedClient = clients.find(
                    (c) => c.id === preSelectedClientId,
                  );
                  const preSelectedPet = preSelectedClient?.pets.find(
                    (p) => p.id === preSelectedPetId,
                  );
                  if (preSelectedPet) {
                    return `Create a new booking for ${preSelectedPet.name}`;
                  } else if (preSelectedClient) {
                    return `Create a new booking for ${preSelectedClient.name}`;
                  } else if (selectedService === "daycare") {
                    return daycare.slogan;
                  } else if (selectedService === "boarding") {
                    return boarding.slogan;
                  } else {
                    return "Create a new booking for your facility";
                  }
                })()}
              </p>
            </div>
            {/* #2 — Progress indicator */}
            <div className="shrink-0 border-b px-4 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Step {currentStep + 1} of {displayedSteps.length}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {Math.round(
                    ((currentStep + (canProceed ? 1 : 0)) /
                      displayedSteps.length) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="bg-muted mt-1.5 h-1 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    selectedService ? accent.progressBar : "bg-primary",
                  )}
                  style={{
                    width: `${((currentStep + (canProceed ? 1 : 0)) / displayedSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {displayedSteps.map((step, idx) => {
                  const isActive = currentStep === idx;
                  let isCompleted = currentStep > idx;
                  if (
                    step.id === "details" &&
                    currentStep === idx &&
                    canProceed
                  ) {
                    isCompleted = true;
                  }
                  const showSubSteps =
                    step.id === "details" &&
                    isActive &&
                    currentSubSteps.length > 0;

                  // #1 — clickable any visited step (not just completed)
                  const canClickStep = !isActive && idx <= highestStepReached;

                  // #6 — simplified Details description (just date, sub-steps handle rest)
                  const detailsDesc = (() => {
                    if (step.id !== "details" || !isCompleted) return null;
                    if (
                      selectedService === "daycare" &&
                      daycareSelectedDates.length > 0
                    )
                      return `${daycareSelectedDates.length} day${daycareSelectedDates.length !== 1 ? "s" : ""} scheduled`;
                    if (
                      selectedService === "boarding" &&
                      boardingRangeStart &&
                      boardingRangeEnd
                    )
                      return `${boardingRangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${boardingRangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                    if (startDate)
                      return new Date(
                        startDate + "T12:00:00",
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                    return null;
                  })();

                  // #5 — pet names with truncation
                  const petSummary = (() => {
                    if (selectedPets.length === 0) return "";
                    if (selectedPets.length <= 2)
                      return selectedPets.map((p) => p.name).join(", ");
                    return `${selectedPets[0].name}, ${selectedPets[1].name} +${selectedPets.length - 2} more`;
                  })();

                  const stepDesc = (() => {
                    if (step.id === "service" && selectedService)
                      return (
                        configs[selectedService as keyof typeof configs]
                          ?.clientFacingName ??
                        getModuleBySlug(selectedService)?.name ??
                        selectedService.charAt(0).toUpperCase() +
                          selectedService.slice(1)
                      );
                    if (step.id === "client-pet" && selectedClient)
                      return `${selectedClient.name}${petSummary ? ` · ${petSummary}` : ""}`;
                    if (step.id === "details" && detailsDesc)
                      return detailsDesc;
                    // #3 — Confirm shows action text, not price (price is in footer)
                    if (step.id === "confirm")
                      return isEstimateMode
                        ? "Review & send"
                        : "Review & create";
                    return step.description;
                  })();

                  return (
                    <div key={step.id}>
                      {/* #1 — clickable step card */}
                      <div
                        role={canClickStep ? "button" : undefined}
                        tabIndex={canClickStep ? 0 : undefined}
                        onClick={() => {
                          if (canClickStep) {
                            setCurrentStep(idx);
                            setCurrentSubStep(0);
                            setShowingTipStep(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            canClickStep &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            setCurrentStep(idx);
                            setCurrentSubStep(0);
                            setShowingTipStep(false);
                          }
                        }}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-all",
                          isActive
                            ? selectedService
                              ? `${accent.border} ${accent.stepBg} text-white shadow-sm`
                              : "border-primary bg-primary text-primary-foreground shadow-sm"
                            : isCompleted
                              ? "border-border bg-background"
                              : "border-muted-foreground/30 bg-muted/50 border-dashed opacity-60",
                          canClickStep &&
                            (selectedService
                              ? `cursor-pointer ${accent.btnHover}`
                              : "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"),
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              isActive
                                ? "bg-white/90 text-slate-800"
                                : isCompleted
                                  ? selectedService
                                    ? `${accent.stepBg} text-white`
                                    : "bg-primary text-primary-foreground"
                                  : "bg-muted-foreground/20 text-muted-foreground",
                            )}
                          >
                            {isCompleted ? (
                              <Check className="size-3" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "mb-0.5 text-sm font-medium",
                                !isActive &&
                                  !isCompleted &&
                                  "text-muted-foreground",
                              )}
                            >
                              {step.title}
                            </p>
                            <p
                              className={cn(
                                "truncate text-xs",
                                isActive
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {stepDesc}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sub-steps */}
                      {showSubSteps && (
                        <div className="mt-1.5 ml-8 space-y-0.5">
                          {currentSubSteps.map((subStep, subIdx) => {
                            const isSubActive = currentSubStep === subIdx;
                            const isSubCompleted = isSubStepComplete(subStep.id);
                            const isVisitedAndCompleted =
                              subIdx < currentSubStep && isSubCompleted;

                            // #4 — only show summary when there's actual data
                            const subSummary = (() => {
                              if (!isVisitedAndCompleted) return null;
                              if (subStep.id === 0) {
                                if (
                                  selectedService === "daycare" &&
                                  daycareSelectedDates.length > 0
                                )
                                  return `${daycareSelectedDates.length} day${daycareSelectedDates.length !== 1 ? "s" : ""}`;
                                if (
                                  selectedService === "boarding" &&
                                  boardingRangeStart &&
                                  boardingRangeEnd
                                )
                                  return `${boardingRangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${boardingRangeEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                                if (startDate)
                                  return new Date(
                                    startDate + "T12:00:00",
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  });
                              }
                              if (
                                subStep.id === 1 &&
                                roomAssignments.length > 0
                              )
                                return `${roomAssignments.length} pet${roomAssignments.length !== 1 ? "s" : ""} assigned`;
                              if (subStep.id === 2 && extraServices.length > 0)
                                return `${extraServices.reduce((s, e) => s + e.quantity, 0)} add-on${extraServices.reduce((s, e) => s + e.quantity, 0) !== 1 ? "s" : ""}`;
                              if (subStep.id === 3) {
                                const parts = [
                                  feedingSchedule.length > 0 &&
                                    `${feedingSchedule.reduce((s, f) => s + f.occasions.length, 0)} meals`,
                                  medications.length > 0 &&
                                    `${medications.length} med${medications.length !== 1 ? "s" : ""}`,
                                ].filter(Boolean);
                                return parts.length > 0
                                  ? parts.join(" · ")
                                  : null;
                              }
                              return null;
                            })();

                            return (
                              <div
                                key={subStep.id}
                                className={cn(
                                  "w-full rounded-md px-3 py-2 text-left text-sm transition-all",
                                  isSubActive
                                    ? selectedService
                                      ? `${accent.subStepBg} ${accent.subStepText} font-medium`
                                      : "bg-primary/20 text-primary font-medium"
                                    : isVisitedAndCompleted
                                      ? "text-foreground"
                                      : "text-muted-foreground",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                      isSubActive || isVisitedAndCompleted
                                        ? selectedService
                                          ? `${accent.stepBg} text-white`
                                          : "bg-primary text-primary-foreground"
                                        : "bg-muted-foreground/20 text-muted-foreground",
                                    )}
                                  >
                                    {isVisitedAndCompleted ? (
                                      <Check className="size-2.5" />
                                    ) : (
                                      subIdx + 1
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span>{subStep.title}</span>
                                    {subSummary && (
                                      <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                                        {subSummary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

          </div>

          {/* Main Content Area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="bg-background border-b p-4">
              {/* Mobile-only progress strip (sidebar is hidden on small screens) */}
              <div className="mb-3 flex items-center gap-3 lg:hidden">
                <span className="text-muted-foreground shrink-0 text-[11px]">
                  {currentStep + 1}/{displayedSteps.length}
                </span>
                <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      selectedService ? accent.progressBar : "bg-primary",
                    )}
                    style={{
                      width: `${((currentStep + (canProceed ? 1 : 0)) / displayedSteps.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                  $
                  {(
                    calculatePrice.total + (isEstimateMode ? 0 : tipAmount)
                  ).toFixed(2)}
                </span>
              </div>
              <h2 className="text-lg font-semibold">
                {showingTipStep
                  ? "Show Your Appreciation"
                  : displayedSteps[currentStep]?.title}
              </h2>
              {displayedSteps[currentStep]?.id === "details" &&
                (selectedService === "daycare" ||
                  selectedService === "boarding" ||
                  selectedService === "evaluation") && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {currentSubSteps[currentSubStep]?.title}
                  </p>
                )}
            </div>
            {showingTipStep && tipConfig?.enabled ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <TipWizardContent
                  tipConfig={tipConfig}
                  subtotal={
                    calculatePrice.subtotal ??
                    calculatePrice.total - (calculatePrice.taxAmount ?? 0)
                  }
                  tipAmount={tipAmount}
                  onTipChange={setTipAmount}
                  petName={selectedPets[0]?.name}
                  serviceLabel={
                    selectedService
                      ? (configs[selectedService as keyof typeof configs]
                          ?.clientFacingName ?? selectedService)
                      : undefined
                  }
                />
              </div>
            ) : (
            <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1">
              <div className="p-6">
                {displayedSteps[currentStep]?.id === "service" && (
                  <ServiceStep
                    selectedService={selectedService}
                    setSelectedService={handleServiceChange}
                    setServiceType={setServiceType}
                    setCurrentSubStep={setCurrentSubStep}
                    configs={configs}
                    bookingFlow={bookingFlow}
                    selectedPets={selectedPets}
                    onBookService={canProceed ? handleNext : undefined}
                  />
                )}
                {displayedSteps[currentStep]?.id === "client-pet" && (
                  <ClientPetStep
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filteredClients={filteredClients}
                    selectedClientId={selectedClientId}
                    setSelectedClientId={setSelectedClientId}
                    selectedPetIds={selectedPetIds}
                    setSelectedPetIds={setSelectedPetIds}
                    selectedClient={selectedClient}
                    preSelectedClientId={preSelectedClientId}
                    selectedService={selectedService}
                    configs={configs}
                    isEstimateMode={isEstimateMode}
                    isGuestEstimate={isGuestEstimate}
                    setIsGuestEstimate={setIsGuestEstimate}
                    guestName={guestName}
                    setGuestName={setGuestName}
                    guestEmail={guestEmail}
                    setGuestEmail={setGuestEmail}
                    guestPhone={guestPhone}
                    setGuestPhone={setGuestPhone}
                    guestPetNames={guestPetNames}
                    setGuestPetNames={setGuestPetNamesSynced}
                    guestPetWeights={guestPetWeights}
                    setGuestPetWeights={setGuestPetWeights}
                    onAddClient={handleAddClient}
                    onAddPet={handleAddPet}
                  />
                )}
                {displayedSteps[currentStep]?.id === "details" && (
                  <DetailsStep
                    selectedService={selectedService}
                    currentSubStep={
                      currentSubSteps[currentSubStep]?.id ?? currentSubStep
                    }
                    isSubStepComplete={isSubStepComplete}
                    daycareSelectedDates={daycareSelectedDates}
                    setDaycareSelectedDates={setDaycareSelectedDates}
                    daycareDateTimes={daycareDateTimes}
                    setDaycareDateTimes={setDaycareDateTimes}
                    roomAssignments={roomAssignments}
                    setRoomAssignments={setRoomAssignments}
                    boardingRangeStart={boardingRangeStart}
                    setBoardingRangeStart={setBoardingRangeStart}
                    boardingRangeEnd={boardingRangeEnd}
                    setBoardingRangeEnd={setBoardingRangeEnd}
                    boardingDateTimes={boardingDateTimes}
                    setBoardingDateTimes={setBoardingDateTimes}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    checkInTime={checkInTime}
                    setCheckInTime={setCheckInTime}
                    checkOutTime={checkOutTime}
                    setCheckOutTime={setCheckOutTime}
                    serviceType={serviceType}
                    setServiceType={setServiceType}
                    feedingSchedule={feedingSchedule}
                    setFeedingSchedule={setFeedingSchedule}
                    medications={medications}
                    setMedications={setMedications}
                    feedingMedicationTab={feedingMedicationTab}
                    setFeedingMedicationTab={setFeedingMedicationTab}
                    extraServices={extraServices}
                    setExtraServices={setExtraServices}
                    selectedPets={effectiveSelectedPets}
                    applyEligibilityFilter={
                      bookingFlow.onlyShowApplicableServices === true
                    }
                    groomingIsMobile={groomingIsMobile}
                    setGroomingIsMobile={setGroomingIsMobile}
                    selectedClient={selectedClient}
                    groomingStylistId={groomingStylistId}
                    setGroomingStylistId={setGroomingStylistId}
                    groomingAdditionalStylistIds={groomingAdditionalStylistIds}
                    setGroomingAdditionalStylistIds={
                      setGroomingAdditionalStylistIds
                    }
                    groomingStationId={groomingStationId}
                    setGroomingStationId={setGroomingStationId}
                    groomingStages={groomingStages}
                    setGroomingStages={setGroomingStages}
                    groomingManualPrice={groomingManualPrice}
                    setGroomingManualPrice={setGroomingManualPrice}
                    groomingManualDuration={groomingManualDuration}
                    setGroomingManualDuration={setGroomingManualDuration}
                    groomingSavePriceToPet={groomingSavePriceToPet}
                    setGroomingSavePriceToPet={setGroomingSavePriceToPet}
                    groomingSelectedAddOnIds={groomingSelectedAddOnIds}
                    setGroomingSelectedAddOnIds={setGroomingSelectedAddOnIds}
                    groomingAutoAttachedAddOnIds={groomingAutoAttachedAddOnIds}
                    setGroomingAutoAttachedAddOnIds={
                      setGroomingAutoAttachedAddOnIds
                    }
                  />
                )}

                {/* Include Evaluation toggle — facility side only, confirm step, non-evaluation services */}
                {!isCustomerMode && !showingTipStep && displayedSteps[currentStep]?.id === "confirm" &&
                  selectedService !== "evaluation" &&
                  !(isEstimateMode && estimateCreated) && (
                    <div className="mx-1 mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100">
                          <ClipboardCheck className="size-4 text-amber-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-900">
                            Include Evaluation
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Schedule a pet evaluation on the first day of this
                            booking
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={includesEvaluation}
                        onCheckedChange={setIncludesEvaluation}
                      />
                    </div>
                  )}

                {/* Staff-facing deposit prompt */}
                {!isCustomerMode &&
                  !showingTipStep &&
                  displayedSteps[currentStep]?.id === "confirm" &&
                  !(isEstimateMode && estimateCreated) &&
                  applicableDepositRule && (
                    <BookingDepositPrompt
                      rule={applicableDepositRule}
                      bookingTotal={calculatePrice.total}
                      value={depositPrompt}
                      onChange={setDepositPrompt}
                    />
                  )}

                {/* Customer-facing deposit panel: pay-now + card picker */}
                {isCustomerMode &&
                  !showingTipStep &&
                  displayedSteps[currentStep]?.id === "confirm" &&
                  !bookingRequested &&
                  applicableDepositRule &&
                  selectedClientId !== null &&
                  selectedClientId > 0 &&
                  (() => {
                    const required = computeDepositAmount(
                      applicableDepositRule,
                      calculatePrice.total,
                    );
                    if (required <= 0) return null;
                    return (
                      <div className="mx-1 mb-4">
                        <CustomerDepositPanel
                          rule={applicableDepositRule}
                          depositAmount={required}
                          bookingTotal={calculatePrice.total}
                          clientId={selectedClientId}
                          selectedPaymentMethodId={customerPaymentMethodId}
                          onSelectPaymentMethod={setCustomerPaymentMethodId}
                        />
                      </div>
                    );
                  })()}

                {/* Customer booking request confirmation state */}
                {isCustomerMode && bookingRequested && (
                  <div className="flex flex-col items-center px-6 py-12 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="size-7 text-emerald-600" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-800">
                      Booking Request Received!
                    </h3>
                    <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
                      {bookingRequestMessage ||
                        bookingFlow.bookingRequestConfirmationMessage ||
                        "Thank you! We've received your booking request and will verify all the details. You'll receive a confirmation email shortly once everything is reviewed and approved."}
                    </p>
                    <Button
                      className="mt-6"
                      onClick={() => {
                        resetForm();
                        onOpenChange(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                )}

                {/* Estimate success state */}
                {!showingTipStep && displayedSteps[currentStep]?.id === "confirm" &&
                  isEstimateMode &&
                  estimateCreated && (
                    <div className="flex flex-col items-center px-6 py-12 text-center">
                      {estimateSent ? (
                        <>
                          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                            <Check className="size-7 text-emerald-600" />
                          </div>
                          <h3 className="mt-4 text-lg font-bold text-slate-800">
                            Estimate Sent!
                          </h3>
                          {generatedEstimateId && (
                            <Badge
                              variant="outline"
                              className="mt-2 font-mono text-xs tracking-wider"
                            >
                              {generatedEstimateId}
                            </Badge>
                          )}
                          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                            The estimate has been sent to{" "}
                            <span className="font-medium text-slate-700">
                              {isGuestEstimate
                                ? guestEmail ||
                                  guestName ||
                                  "the inquiry contact"
                                : selectedClient?.name}
                            </span>
                            .
                          </p>
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                            <p className="text-xl font-bold text-emerald-800 tabular-nums">
                              ${calculatePrice.total.toFixed(2)}
                            </p>
                            <p className="text-xs text-emerald-600">
                              Estimated total
                            </p>
                          </div>
                          <Button
                            className="mt-6"
                            onClick={() => {
                              resetForm();
                              onOpenChange(false);
                            }}
                          >
                            Done
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex size-16 items-center justify-center rounded-full bg-blue-100">
                            <Check className="size-7 text-blue-600" />
                          </div>
                          <h3 className="mt-4 text-lg font-bold text-slate-800">
                            Estimate Created
                          </h3>
                          {generatedEstimateId && (
                            <Badge
                              variant="outline"
                              className="mt-2 font-mono text-xs tracking-wider"
                            >
                              {generatedEstimateId}
                            </Badge>
                          )}
                          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                            Estimate for{" "}
                            <span className="font-medium text-slate-700">
                              {isGuestEstimate
                                ? guestName || guestEmail || "New Inquiry"
                                : selectedClient?.name}
                            </span>{" "}
                            —{" "}
                            {isGuestEstimate
                              ? guestPetSummary.length > 0
                                ? guestPetSummary.join(", ")
                                : "No pets added"
                              : selectedPets.map((p) => p.name).join(", ")}
                          </p>
                          <div className="mt-4 rounded-xl border bg-slate-50 px-5 py-3">
                            <p className="text-xl font-bold tabular-nums">
                              ${calculatePrice.total.toFixed(2)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {selectedService} · {serviceType || "Standard"}
                            </p>
                          </div>
                          <div className="mt-6 flex gap-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                resetForm();
                                onOpenChange(false);
                              }}
                            >
                              Save as Draft
                            </Button>
                            <Button
                              className="gap-1.5"
                              onClick={handleSendEstimate}
                            >
                              <svg
                                className="size-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                                />
                              </svg>
                              Send to Customer
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                {!showingTipStep && displayedSteps[currentStep]?.id === "confirm" &&
                  !(isEstimateMode && estimateCreated) &&
                  !(isCustomerMode && bookingRequested) && (
                    <ConfirmStep
                      selectedClient={selectedClient}
                      selectedPets={selectedPets}
                      selectedService={selectedService}
                      serviceType={serviceType}
                      startDate={startDate}
                      endDate={endDate}
                      checkInTime={checkInTime}
                      checkOutTime={checkOutTime}
                      daycareSelectedDates={daycareSelectedDates}
                      boardingRangeStart={boardingRangeStart}
                      boardingRangeEnd={boardingRangeEnd}
                      boardingDateTimes={boardingDateTimes}
                      roomAssignments={roomAssignments}
                      feedingSchedule={feedingSchedule}
                      medications={medications}
                      extraServices={calculatePrice.effectiveExtraServices}
                      addOnsCatalog={storedAddOns}
                      calculatePrice={calculatePrice}
                      facilityTaxes={
                        facilityTaxConfig?.taxes
                          .filter(
                            (t) =>
                              t.enabled &&
                              (t.appliesTo === "all" ||
                                t.appliesTo === "services_only"),
                          )
                          .map((t) => ({ name: t.name, rate: t.rate }))
                      }
                      notificationEmail={notificationEmail}
                      setNotificationEmail={setNotificationEmail}
                      notificationSMS={notificationSMS}
                      setNotificationSMS={setNotificationSMS}
                      expressCheckInEnabled={expressCheckInEnabled}
                      setExpressCheckInEnabled={setExpressCheckInEnabled}
                      redeemedPackageId={redeemedPackageId}
                      setRedeemedPackageId={setRedeemedPackageId}
                      selectedStaffId={selectedStaffId}
                      setSelectedStaffId={setSelectedStaffId}
                      isMobileGrooming={groomingIsMobile}
                      onWaiverSigned={(waiverId) =>
                        setSessionSignedWaiverIds((prev) => {
                          const next = new Set(prev);
                          next.add(waiverId);
                          return next;
                        })
                      }
                      tipConfig={tipConfig}
                      tipAmount={tipAmount}
                      onTipChange={setTipAmount}
                      onEditStep={(stepIdx, subStep) => {
                        setCurrentStep(stepIdx);
                        setCurrentSubStep(subStep ?? 0);
                      }}
                    />
                  )}
              </div>
            </ScrollArea>
            )}

            {/* Navigation Buttons */}
            {!(isEstimateMode && estimateCreated) && !(isCustomerMode && bookingRequested) && (
              <div className="bg-background flex justify-between border-t p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // If user has made progress, confirm before discarding
                      if (currentStep > 0 || selectedService) {
                        setShowCancelConfirm(true);
                      } else {
                        onOpenChange(false);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  {currentStep < displayedSteps.length - 1 || showingTipStep ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceed}
                      className={
                        selectedService && canProceed
                          ? `${accent.btnBg} text-white`
                          : ""
                      }
                    >
                      {showingTipStep ? "Continue to Review" : "Next"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleComplete}
                      disabled={!canProceed}
                      className={
                        selectedService && canProceed
                          ? `${accent.btnBg} text-white`
                          : ""
                      }
                    >
                      {editMode
                        ? "Save Changes"
                        : isEstimateMode
                          ? "Create Estimate"
                          : isCustomerMode
                            ? "Request Booking"
                            : approvalRequired
                              ? "Submit Request"
                              : "Create Booking"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Cancel confirmation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editMode ? "Discard changes?" : `Discard this ${isEstimateMode ? "estimate" : "booking"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editMode
                ? "All unsaved changes will be lost."
                : "All information you've entered will be lost. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              {editMode ? "Discard changes" : `Discard ${isEstimateMode ? "estimate" : "booking"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
