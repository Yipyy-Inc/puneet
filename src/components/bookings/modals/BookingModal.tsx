"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import {
  STEPS,
  DAYCARE_SUB_STEPS,
  BOARDING_SUB_STEPS,
  EVALUATION_SUB_STEPS,
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
import { evaluationConfig } from "@/data/settings";
import { bookings as historicalBookings } from "@/data/bookings";
import { facilities } from "@/data/facilities";
import {
  facilityConfig,
  isApprovalRequired,
} from "@/data/facility-config";

import type { Client } from "@/types/client";
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
  booking?: Booking;
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
  onCreateBooking,
  preSelectedClientId,
  preSelectedPetId,
  preSelectedService,
  booking,
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

  // Estimate mode detection
  const [isEstimateMode, setIsEstimateMode] = useState(false);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [estimateSent, setEstimateSent] = useState(false);
  const [estimatePricingSnapshot, setEstimatePricingSnapshot] =
    useState<EstimatePricingSnapshot | null>(null);

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
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const mode = localStorage.getItem("booking-modal-mode");
      setIsEstimateMode(mode === "estimate");
      localStorage.removeItem("booking-modal-mode");
      setEstimateCreated(false);
      setEstimateSent(false);
      setEstimatePricingSnapshot(null);
    } else {
      setIsEstimateMode(false);
      setEstimateCreated(false);
      setEstimateSent(false);
      setEstimatePricingSnapshot(null);
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
  const displayedSteps = STEPS.filter(
    (step) =>
      !(step.id === "client-pet" && preSelectedClientId && preSelectedPetId),
  );
  const [currentStep, setCurrentStep] = useState(
    preSelectedService
      ? displayedSteps.findIndex(
          (s) =>
            s.id ===
            (preSelectedClientId && preSelectedPetId
              ? "details"
              : "client-pet"),
        )
      : 0,
  );
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [highestStepReached, setHighestStepReached] = useState(
    preSelectedService
      ? displayedSteps.findIndex(
          (s) =>
            s.id ===
            (preSelectedClientId && preSelectedPetId
              ? "details"
              : "client-pet"),
        )
      : 0,
  );
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Client selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preSelectedClientId ?? null,
  );
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>(
    preSelectedPetId ? [preSelectedPetId] : [],
  );

  // Service selection state
  const [selectedService, setSelectedService] = useState<string>(
    preSelectedService ?? "",
  );
  const accent = getServiceAccent(selectedService);
  const approvalRequired = useMemo(() => {
    if (!selectedService) return false;
    // Built-in services: check facility config
    if (isBuiltinService(selectedService)) return isApprovalRequired(selectedService);
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("08:00");
  const [checkOutTime, setCheckOutTime] = useState("17:00");

  // Daycare specific - multi-date selection
  const [daycareSelectedDates, setDaycareSelectedDates] = useState<Date[]>([]);
  const [daycareDateTimes, setDaycareDateTimes] = useState<DaycareDateTime[]>(
    [],
  );

  // Boarding specific - date range selection
  const [boardingRangeStart, setBoardingRangeStart] = useState<Date | null>(
    null,
  );
  const [boardingRangeEnd, setBoardingRangeEnd] = useState<Date | null>(null);
  const [boardingDateTimes, setBoardingDateTimes] = useState<DaycareDateTime[]>(
    [],
  );

  // Boarding specific
  const [kennel, setKennel] = useState("");
  const [roomAssignments, setRoomAssignments] = useState<
    Array<{ petId: number; roomId: string }>
  >([]);
  const [feedingSchedule, setFeedingSchedule] = useState<FeedingScheduleItem[]>(
    [],
  );
  const [walkSchedule, setWalkSchedule] = useState("");
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [feedingMedicationTab, setFeedingMedicationTab] = useState<
    "feeding" | "medication"
  >("feeding");
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);

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
    initDefaults.email,
  );
  const [notificationSMS, setNotificationSMS] = useState(initDefaults.sms);
  const [tipAmount, setTipAmount] = useState(0);
  const [includesEvaluation, setIncludesEvaluation] = useState(false);

  // Get current sub-steps based on selected service (estimate mode now includes feeding/medication for fee calculation)
  const currentSubSteps = useMemo(() => {
    if (selectedService === "daycare") {
      return DAYCARE_SUB_STEPS;
    }
    if (selectedService === "boarding") {
      return BOARDING_SUB_STEPS;
    }
    if (selectedService === "evaluation") return EVALUATION_SUB_STEPS;
    if (selectedService) {
      return CUSTOM_SERVICE_SUB_STEPS;
    }
    return [];
  }, [selectedService, isEstimateMode]);

  // Check if current sub-step is complete
  const isSubStepComplete = useCallback(
    (stepIndex: number) => {
      if (selectedService === "daycare") {
        switch (stepIndex) {
          case 0:
            return daycareSelectedDates.length > 0;
          case 1:
            return roomAssignments.length === selectedPetIds.length;
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
        switch (stepIndex) {
          case 0:
            return boardingRangeStart !== null && boardingRangeEnd !== null;
          case 1:
            return roomAssignments.length === selectedPetIds.length;
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
        switch (stepIndex) {
          case 0:
            return !!startDate && !!checkInTime && !!checkOutTime;
          case 1: // Add-ons — always complete (optional)
            return true;
          default:
            return false;
        }
      }
      // Grooming, training, custom services — schedule sub-step
      if (stepIndex === 0) {
        return !!startDate && !!checkInTime && !!checkOutTime;
      }
      return true;
    },
    [
      selectedService,
      daycareSelectedDates,
      roomAssignments,
      selectedPetIds,
      boardingRangeStart,
      boardingRangeEnd,
      startDate,
      checkInTime,
      checkOutTime,
    ],
  );

  // Filtered clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone?.includes(query),
    );
  }, [clients, searchQuery]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId);
  }, [clients, selectedClientId]);

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

  const isGuestInquiryComplete = useMemo(() => {
    if (!(isEstimateMode && isGuestEstimate)) return true;

    const hasName = guestName.trim().length > 0;
    const normalizedEmail = guestEmail.trim();
    const hasValidEmail = SIMPLE_EMAIL_REGEX.test(normalizedEmail);
    const hasAtLeastOnePet = guestPetSummary.length > 0;

    return hasName && hasValidEmail && hasAtLeastOnePet;
  }, [
    isEstimateMode,
    isGuestEstimate,
    guestName,
    guestEmail,
    guestPetSummary,
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
    () =>
      getStoredServiceAddOns(facilityId).filter((addOn) => addOn.isActive),
    [open, facilityId, pricingStorageVersion],
  );

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
      basePrice = grooming.basePrice * Math.max(pricingSelectedPetIds.length, 1);
    } else if (selectedService === "training") {
      basePrice = training.basePrice * Math.max(pricingSelectedPetIds.length, 1);
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
          new Set(feedingSchedule.filter((f) => f.occasions.length > 0).map((f) => f.petId)).size || 1;
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

    const subtotal =
      pricingComputation.total + medicationFeeTotal + feedingFeeTotal;
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
  ]);

  // Check if service requires evaluation
  const serviceRequiresEvaluation = useMemo(() => {
    return requiresEvaluationForService(selectedService);
  }, [requiresEvaluationForService, selectedService]);

  // Check if evaluation is optional
  const isEvaluationOptional = useMemo(() => {
    return isEvaluationOptionalForService(selectedService);
  }, [isEvaluationOptionalForService, selectedService]);

  // Validation for each step
  const canProceed = useMemo(() => {
    const currentStepId = displayedSteps[currentStep]?.id;
    switch (currentStepId) {
      case "service":
        return selectedService !== "";
      case "client-pet":
        if (isEstimateMode && isGuestEstimate) {
          return isGuestInquiryComplete;
        }
        if (selectedClientId === null || selectedPetIds.length === 0)
          return false;
        // If any selected pet has an expired or failed evaluation, lock services (except booking a new evaluation)
        if (selectedService !== "evaluation") {
          const hasExpired = selectedPets.some((pet) =>
            petHasExpiredEvaluation(pet),
          );
          const hasFailed = selectedPets.some((pet) =>
            petHasFailedEvaluation(pet),
          );
          if (hasExpired || hasFailed) return false;
        }
        if (serviceRequiresEvaluation && !isEvaluationOptional) {
          const petsWithoutEvaluation = selectedPets.filter(
            (pet) => !petHasValidEvaluation(pet),
          );
          return petsWithoutEvaluation.length === 0;
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
        return isSubStepComplete(currentSubStep);
      }
      case "confirm":
        if (selectedService !== "evaluation") {
          const hasExpired = selectedPets.some((pet) =>
            petHasExpiredEvaluation(pet),
          );
          const hasFailed = selectedPets.some((pet) =>
            petHasFailedEvaluation(pet),
          );
          if (hasExpired || hasFailed) return false;
        }
        return true;
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
  ]);

  const handleNext = () => {
    const currentStepId = displayedSteps[currentStep]?.id;
    // Handle sub-steps for daycare/boarding on details step
    if (
      currentStepId === "details" &&
      (selectedService === "daycare" ||
        selectedService === "boarding" ||
        selectedService === "evaluation")
    ) {
      if (currentSubStep < currentSubSteps.length - 1) {
        setCurrentSubStep(currentSubStep + 1);
        return;
      }
    }
    if (currentStep < displayedSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setCurrentSubStep(0);
      setHighestStepReached((prev) => Math.max(prev, nextStep));
    }
  };

  const handlePrevious = () => {
    const currentStepId = displayedSteps[currentStep]?.id;
    const prevStepId = displayedSteps[currentStep - 1]?.id;
    // Handle sub-steps for daycare/boarding on details step
    if (
      currentStepId === "details" &&
      (selectedService === "daycare" ||
        selectedService === "boarding" ||
        selectedService === "evaluation")
    ) {
      if (currentSubStep > 0) {
        setCurrentSubStep(currentSubStep - 1);
        return;
      }
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Reset to last sub-step if going back to details with daycare/boarding
      if (
        prevStepId === "details" &&
        (selectedService === "daycare" ||
          selectedService === "boarding" ||
          selectedService === "evaluation")
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
      status: approvalRequired ? "request_submitted" : "pending",
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
      feedingSchedule: feedingSchedule || undefined,
      walkSchedule: walkSchedule || undefined,
      medications: medications || undefined,
      extraServices:
        calculatePrice.effectiveExtraServices.length > 0
          ? calculatePrice.effectiveExtraServices
          : undefined,
      notificationEmail: notificationEmail,
      notificationSMS: notificationSMS,
      tipAmount: tipAmount > 0 ? tipAmount : undefined,
      includesEvaluation: includesEvaluation || undefined,
      evaluationStatus: includesEvaluation ? "pending" : undefined,
    };

    if (isEstimateMode) {
      // In estimate mode, show success state instead of creating a booking
      setEstimatePricingSnapshot(buildEstimatePricingSnapshot(calculatePrice));
      setEstimateCreated(true);
      return;
    }

    onCreateBooking(booking);
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
    setEstimatePricingSnapshot(null);
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
      <DialogContent className="flex h-[90vh] w-[95vw] min-w-7xl flex-col overflow-hidden p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">
          {isEstimateMode ? "New Estimate" : "New Booking"}
        </DialogTitle>
        <div className="flex min-h-0 flex-1">
          {/* Side Navigation Tabs */}
          <div className="bg-muted/30 flex w-80 flex-col border-r">
            {/* Title in Sidebar */}
            <div className="bg-background border-b p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="size-5" />
                {(() => {
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
                {(() => {
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
            <div className="border-b px-4 py-2.5">
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
                        <div
                          className={cn(
                            "mt-2 ml-6 space-y-1 border-l-2 pl-4",
                            selectedService
                              ? accent.subStepBorder
                              : "border-primary/30",
                          )}
                        >
                          {currentSubSteps.map((subStep, subIdx) => {
                            const isSubActive = currentSubStep === subIdx;
                            const isSubCompleted = isSubStepComplete(subIdx);
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

            {/* Price Summary at Bottom */}
            <div className="bg-background border-t p-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>
                    {isEstimateMode ? "Estimated Total" : "Total Price"}
                  </span>
                  <span>
                    $
                    {(
                      calculatePrice.total + (isEstimateMode ? 0 : tipAmount)
                    ).toFixed(2)}
                  </span>
                </div>
                {calculatePrice.medicationFeeTotal > 0 && (
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Medication fees</span>
                    <span>+${calculatePrice.medicationFeeTotal.toFixed(2)}</span>
                  </div>
                )}
                {calculatePrice.feedingFeeTotal > 0 && (
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Feeding fee</span>
                    <span>+${calculatePrice.feedingFeeTotal.toFixed(2)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Incl. tip</span>
                    <span>+${tipAmount.toFixed(2)}</span>
                  </div>
                )}
                {isEstimateMode && calculatePrice.taxAmount > 0 && (
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>Incl. tax</span>
                    <span>+${calculatePrice.taxAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="bg-background border-b p-4">
              <h2 className="text-lg font-semibold">
                {displayedSteps[currentStep]?.title}
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
            <ScrollArea className="min-h-0 flex-1">
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
                    setGuestPetNames={setGuestPetNames}
                  />
                )}
                {displayedSteps[currentStep]?.id === "details" && (
                  <DetailsStep
                    selectedService={selectedService}
                    currentSubStep={currentSubStep}
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
                    selectedPets={selectedPets}
                  />
                )}

                {/* Include Evaluation toggle — shown on confirm step for non-evaluation services */}
                {displayedSteps[currentStep]?.id === "confirm" &&
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

                {/* Estimate success state */}
                {displayedSteps[currentStep]?.id === "confirm" &&
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
                          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                            The estimate has been sent to{" "}
                            <span className="font-medium text-slate-700">
                              {isGuestEstimate
                                ? guestEmail || guestName || "the inquiry contact"
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

                {displayedSteps[currentStep]?.id === "confirm" &&
                  !(isEstimateMode && estimateCreated) && (
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
                      notificationEmail={notificationEmail}
                      setNotificationEmail={setNotificationEmail}
                      notificationSMS={notificationSMS}
                      setNotificationSMS={setNotificationSMS}
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

            {/* Navigation Buttons */}
            {!(isEstimateMode && estimateCreated) && (
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
                  {currentStep < displayedSteps.length - 1 ? (
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
                      Next
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
                      {isEstimateMode
                        ? "Create Estimate"
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
              Discard this {isEstimateMode ? "estimate" : "booking"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All information you&apos;ve entered will be lost. This action
              cannot be undone.
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
              Discard {isEstimateMode ? "estimate" : "booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
