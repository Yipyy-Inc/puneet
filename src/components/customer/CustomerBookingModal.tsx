"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { clients } from "@/data/clients";
import {
  SERVICE_CATEGORIES,
  CUSTOMER_BOARDING_ROOM_TYPES,
  GROOMING_PACKAGES,
  GROOMING_ADDONS,
} from "@/components/bookings/modals/constants";
import { defaultServiceAddOns } from "@/data/service-addons";
import type { ServiceAddOn } from "@/types/facility";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  getAllServiceCategories,
  resolveIcon,
  isBuiltinService,
} from "@/lib/service-registry";
import { getCategoryMeta } from "@/data/custom-services";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Dog,
  Cat,
  Scissors,
  PawPrint,
  Bed,
  Receipt,
  Info,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Sparkles,
} from "lucide-react";
import {
  DateSelectionCalendar,
  type DateTimeInfo,
} from "@/components/ui/date-selection-calendar";
import type { Booking } from "@/types/booking";
import type { Pet } from "@/types/pet";
import { toast } from "sonner";
import { vaccinationRecords } from "@/data/pet-data";
import { facilityConfig } from "@/data/facility-config";
import { clientDocuments } from "@/data/documents";
import { vaccinationRules, evaluationConfig } from "@/data/settings";
import { getFormById } from "@/data/forms";
import { getSubmissionsForPet } from "@/data/form-submissions";
import { Syringe } from "lucide-react";
import {
  CareInstructionsStep,
  type CustomerFeedingEntry,
  type CustomerMedicationEntry,
} from "@/components/customer/CareInstructionsStep";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

interface CustomerBookingModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, render as a full page (no Dialog). Requires onCancel. */
  asPage?: boolean;
  /** Required when asPage: called when user clicks Cancel / Back from first step */
  onCancel?: () => void;
  existingBooking?: Booking | null;
  onBookingCreated: () => void;
}

// Load add-ons from settings (same source as facility side)
function getCustomerAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const stored = localStorage.getItem("settings-service-addons");
    if (stored)
      return (JSON.parse(stored) as ServiceAddOn[]).filter((a) => a.isActive);
  } catch {
    /* ignore */
  }
  return defaultServiceAddOns.filter((a) => a.isActive);
}

// Adapt ServiceAddOn to the shape the customer flow expects
function toCustomerAddon(a: ServiceAddOn) {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    image: a.image ?? "",
    services: a.applicableServices as ("daycare" | "boarding")[],
    hasUnits: a.pricingType !== "flat",
    pricePerUnit: a.pricingType !== "flat" ? a.price : undefined,
    unit:
      a.unitLabel ??
      (a.pricingType === "per_day"
        ? "day"
        : a.pricingType === "per_hour"
          ? "hr"
          : "session"),
    basePrice: a.pricingType === "flat" ? a.price : undefined,
    included: [] as string[],
    isDefault: a.isDefault ?? false,
    duration: a.duration,
    petTypeFilter: a.petTypeFilter,
  };
}

const STEPS = [
  { id: "pets", label: "Select Pet(s)" },
  { id: "service", label: "Select Service" },
  { id: "details", label: "Details" },
  { id: "forms", label: "Complete Required Forms" },
  { id: "tip", label: "Tip Your Care Team" },
  { id: "confirm", label: "Confirm" },
];

function WizardWrapper({
  asPage,
  open,
  onOpenChange,
  existingBooking,
  children,
}: {
  asPage: boolean;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  existingBooking?: Booking | null;
  children: ReactNode;
}) {
  if (asPage) {
    return (
      <div className="mx-auto flex min-h-[85vh] w-full max-w-5xl flex-col px-4 py-6">
        {children}
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[98vw] max-w-[1600px] min-w-[90vw] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>
            {existingBooking ? "Reschedule Booking" : "Book a Service"}
          </DialogTitle>
          <DialogDescription>
            Select a service and book for your pets
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function CustomerBookingModal({
  open = true,
  onOpenChange,
  asPage = false,
  onCancel: _onCancel,
  existingBooking,
  onBookingCreated,
}: CustomerBookingModalProps) {
  const { selectedFacility } = useCustomerFacility();
  const {
    daycare,
    boarding,
    grooming,
    training,
    bookingFlow,
    hours,
    rules,
    scheduleTimeOverrides,
    dropOffPickUpOverrides,
    serviceDateBlocks,
  } = useSettings();
  const configs = useMemo(
    () => ({ daycare, boarding, grooming, training }),
    [daycare, boarding, grooming, training],
  );
  const { activeModules, resources: facilityResources } = useCustomServices();
  const allServices = useMemo(
    () => getAllServiceCategories(SERVICE_CATEGORIES, activeModules),
    [activeModules],
  );

  // Get customer and their pets
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );
  const customerPets = useMemo(() => customer?.pets || [], [customer]);

  // Helper to format date without timezone issues
  const formatDateToISO = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState("");
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("08:00");
  const [checkOutTime, setCheckOutTime] = useState("17:00");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<
    "weekly" | "biweekly" | "monthly"
  >("monthly");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [_recurringPreferredDays, _setRecurringPreferredDays] = useState<
    string[]
  >([]);
  const [_recurringPreferredTimeWindow, _setRecurringPreferredTimeWindow] =
    useState({ start: "09:00", end: "17:00" });
  const [_recurringAutoPay, _setRecurringAutoPay] = useState(false);
  const [specialRequests, setSpecialRequests] = useState("");
  const [feedingEntries, setFeedingEntries] = useState<CustomerFeedingEntry[]>(
    [],
  );
  const [medicationEntries, setMedicationEntries] = useState<
    CustomerMedicationEntry[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [_depositRequired, _setDepositRequired] = useState(false);
  const [_depositAmount, _setDepositAmount] = useState(0);
  // Custom module booking state
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(0);
  const [customSelectedResourceId, setCustomSelectedResourceId] =
    useState<string>("");
  const [customPartySize, setCustomPartySize] = useState<number>(1);

  // Custom module detection — resolves the active module when a non-builtin service is selected
  const selectedCustomModule = useMemo(
    () =>
      selectedService && !isBuiltinService(selectedService)
        ? (activeModules.find(
            (m) => m.slug === selectedService || m.id === selectedService,
          ) ?? null)
        : null,
    [selectedService, activeModules],
  );
  const isCustomModule = selectedCustomModule !== null;
  const customCategoryMeta = selectedCustomModule
    ? getCategoryMeta(selectedCustomModule.category)
    : null;

  // Details sub-step (0 = Schedule; daycare/boarding may add Room, Add-ons, Feeding later)
  const [currentDetailsSubStep, setCurrentDetailsSubStep] = useState(0);
  // Daycare: multi-date + time slider
  const [daycareSelectedDates, setDaycareSelectedDates] = useState<Date[]>([]);
  const [daycareDateTimes, setDaycareDateTimes] = useState<DateTimeInfo[]>([]);
  // Boarding: range + time slider
  const [boardingRangeStart, setBoardingRangeStart] = useState<Date | null>(
    null,
  );
  const [boardingRangeEnd, setBoardingRangeEnd] = useState<Date | null>(null);
  const [boardingDateTimes, setBoardingDateTimes] = useState<DateTimeInfo[]>(
    [],
  );
  // Boarding: room type per pet (or same for all if facility does not allow different)
  const [roomAssignments, setRoomAssignments] = useState<
    Array<{ petId: number; roomId: string }>
  >([]);
  /** If false, same room type is applied to all pets and we show one selector. */
  const allowDifferentRoomPerPet = true;
  // Grooming: package + add-ons
  const [selectedGroomingPackage, setSelectedGroomingPackage] = useState("");
  const [selectedGroomingAddons, setSelectedGroomingAddons] = useState<
    string[]
  >([]);
  // Add-ons (daycare/boarding): same shape as facility — serviceId, quantity, petId
  const [extraServices, setExtraServices] = useState<
    Array<{ serviceId: string; quantity: number; petId: number }>
  >([]);
  /** Per add-on: apply to "all" or a specific petId (for UI: All pets vs dropdown) */
  const [addOnApplyTo, setAddOnApplyTo] = useState<
    Record<string, "all" | number>
  >({});
  /** Details modal: room or grooming package (photos + notes) */
  const [detailsOpen, setDetailsOpen] = useState<
    { type: "room"; id: string } | { type: "package"; id: string } | null
  >(null);

  // Check if pets have valid evaluations
  const getLatestEvaluation = useCallback((pet: Pet) => {
    const evals =
      (pet as unknown as { evaluations?: Record<string, unknown>[] })
        .evaluations ?? [];
    if (evals.length === 0) return null;
    return [...evals].sort((a, b) => {
      const da = a?.evaluatedAt ? new Date(String(a.evaluatedAt)).getTime() : 0;
      const db = b?.evaluatedAt ? new Date(String(b.evaluatedAt)).getTime() : 0;
      return db - da;
    })[0];
  }, []);

  const hasValidEvaluation = useCallback(
    (pet: Pet) => {
      const latest = getLatestEvaluation(pet);
      if (!latest) return false;
      if (latest.status === "failed") return false;
      if (latest.status !== "passed") return false;
      if (latest.isExpired === true) return false;
      return true;
    },
    [getLatestEvaluation],
  );

  // Filter available services based on facility rules
  const availableServices = useMemo(() => {
    // Check if mandatory evaluation is enabled
    const isMandatoryEvaluationEnabled =
      bookingFlow.evaluationRequired &&
      bookingFlow.hideServicesUntilEvaluationCompleted;

    // If mandatory evaluation is enabled, check pet evaluation status
    if (isMandatoryEvaluationEnabled) {
      // If no pets selected yet, only show evaluation
      if (selectedPetIds.length === 0) {
        return allServices.filter((service) => service.id === "evaluation");
      }

      // Check if all selected pets have valid evaluations
      const selectedPets = customerPets.filter((p) =>
        selectedPetIds.includes(p.id),
      );
      const allPetsHaveValidEvaluation = selectedPets.every((pet) =>
        hasValidEvaluation(pet),
      );

      if (allPetsHaveValidEvaluation) {
        // All pets have valid evaluation - hide evaluation, show all other services
        return allServices.filter((service) => {
          if (service.id === "evaluation") return false; // Hide evaluation once completed
          if (bookingFlow.hiddenServices.includes(service.id)) return false;
          return true;
        });
      } else {
        // At least one pet needs evaluation - show ONLY evaluation
        return allServices.filter((service) => service.id === "evaluation");
      }
    }

    // If mandatory evaluation is not enabled, use normal filtering
    return allServices.filter((service) => {
      // Hide if facility has hidden this service
      if (bookingFlow.hiddenServices.includes(service.id)) return false;

      // Check service-specific evaluation requirements
      const config = configs[service.id as keyof typeof configs];
      if (
        config?.settings.evaluation?.enabled &&
        !config.settings.evaluation.optional
      ) {
        if (selectedPetIds.length === 0) return false;
        const selectedPets = customerPets.filter((p) =>
          selectedPetIds.includes(p.id),
        );
        return selectedPets.every((pet) => hasValidEvaluation(pet));
      }

      return true;
    });
  }, [
    bookingFlow,
    selectedPetIds,
    customerPets,
    hasValidEvaluation,
    configs,
    allServices,
  ]);

  // Check if service requires evaluation
  const serviceRequiresEvaluation = useCallback(
    (serviceId: string) => {
      if (serviceId === "evaluation") return false;
      if (bookingFlow.evaluationRequired) return true;
      if (bookingFlow.servicesRequiringEvaluation.includes(serviceId))
        return true;
      const config = configs[serviceId as keyof typeof configs];
      return config?.settings.evaluation?.enabled ?? false;
    },
    [bookingFlow, configs],
  );

  // Get selected pets
  const selectedPets = useMemo(
    () => customerPets.filter((p) => selectedPetIds.includes(p.id)),
    [customerPets, selectedPetIds],
  );

  // Number of Details sub-steps: daycare 2 (Schedule, Add-ons); boarding 3 (Schedule, Room Type, Add-ons); grooming 3 (Schedule, Package, Add-ons)
  // Custom modules: 2 (Schedule, Service Details — duration/resource/capacity)
  const detailsSubStepCount = useMemo(() => {
    if (selectedService === "daycare") return 4; // schedule, add-ons, feeding, medication
    if (selectedService === "boarding") return 5; // schedule, room, add-ons, feeding, medication
    if (selectedService === "grooming") return 3;
    if (selectedCustomModule) return 2;
    return 1;
  }, [selectedService, selectedCustomModule]);

  // Add-ons from settings (dynamic, filtered by service + pet eligibility)
  const eligibleAddons = useMemo(() => {
    if (selectedService !== "daycare" && selectedService !== "boarding")
      return [];
    return getCustomerAddOns()
      .filter((a) => a.applicableServices.includes(selectedService))
      .filter((a) => {
        if (!a.petTypeFilter || selectedPets.length === 0) return true;
        const pf = a.petTypeFilter;
        return selectedPets.every((pet) => {
          if (pf.types?.length && !pf.types.includes(pet.type)) return false;
          if (pf.weightMin != null && pet.weight < pf.weightMin) return false;
          if (pf.weightMax != null && pet.weight > pf.weightMax) return false;
          return true;
        });
      })
      .map(toCustomerAddon);
  }, [selectedService, selectedPets]);

  // Boarding: filter room types by pet eligibility (type, weight limits)
  const eligibleBoardingRooms = useMemo(() => {
    if (selectedService !== "boarding" || selectedPets.length === 0)
      return CUSTOMER_BOARDING_ROOM_TYPES;
    return CUSTOMER_BOARDING_ROOM_TYPES.filter((room) => {
      return selectedPets.every((pet) => {
        if (!room.allowedPetTypes.includes(pet.type)) return false;
        if (room.minWeightLbs != null && pet.weight < room.minWeightLbs)
          return false;
        if (room.maxWeightLbs != null && pet.weight > room.maxWeightLbs)
          return false;
        return true;
      });
    });
  }, [selectedService, selectedPets]);

  // Derived date/time for display and submit (from daycare/boarding slider state or single date/time)
  const effectiveStartDate = useMemo(() => {
    if (selectedService === "daycare" && daycareDateTimes.length > 0)
      return daycareDateTimes[0].date;
    if (selectedService === "boarding" && boardingRangeStart)
      return boardingRangeStart.toISOString().slice(0, 10);
    return startDate;
  }, [selectedService, daycareDateTimes, boardingRangeStart, startDate]);
  const effectiveEndDate = useMemo(() => {
    if (selectedService === "boarding" && boardingRangeEnd)
      return boardingRangeEnd.toISOString().slice(0, 10);
    return endDate;
  }, [selectedService, boardingRangeEnd, endDate]);
  const effectiveCheckInTime = useMemo(() => {
    if (selectedService === "daycare" && daycareDateTimes.length > 0)
      return daycareDateTimes[0].checkInTime;
    if (selectedService === "boarding" && boardingDateTimes.length > 0)
      return boardingDateTimes[0].checkInTime;
    return checkInTime;
  }, [selectedService, daycareDateTimes, boardingDateTimes, checkInTime]);
  const effectiveCheckOutTime = useMemo(() => {
    if (selectedService === "daycare" && daycareDateTimes.length > 0)
      return daycareDateTimes[daycareDateTimes.length - 1].checkOutTime;
    if (selectedService === "boarding" && boardingDateTimes.length > 0)
      return boardingDateTimes[boardingDateTimes.length - 1].checkOutTime;
    return checkOutTime;
  }, [selectedService, daycareDateTimes, boardingDateTimes, checkOutTime]);

  // Reset selected service if it's no longer available after pet selection changes
  useEffect(() => {
    if (
      selectedService &&
      !availableServices.find((s) => s.id === selectedService)
    ) {
      setSelectedService("");
    }
  }, [availableServices, selectedService]);

  // Reset Details sub-step and service-specific state when service changes
  useEffect(() => {
    setCurrentDetailsSubStep(0);
    setRoomAssignments([]);
    setSelectedGroomingPackage("");
    setSelectedGroomingAddons([]);
    setExtraServices([]);
    setAddOnApplyTo({});
    // Custom module state
    setCustomDurationMinutes(0);
    setCustomSelectedResourceId("");
    setCustomPartySize(1);
  }, [selectedService]);

  // Facility schedule props for DateSelectionCalendar (time slider)
  const scheduleOverridesForService = useMemo(() => {
    if (!selectedService) return [];
    return scheduleTimeOverrides.filter(
      (o) => !o.services?.length || o.services.includes(selectedService),
    );
  }, [selectedService, scheduleTimeOverrides]);

  const dropOffPickUpWindowsByDate = useMemo(() => {
    const map: Record<
      string,
      {
        dropOffStart: string;
        dropOffEnd: string;
        pickUpStart: string;
        pickUpEnd: string;
      }
    > = {};
    dropOffPickUpOverrides
      .filter((o) => o.services.includes(selectedService))
      .forEach((o) => {
        map[o.date] = {
          dropOffStart: o.dropOffStart,
          dropOffEnd: o.dropOffEnd,
          pickUpStart: o.pickUpStart,
          pickUpEnd: o.pickUpEnd,
        };
      });
    return map;
  }, [selectedService, dropOffPickUpOverrides]);

  const {
    blockedDates,
    blockedStartDates,
    blockedEndDates,
    disabledDateMessages,
  } = useMemo(() => {
    const blocks = serviceDateBlocks.filter((b) =>
      b.services.includes(selectedService),
    );
    const dates = blocks
      .filter((b) => b.closed)
      .map((b) => {
        const [y, m, d] = b.date.split("-").map(Number);
        return new Date(y, m - 1, d);
      });
    const startDates: Date[] = [];
    const endDates: Date[] = [];
    const messages: Record<string, string> = {};
    blocks.forEach((b) => {
      const [y, m, d] = b.date.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      if (b.closed || b.blockCheckIn) startDates.push(date);
      if (b.closed || b.blockCheckOut) endDates.push(date);
      if (b.closureMessage) messages[b.date] = b.closureMessage;
    });
    return {
      blockedDates: dates,
      blockedStartDates: startDates,
      blockedEndDates: endDates,
      disabledDateMessages: messages,
    };
  }, [selectedService, serviceDateBlocks]);

  // Check vaccination status for a pet
  const getPetVaccinationStatus = useCallback((pet: Pet) => {
    const petVaccinations = vaccinationRecords.filter(
      (v) => v.petId === pet.id,
    );
    const facilityRequirements =
      facilityConfig.vaccinationRequirements.requiredVaccinations.filter(
        (v) => v.required,
      );

    const status: {
      missing: string[];
      expired: string[];
      expiringSoon: string[];
      upToDate: string[];
    } = {
      missing: [],
      expired: [],
      expiringSoon: [],
      upToDate: [],
    };

    facilityRequirements.forEach((req) => {
      const petVaccination = petVaccinations.find(
        (v) =>
          v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
          req.name.toLowerCase().includes(v.vaccineName.toLowerCase()),
      );

      if (!petVaccination) {
        status.missing.push(req.name);
      } else {
        const expiryDate = new Date(petVaccination.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntilExpiry < 0) {
          status.expired.push(req.name);
        } else if (daysUntilExpiry <= 30) {
          status.expiringSoon.push(req.name);
        } else {
          status.upToDate.push(req.name);
        }
      }
    });

    return status;
  }, []);

  // Check if pets have required vaccinations for the selected service
  const vaccinationCompliance = useMemo(() => {
    if (selectedPets.length === 0 || !selectedService) return null;

    const serviceType = selectedService.toLowerCase();
    const applicableRules = vaccinationRules.filter((rule) =>
      rule.applicableServices.some((s) => s.toLowerCase() === serviceType),
    );

    const requiredVaccines = applicableRules
      .filter((rule) => rule.required)
      .map((rule) => rule.vaccineName);

    if (requiredVaccines.length === 0) return null;

    const allPetsCompliant = selectedPets.every((pet) => {
      const petStatus = getPetVaccinationStatus(pet);
      return petStatus.missing.length === 0 && petStatus.expired.length === 0;
    });

    const allPetsIssues: { petName: string; issues: string[] }[] = selectedPets
      .map((pet) => {
        const petStatus = getPetVaccinationStatus(pet);
        const issues: string[] = [];

        requiredVaccines.forEach((vaccine) => {
          if (petStatus.missing.includes(vaccine)) {
            issues.push(`${vaccine} is missing`);
          } else if (petStatus.expired.includes(vaccine)) {
            issues.push(`${vaccine} is expired`);
          }
        });

        return { petName: pet.name, issues };
      })
      .filter((p) => p.issues.length > 0);

    return {
      allCompliant: allPetsCompliant,
      issues: allPetsIssues,
      requiredVaccines,
    };
  }, [selectedPets, selectedService, getPetVaccinationStatus]);

  // Required forms/agreements/vaccination for booking (used in "Complete Required Forms" step). 7.1 Includes formRequirements.beforeRequest per service.
  const facilityId = selectedFacility?.id ?? 11;
  const requiredFormsStatus = useMemo(() => {
    const missing: Array<{
      type: "vaccination" | "agreement" | "intake" | "form";
      label: string;
      petId?: number;
      petName?: string;
      link: string;
    }> = [];
    const templates = facilityConfig.waiversAndContracts.templates;
    const requiredAgreementNames: string[] = [];
    if (templates.liabilityWaiver.required)
      requiredAgreementNames.push(templates.liabilityWaiver.name);
    if (selectedService === "daycare" && templates.daycareAgreement.required)
      requiredAgreementNames.push(templates.daycareAgreement.name);
    if (selectedService === "boarding" && templates.boardingContract.required)
      requiredAgreementNames.push(templates.boardingContract.name);
    if (
      selectedService === "grooming" ||
      selectedService === "training" ||
      selectedService === "evaluation"
    ) {
      // Only liability if required
    }

    const clientDocs = clientDocuments.filter(
      (d) =>
        d.clientId === MOCK_CUSTOMER_ID &&
        d.facilityId === facilityId &&
        (d.type === "agreement" || d.type === "waiver") &&
        d.signedAt,
    );
    requiredAgreementNames.forEach((name) => {
      const signed = clientDocs.some((d) =>
        d.name.toLowerCase().includes(name.toLowerCase()),
      );
      if (!signed) {
        missing.push({
          type: "agreement",
          label: name,
          link: "/customer/documents",
        });
      }
    });

    if (
      facilityConfig.vaccinationRequirements.documentationRequired ||
      facilityConfig.vaccinationRequirements.mandatoryRecords
    ) {
      selectedPets.forEach((pet) => {
        const status = getPetVaccinationStatus(pet);
        const hasIssue = status.missing.length > 0 || status.expired.length > 0;
        if (hasIssue) {
          const issues = [
            ...status.missing.map((v) => `${v} missing`),
            ...status.expired.map((v) => `${v} expired`),
          ];
          missing.push({
            type: "vaccination",
            label: issues.join("; "),
            petId: pet.id,
            petName: pet.name,
            link: `/customer/pets/${pet.id}`,
          });
        }
      });
    }

    // 7.1 Required forms before booking (configurable per service)
    const formReq = selectedService
      ? facilityConfig.formRequirements[
          selectedService as keyof typeof facilityConfig.formRequirements
        ]
      : null;
    const beforeRequestFormIds = formReq?.beforeRequest ?? [];
    if (beforeRequestFormIds.length > 0 && selectedPets.length > 0) {
      selectedPets.forEach((pet) => {
        const petSubmissions = getSubmissionsForPet(facilityId, pet.id);
        const completedFormIds = new Set(petSubmissions.map((s) => s.formId));
        beforeRequestFormIds.forEach((formId) => {
          if (completedFormIds.has(formId)) return;
          const form = getFormById(formId);
          missing.push({
            type: "form",
            label: form?.name ?? formId,
            petId: pet.id,
            petName: pet.name,
            link: form?.slug
              ? `/forms/${form.slug}?petId=${pet.id}&customerId=${MOCK_CUSTOMER_ID}`
              : `/customer/pets/${pet.id}`,
          });
        });
      });
    }

    const totalRequirements =
      requiredAgreementNames.length +
      (facilityConfig.vaccinationRequirements.documentationRequired ||
      facilityConfig.vaccinationRequirements.mandatoryRecords
        ? selectedPets.length
        : 0) +
      beforeRequestFormIds.length * selectedPets.length;
    const completedCount = Math.max(0, totalRequirements - missing.length);
    const totalCount = totalRequirements;

    return {
      missing,
      completedCount,
      totalCount,
      allComplete: missing.length === 0,
    };
  }, [selectedService, selectedPets, facilityId, getPetVaccinationStatus]);

  const allowBookingWithoutForms =
    facilityConfig.bookingRules.allowBookingWithoutForms ?? false;

  // Validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Pets
        return selectedPetIds.length > 0;
      case 1: // Service
        return selectedService !== "";
      case 2: // Details (sub-steps)
        if (currentDetailsSubStep === 0) {
          if (selectedService === "daycare") {
            return (
              daycareSelectedDates.length > 0 && daycareDateTimes.length > 0
            );
          }
          if (selectedService === "boarding") {
            return (
              boardingRangeStart != null &&
              boardingRangeEnd != null &&
              boardingDateTimes.length > 0
            );
          }
          // Custom modules: need a date selected
          if (isCustomModule) {
            return startDate !== "";
          }
          return startDate !== "" && checkInTime !== "";
        }
        if (currentDetailsSubStep === 1) {
          if (selectedService === "boarding") {
            return roomAssignments.length === selectedPetIds.length;
          }
          if (selectedService === "grooming") {
            return selectedGroomingPackage !== "";
          }
          // Custom module service details: require duration if variable, resource if applicable
          if (isCustomModule && selectedCustomModule) {
            const hasDurationOptions =
              selectedCustomModule.calendar.durationOptions.length > 0;
            if (hasDurationOptions && customDurationMinutes <= 0) return false;
            const needsResource =
              selectedCustomModule.calendar.assignedTo === "resource" ||
              selectedCustomModule.calendar.assignedTo === "combination";
            const hasResources =
              facilityResources.filter((r) =>
                (
                  selectedCustomModule.calendar.assignedResourceIds ?? []
                ).includes(r.id),
              ).length > 0;
            if (needsResource && hasResources && !customSelectedResourceId)
              return false;
            return true;
          }
        }
        return true;
      case 3: // Complete Required Forms. 7.1 If formRequirements.ifMissing === "block", block until forms complete.
        const formReqBlock = selectedService
          ? facilityConfig.formRequirements[
              selectedService as keyof typeof facilityConfig.formRequirements
            ]
          : null;
        if (formReqBlock?.ifMissing === "block")
          return requiredFormsStatus.allComplete;
        if (allowBookingWithoutForms) return true;
        return requiredFormsStatus.allComplete;
      case 4: // Tip (optional step; always can proceed)
        return true;
      case 5: // Confirm
        if (vaccinationCompliance && !vaccinationCompliance.allCompliant) {
          if (facilityConfig.vaccinationRequirements.mandatoryRecords) {
            return false;
          }
        }
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    selectedService,
    allowBookingWithoutForms,
    requiredFormsStatus.allComplete,
    selectedPetIds,
    startDate,
    checkInTime,
    currentDetailsSubStep,
    daycareSelectedDates.length,
    daycareDateTimes.length,
    boardingRangeStart,
    boardingRangeEnd,
    boardingDateTimes.length,
    roomAssignments.length,
    selectedGroomingPackage,
    vaccinationCompliance,
    isCustomModule,
    selectedCustomModule,
    customDurationMinutes,
    customSelectedResourceId,
    facilityResources,
  ]);

  const handleNext = () => {
    if (!canProceed) return;
    if (currentStep === 2 && currentDetailsSubStep < detailsSubStepCount - 1) {
      setCurrentDetailsSubStep(currentDetailsSubStep + 1);
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      if (currentStep + 1 === 2) setCurrentDetailsSubStep(0);
      if (currentStep + 1 === 3) setCurrentDetailsSubStep(0);
    }
  };

  const handleBack = () => {
    if (currentStep === 2 && currentDetailsSubStep > 0) {
      setCurrentDetailsSubStep(currentDetailsSubStep - 1);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFacility || !customer) return;

    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if facility requires approval or if requirements are incomplete (allow booking without forms)
      const requiresApproval =
        facilityConfig.bookingRules.approvalWorkflow?.enabled ?? false;
      const formsIncomplete =
        allowBookingWithoutForms &&
        !requiredFormsStatus.allComplete &&
        requiredFormsStatus.missing.length > 0;

      if (formsIncomplete) {
        toast.success(
          "Booking request submitted. Approval pending until required forms and documents are completed.",
        );
      } else if (requiresApproval) {
        toast.success(
          "Booking request submitted! The facility will review and respond within 24 hours.",
        );
      } else {
        toast.success("Booking created successfully!");
      }

      onBookingCreated();
      if (!asPage) onOpenChange?.(false);
      // Reset form
      setCurrentStep(0);
      setSelectedService("");
      setSelectedPetIds([]);
      setStartDate("");
      setEndDate("");
      setCurrentDetailsSubStep(0);
      setDaycareSelectedDates([]);
      setDaycareDateTimes([]);
      setBoardingRangeStart(null);
      setBoardingRangeEnd(null);
      setBoardingDateTimes([]);
      setRoomAssignments([]);
      setSelectedGroomingPackage("");
      setSelectedGroomingAddons([]);
      setExtraServices([]);
      setAddOnApplyTo({});
      setSpecialRequests("");
      setFeedingEntries([]);
      setMedicationEntries([]);
      setIsRecurring(false);
      setRecurringFrequency("monthly");
      setRecurringEndDate("");
      _setRecurringPreferredDays([]);
      _setRecurringPreferredTimeWindow({ start: "09:00", end: "17:00" });
      _setRecurringAutoPay(false);
      setTipAmount(0);
      setCustomTipAmount("");
      setTipPercentage(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create booking",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    // If service requires evaluation and pet doesn't have one, show alert
    if (serviceRequiresEvaluation(serviceId) && selectedPetIds.length > 0) {
      const selectedPets = customerPets.filter((p) =>
        selectedPetIds.includes(p.id),
      );
      const needsEvaluation = selectedPets.some(
        (pet) => !hasValidEvaluation(pet),
      );
      if (needsEvaluation) {
        toast.warning(
          "Some selected pets need evaluation before booking this service",
        );
      }
    }
  };

  // Tipping: facility-configurable (enabled, mode, suggestions, recommended)
  const tippingConfig = facilityConfig.bookingRules?.tipping ?? {
    enabled: false,
    mode: "percent" as const,
    percentSuggestions: [10, 15, 20],
    fixedSuggestions: [5, 10, 20],
    recommendedIndex: null as number | null,
  };
  const tipsEnabled = tippingConfig.enabled ?? false;
  const tipSuggestions = useMemo(() => {
    if (tippingConfig.mode === "fixed")
      return (tippingConfig.fixedSuggestions ?? [5, 10, 20]).map((a) => ({
        type: "fixed" as const,
        value: a,
        label: `$${a}`,
      }));
    return (tippingConfig.percentSuggestions ?? [10, 15, 20]).map((p) => ({
      type: "percent" as const,
      value: p,
      label: `${p}%`,
    }));
  }, [
    tippingConfig.mode,
    tippingConfig.percentSuggestions,
    tippingConfig.fixedSuggestions,
  ]);
  const recommendedTipIndex = tippingConfig.recommendedIndex ?? null;

  // Add-ons total (daycare/boarding extra services)
  const extraServicesTotal = useMemo(() => {
    return extraServices.reduce((sum, es) => {
      const addon = eligibleAddons.find((a) => a.id === es.serviceId);
      if (!addon) return sum;
      if (addon.hasUnits && addon.pricePerUnit != null)
        return sum + addon.pricePerUnit * es.quantity;
      return sum + (addon.basePrice ?? 0) * es.quantity;
    }, 0);
  }, [extraServices]);

  // Calculate price (simplified)
  const calculatedPrice = useMemo(() => {
    if (!selectedService) return 0;
    if (selectedService === "grooming") {
      const pkg = GROOMING_PACKAGES.find(
        (p) => p.id === selectedGroomingPackage,
      );
      const pkgPrice = pkg ? pkg.price : 0;
      const addonsPrice = selectedGroomingAddons.reduce(
        (sum, id) =>
          sum + (GROOMING_ADDONS.find((a) => a.id === id)?.price ?? 0),
        0,
      );
      return (pkgPrice + addonsPrice) * selectedPetIds.length;
    }
    if (selectedService === "boarding") {
      let base = 0;
      if (
        roomAssignments.length > 0 &&
        effectiveEndDate &&
        effectiveStartDate
      ) {
        const nights = Math.max(
          1,
          Math.ceil(
            (new Date(effectiveEndDate).getTime() -
              new Date(effectiveStartDate).getTime()) /
              (24 * 60 * 60 * 1000),
          ),
        );
        base = roomAssignments.reduce((sum, a) => {
          const room = CUSTOMER_BOARDING_ROOM_TYPES.find(
            (r) => r.id === a.roomId,
          );
          return sum + (room ? room.price * nights : 0);
        }, 0);
      }
      return base + extraServicesTotal;
    }
    if (selectedService === "daycare") {
      const service = allServices.find((s) => s.id === selectedService);
      const base = service ? service.basePrice * selectedPetIds.length : 0;
      return base + extraServicesTotal;
    }
    // Custom module pricing — duration-based or base price
    if (isCustomModule && selectedCustomModule) {
      const mod = selectedCustomModule;
      // Duration-based: match selected duration to calendar durationOptions or pricing durationTiers
      if (customDurationMinutes > 0) {
        const durationOpt = mod.calendar.durationOptions.find(
          (o) => o.minutes === customDurationMinutes,
        );
        if (durationOpt?.price != null)
          return durationOpt.price * selectedPetIds.length;
        const tier = mod.pricing.durationTiers?.find(
          (t) => t.durationMinutes === customDurationMinutes,
        );
        if (tier) return tier.price * selectedPetIds.length;
      }
      return mod.pricing.basePrice * selectedPetIds.length;
    }
    const service = allServices.find((s) => s.id === selectedService);
    if (!service) return 0;
    return service.basePrice * selectedPetIds.length;
  }, [
    selectedService,
    selectedPetIds,
    selectedGroomingPackage,
    selectedGroomingAddons,
    roomAssignments,
    effectiveStartDate,
    effectiveEndDate,
    extraServicesTotal,
    allServices,
    isCustomModule,
    selectedCustomModule,
    customDurationMinutes,
  ]);

  const totalPrice = useMemo(() => {
    return calculatedPrice + tipAmount;
  }, [calculatedPrice, tipAmount]);

  // Check if deposit is required
  const requiresDeposit = useMemo(() => {
    // TODO: Get from facility config
    return facilityConfig.bookingRules.deposits.required;
  }, []);

  // Calculate deposit amount
  const calculatedDeposit = useMemo(() => {
    if (!requiresDeposit) return 0;
    const depositPercentage =
      facilityConfig.bookingRules.deposits.percentage || 0.5;
    return totalPrice * depositPercentage;
  }, [requiresDeposit, totalPrice]);

  const handleTipPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    const maxPct = tippingConfig.maxTipPercent ?? 100;
    const tip = Math.min(
      (calculatedPrice * percentage) / 100,
      (calculatedPrice * maxPct) / 100,
    );
    setTipAmount(tip);
    setCustomTipAmount("");
  };

  const handleTipFixed = (amount: number) => {
    setTipPercentage(null);
    setTipAmount(amount);
    setCustomTipAmount("");
  };

  const handleCustomTip = (value: string) => {
    setCustomTipAmount(value);
    setTipPercentage(null);
    const tip = parseFloat(value) || 0;
    setTipAmount(Math.min(tip, tippingConfig.maxTipAmount ?? 9999));
  };

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedService("");
      setSelectedPetIds([]);
      setStartDate("");
      setEndDate("");
      setCurrentDetailsSubStep(0);
      setDaycareSelectedDates([]);
      setDaycareDateTimes([]);
      setBoardingRangeStart(null);
      setBoardingRangeEnd(null);
      setBoardingDateTimes([]);
      setRoomAssignments([]);
      setSelectedGroomingPackage("");
      setSelectedGroomingAddons([]);
      setExtraServices([]);
      setAddOnApplyTo({});
      setSpecialRequests("");
      setFeedingEntries([]);
      setMedicationEntries([]);
      setIsRecurring(false);
      setRecurringFrequency("monthly");
      setRecurringEndDate("");
      _setRecurringPreferredDays([]);
      _setRecurringPreferredTimeWindow({ start: "09:00", end: "17:00" });
      _setRecurringAutoPay(false);
      setTipAmount(0);
      setCustomTipAmount("");
      setTipPercentage(null);
      _setDepositRequired(false);
      _setDepositAmount(0);
    }
  }, [open]);

  return (
    <WizardWrapper
      asPage={asPage}
      open={open}
      onOpenChange={onOpenChange}
      existingBooking={existingBooking}
    >
      <div className="relative flex min-h-0 flex-1 flex-col px-6">
        {/* Back à gauche, Next à droite — cercles, légèrement plus petits, grossissent au hover */}
        <div className="absolute top-1/2 -left-20 z-10 -translate-y-1/2">
          <Button
            variant="outline"
            size="lg"
            className="flex h-16 w-16 items-center justify-center gap-1 rounded-full p-0 transition-transform duration-200 hover:scale-110 disabled:hover:scale-100"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="size-5 shrink-0" />
            <span className="text-xs">Back</span>
          </Button>
        </div>
        <div className="absolute top-1/2 -right-20 z-10 -translate-y-1/2">
          {currentStep < STEPS.length - 1 ? (
            <Button
              size="lg"
              className="flex h-16 w-16 items-center justify-center gap-1 rounded-full p-0 transition-transform duration-200 hover:scale-110"
              onClick={handleNext}
              disabled={!canProceed}
            >
              <span className="text-xs">Next</span>
              <ChevronRight className="size-5 shrink-0" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex h-16 w-16 items-center justify-center rounded-full p-0 transition-transform duration-200 hover:scale-110"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "OK"
              )}
            </Button>
          )}
        </div>

        {/* Stepper */}
        <div className="mb-6 shrink-0">
          <Stepper
            steps={STEPS.map((s) => ({ id: s.id, title: s.label }))}
            currentStep={currentStep}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Step 1: Pet Selection */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <Label className="text-base">Select pets</Label>

                  {/* Vaccination Warning */}
                  {vaccinationCompliance &&
                    !vaccinationCompliance.allCompliant && (
                      <Alert
                        className={
                          facilityConfig.vaccinationRequirements
                            .mandatoryRecords
                            ? "border-destructive"
                            : "border-warning"
                        }
                      >
                        <Syringe className="size-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-semibold">
                              {facilityConfig.vaccinationRequirements
                                .mandatoryRecords
                                ? "Vaccination Required"
                                : "Vaccination Warning"}
                            </p>
                            {vaccinationCompliance.issues.map((issue) => (
                              <div key={issue.petName} className="text-sm">
                                <strong>{issue.petName}:</strong>{" "}
                                {issue.issues.join(", ")}
                              </div>
                            ))}
                            {facilityConfig.vaccinationRequirements
                              .mandatoryRecords && (
                              <p className="text-destructive text-sm font-medium">
                                Please update vaccinations before booking.
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                  <div className="space-y-2">
                    {customerPets.map((pet) => {
                      // Get vaccination status for this pet
                      const petVaxStatus = getPetVaccinationStatus(pet);
                      const hasVaxIssues =
                        petVaxStatus.missing.length > 0 ||
                        petVaxStatus.expired.length > 0;

                      // Block selection if mandatory records are required and pet has vaccination issues
                      const isBlocked =
                        facilityConfig.vaccinationRequirements
                          .mandatoryRecords && hasVaxIssues;

                      return (
                        <Card
                          key={pet.id}
                          className={`cursor-pointer transition-all ${
                            selectedPetIds.includes(pet.id)
                              ? "ring-primary ring-2"
                              : "hover:border-primary/50"
                          } ${
                            isBlocked
                              ? `border-destructive/50 cursor-not-allowed opacity-50`
                              : ""
                          } ${
                            hasVaxIssues && !isBlocked
                              ? `border-yellow-200 bg-yellow-50/50`
                              : ""
                          } `}
                          onClick={() => {
                            if (isBlocked) {
                              toast.error(
                                `${pet.name} has missing or expired vaccinations. Please update them first.`,
                              );
                              return;
                            }
                            if (selectedPetIds.includes(pet.id)) {
                              setSelectedPetIds(
                                selectedPetIds.filter((id) => id !== pet.id),
                              );
                            } else {
                              setSelectedPetIds([...selectedPetIds, pet.id]);
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedPetIds.includes(pet.id)}
                                disabled={isBlocked}
                                onCheckedChange={(checked) => {
                                  if (isBlocked) return;
                                  if (checked) {
                                    setSelectedPetIds([
                                      ...selectedPetIds,
                                      pet.id,
                                    ]);
                                  } else {
                                    setSelectedPetIds(
                                      selectedPetIds.filter(
                                        (id) => id !== pet.id,
                                      ),
                                    );
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">{pet.name}</h3>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {hasVaxIssues && (
                                      <Badge
                                        variant="destructive"
                                        className="flex items-center gap-1 text-xs"
                                      >
                                        <Syringe className="size-3" />
                                        {petVaxStatus.missing.length > 0
                                          ? "Missing Vax"
                                          : "Expired Vax"}
                                      </Badge>
                                    )}
                                    {bookingFlow.evaluationRequired &&
                                      bookingFlow.hideServicesUntilEvaluationCompleted &&
                                      !hasValidEvaluation(pet) && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          Needs evaluation
                                        </Badge>
                                      )}
                                  </div>
                                </div>
                                <p className="text-muted-foreground text-sm">
                                  {pet.breed} • {pet.age} years old
                                </p>
                                {(hasVaxIssues ||
                                  (bookingFlow.evaluationRequired &&
                                    !hasValidEvaluation(pet))) && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {(hasVaxIssues ||
                                      !hasValidEvaluation(pet)) && (
                                      <a
                                        href={`/customer/pets/${pet.id}`}
                                        className="text-primary text-xs font-medium hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Fix now →
                                      </a>
                                    )}
                                    {hasVaxIssues && (
                                      <span className="text-destructive text-xs">
                                        {petVaxStatus.missing.length > 0 &&
                                          `${petVaxStatus.missing.join(", ")} missing. `}
                                        {petVaxStatus.expired.length > 0 &&
                                          `${petVaxStatus.expired.join(", ")} expired.`}
                                        {isBlocked && (
                                          <span className="font-medium">
                                            {" "}
                                            Update required before booking.
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Service Selection — same card layout as facility (image, description, from price) */}
              {currentStep === 1 && (
                <div className="space-y-4 p-2">
                  <Label className="text-base">Select a service</Label>

                  {/* When mandatory evaluation and no pets selected: only show Evaluation + message */}
                  {bookingFlow.evaluationRequired &&
                    bookingFlow.hideServicesUntilEvaluationCompleted &&
                    selectedPetIds.length === 0 && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <AlertCircle className="size-4 text-amber-600" />
                        <AlertDescription>
                          <p className="font-semibold text-amber-800 dark:text-amber-200">
                            Evaluation required
                          </p>
                          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                            {bookingFlow.evaluationLockedMessage ??
                              "Please book an evaluation before accessing other services."}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* When mandatory evaluation and some pets need evaluation: show only Evaluation + alert */}
                  {bookingFlow.evaluationRequired &&
                    bookingFlow.hideServicesUntilEvaluationCompleted &&
                    selectedPetIds.length > 0 &&
                    (() => {
                      const selectedPets = customerPets.filter((p) =>
                        selectedPetIds.includes(p.id),
                      );
                      const petsNeedingEvaluation = selectedPets.filter(
                        (pet) => !hasValidEvaluation(pet),
                      );
                      if (petsNeedingEvaluation.length > 0) {
                        return (
                          <Alert className="border-warning bg-warning/10">
                            <AlertCircle className="text-warning size-4" />
                            <AlertDescription>
                              <p className="text-warning font-semibold">
                                Evaluation required
                              </p>
                              <p className="mt-1 text-sm">
                                {petsNeedingEvaluation.length === 1
                                  ? `${petsNeedingEvaluation[0].name} needs to complete an evaluation before booking other services.`
                                  : `The following pets need an evaluation first: ${petsNeedingEvaluation.map((p) => p.name).join(", ")}`}
                              </p>
                              <p className="text-muted-foreground mt-2 text-xs">
                                {bookingFlow.evaluationLockedMessage ??
                                  "Please book an evaluation below. Once completed and approved, other services will be unlocked."}
                              </p>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}

                  <div className="grid grid-cols-1 gap-4 px-1 py-2 sm:grid-cols-2">
                    {availableServices.map((service) => {
                      const Icon = service.icon;
                      const config =
                        configs[service.id as keyof typeof configs];
                      const isDisabled = config?.status.disabled ?? false;
                      const requiresEval = serviceRequiresEvaluation(
                        service.id,
                      );
                      const hasEvalForPets =
                        selectedPetIds.length === 0 ||
                        selectedPets.every((p) => hasValidEvaluation(p));
                      const isEvaluation = service.id === "evaluation";
                      const displayName = isEvaluation
                        ? evaluationConfig.customerName
                        : config?.clientFacingName || service.name;
                      const displayDesc = isEvaluation
                        ? evaluationConfig.description
                        : config?.slogan ||
                          (service as { description?: string }).description ||
                          "";
                      const displayPrice = isEvaluation
                        ? evaluationConfig.price
                        : (config?.basePrice ??
                          (service as { basePrice?: number }).basePrice ??
                          0);
                      const included = (service as { included?: string[] })
                        .included;

                      return (
                        <div
                          key={service.id}
                          className={`relative flex min-h-[240px] flex-col overflow-hidden rounded-lg border-2 transition-all ${
                            isDisabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-pointer"
                          } ${
                            selectedService === service.id && !isDisabled
                              ? `border-primary bg-primary/5 ring-primary shadow-sm ring-2`
                              : !isDisabled
                                ? "hover:border-primary/50 hover:shadow-sm"
                                : ""
                          } `}
                          onClick={() =>
                            !isDisabled && handleServiceSelect(service.id)
                          }
                        >
                          {requiresEval && !hasEvalForPets && !isEvaluation && (
                            <div className="absolute top-2 left-2 z-10">
                              <Badge variant="secondary" className="text-xs">
                                Evaluation required
                              </Badge>
                            </div>
                          )}
                          <div className="bg-muted relative h-28 w-full shrink-0">
                            {config?.bannerImage ? (
                              <Image
                                src={config.bannerImage}
                                alt={displayName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : service.image ? (
                              <Image
                                src={service.image}
                                alt={displayName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div
                                className={`flex size-full items-center justify-center ${
                                  selectedService === service.id && !isDisabled
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                } `}
                              >
                                <Icon className="size-10" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col space-y-1.5 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-base/tight font-semibold">
                                {displayName}
                              </h3>
                              {selectedService === service.id &&
                                !isDisabled && (
                                  <CheckCircle className="text-primary mt-0.5 size-4 shrink-0" />
                                )}
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-xs">
                              {displayDesc}
                            </p>
                            {included && included.length > 0 && (
                              <ul className="text-muted-foreground mt-0.5 space-y-0.5 text-xs">
                                {included.slice(0, 3).map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-1"
                                  >
                                    <CheckCircle className="text-primary size-3 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-auto pt-1">
                              <p className="text-primary text-sm font-bold">
                                {isEvaluation
                                  ? `$${displayPrice}`
                                  : `From $${displayPrice}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Details — Schedule, then Room Type (boarding) or Package + Add-ons (grooming) */}
              {currentStep === 2 && (
                <div className="space-y-4 p-2">
                  {detailsSubStepCount > 1 && (
                    <p className="text-muted-foreground text-sm font-medium">
                      Step {currentDetailsSubStep + 1} of {detailsSubStepCount}
                    </p>
                  )}

                  {/* Sub-step 0: Schedule */}
                  {currentDetailsSubStep === 0 && (
                    <>
                      {selectedService === "daycare" && (
                        <Card>
                          <CardContent className="space-y-4 p-4">
                            <Label className="text-base">
                              Select Daycare Days
                            </Label>
                            <p className="text-muted-foreground text-xs">
                              Drop-off and pick-up times use the same time
                              slider as the facility booking flow.
                            </p>
                            <p className="text-muted-foreground text-xs italic">
                              Play area and group are assigned by the facility.
                            </p>
                            <DateSelectionCalendar
                              mode="multi"
                              selectedDates={daycareSelectedDates}
                              onSelectionChange={setDaycareSelectedDates}
                              showTimeSelection
                              dateTimes={daycareDateTimes}
                              onDateTimesChange={setDaycareDateTimes}
                              facilityHours={hours}
                              scheduleTimeOverrides={
                                scheduleOverridesForService
                              }
                              dropOffPickUpWindowsByDate={
                                dropOffPickUpWindowsByDate
                              }
                              bookingRules={{
                                minimumAdvanceBooking:
                                  rules.minimumAdvanceBooking,
                                maximumAdvanceBooking:
                                  rules.maximumAdvanceBooking,
                              }}
                              disabledDates={blockedDates}
                              disabledDateMessages={disabledDateMessages}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {selectedService === "boarding" && (
                        <Card>
                          <CardContent className="space-y-4 p-4">
                            <Label className="text-base">
                              Select Boarding Dates
                            </Label>
                            <p className="text-muted-foreground mb-2 text-xs">
                              Choose check-in and check-out dates, then set
                              times with the slider (same as facility).
                            </p>
                            <DateSelectionCalendar
                              mode="range"
                              rangeStart={boardingRangeStart}
                              rangeEnd={boardingRangeEnd}
                              onRangeChange={(start, end) => {
                                setBoardingRangeStart(start);
                                setBoardingRangeEnd(end);
                                if (start) setStartDate(formatDateToISO(start));
                                if (end) setEndDate(formatDateToISO(end));
                              }}
                              showTimeSelection
                              dateTimes={boardingDateTimes}
                              onDateTimesChange={(times) => {
                                setBoardingDateTimes(times);
                                if (times.length > 0) {
                                  setCheckInTime(times[0].checkInTime);
                                  setCheckOutTime(
                                    times[times.length - 1].checkOutTime,
                                  );
                                }
                              }}
                              facilityHours={hours}
                              scheduleTimeOverrides={
                                scheduleOverridesForService
                              }
                              dropOffPickUpWindowsByDate={
                                dropOffPickUpWindowsByDate
                              }
                              bookingRules={{
                                minimumAdvanceBooking:
                                  rules.minimumAdvanceBooking,
                                maximumAdvanceBooking:
                                  rules.maximumAdvanceBooking,
                              }}
                              disabledStartDates={blockedStartDates}
                              disabledEndDates={blockedEndDates}
                              disabledDateMessages={disabledDateMessages}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {(selectedService === "grooming" ||
                        selectedService === "evaluation" ||
                        selectedService === "training") && (
                        <Card>
                          <CardContent className="space-y-4 p-4">
                            <Label className="text-base">
                              {selectedService === "grooming"
                                ? "Appointment Date & Time"
                                : "Select Date & Time"}
                            </Label>
                            <DateSelectionCalendar
                              mode="single"
                              selectedDates={
                                startDate
                                  ? [new Date(startDate + "T00:00:00")]
                                  : []
                              }
                              onSelectionChange={(dates) => {
                                if (dates.length > 0)
                                  setStartDate(formatDateToISO(dates[0]));
                              }}
                              showTimeSelection
                              dateTimes={
                                startDate
                                  ? [
                                      {
                                        date: startDate,
                                        checkInTime: checkInTime,
                                        checkOutTime: checkInTime,
                                      },
                                    ]
                                  : []
                              }
                              onDateTimesChange={(times) => {
                                if (times.length > 0) {
                                  setStartDate(times[0].date);
                                  setCheckInTime(times[0].checkInTime);
                                }
                              }}
                              facilityHours={hours}
                              scheduleTimeOverrides={
                                scheduleOverridesForService
                              }
                              bookingRules={{
                                minimumAdvanceBooking:
                                  rules.minimumAdvanceBooking,
                                maximumAdvanceBooking:
                                  rules.maximumAdvanceBooking,
                              }}
                              disabledDates={blockedDates}
                              disabledDateMessages={disabledDateMessages}
                            />
                            {selectedService === "grooming" && (
                              <>
                                <Separator />
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isRecurring}
                                    onCheckedChange={(checked) =>
                                      setIsRecurring(checked === true)
                                    }
                                  />
                                  <Label>
                                    Make this a recurring appointment
                                  </Label>
                                </div>
                                {isRecurring && (
                                  <div className="grid grid-cols-2 gap-4 pl-6">
                                    <div className="space-y-2">
                                      <Label>Frequency</Label>
                                      <Select
                                        value={recurringFrequency}
                                        onValueChange={(
                                          value:
                                            | "weekly"
                                            | "biweekly"
                                            | "monthly",
                                        ) => setRecurringFrequency(value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="weekly">
                                            Weekly
                                          </SelectItem>
                                          <SelectItem value="biweekly">
                                            Bi-weekly
                                          </SelectItem>
                                          <SelectItem value="monthly">
                                            Monthly
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>End Date (Optional)</Label>
                                      <Input
                                        type="date"
                                        value={recurringEndDate}
                                        onChange={(e) =>
                                          setRecurringEndDate(e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Custom Module: Category-aware schedule */}
                      {isCustomModule && selectedCustomModule && (
                        <Card className="overflow-hidden">
                          {/* Module header with category color */}
                          <div
                            className="px-4 py-3"
                            style={{
                              backgroundColor: customCategoryMeta?.color
                                ? `${customCategoryMeta.color}15`
                                : undefined,
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              {(() => {
                                const ModIcon = resolveIcon(
                                  selectedCustomModule.icon,
                                );
                                return (
                                  <ModIcon className="size-5 text-white" />
                                );
                              })()}
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {selectedCustomModule.name}
                                </p>
                                <p className="text-xs text-white/80">
                                  {customCategoryMeta?.name ??
                                    selectedCustomModule.category}
                                </p>
                              </div>
                            </div>
                          </div>
                          <CardContent className="space-y-4 p-4">
                            <Label className="text-base">
                              Select Date & Time
                            </Label>
                            <DateSelectionCalendar
                              mode="single"
                              selectedDates={
                                startDate
                                  ? [new Date(startDate + "T00:00:00")]
                                  : []
                              }
                              onSelectionChange={(dates) => {
                                if (dates.length > 0)
                                  setStartDate(formatDateToISO(dates[0]));
                              }}
                              showTimeSelection
                              dateTimes={
                                startDate
                                  ? [
                                      {
                                        date: startDate,
                                        checkInTime: checkInTime,
                                        checkOutTime: checkInTime,
                                      },
                                    ]
                                  : []
                              }
                              onDateTimesChange={(times) => {
                                if (times.length > 0) {
                                  setStartDate(times[0].date);
                                  setCheckInTime(times[0].checkInTime);
                                }
                              }}
                              facilityHours={hours}
                              scheduleTimeOverrides={
                                scheduleOverridesForService
                              }
                              bookingRules={{
                                minimumAdvanceBooking:
                                  rules.minimumAdvanceBooking,
                                maximumAdvanceBooking:
                                  rules.maximumAdvanceBooking,
                              }}
                              disabledDates={blockedDates}
                              disabledDateMessages={disabledDateMessages}
                            />

                            {/* Capacity / availability hint */}
                            {selectedCustomModule.calendar
                              .maxSimultaneousBookings > 0 &&
                              startDate && (
                                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                                  <CheckCircle className="size-3.5 shrink-0" />
                                  <span>
                                    Up to{" "}
                                    {
                                      selectedCustomModule.calendar
                                        .maxSimultaneousBookings
                                    }{" "}
                                    booking
                                    {selectedCustomModule.calendar
                                      .maxSimultaneousBookings !== 1
                                      ? "s"
                                      : ""}{" "}
                                    available per slot
                                    {selectedCustomModule.calendar
                                      .bufferTimeMinutes > 0 && (
                                      <>
                                        {" "}
                                        ·{" "}
                                        {
                                          selectedCustomModule.calendar
                                            .bufferTimeMinutes
                                        }{" "}
                                        min buffer between sessions
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}

                  {/* Custom Module Sub-step 1: Service Details */}
                  {currentDetailsSubStep === 1 &&
                    isCustomModule &&
                    selectedCustomModule && (
                      <div className="space-y-4 px-1 py-2">
                        <div>
                          <Label className="text-base font-semibold">
                            Service Details
                          </Label>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Configure your {selectedCustomModule.name} booking
                          </p>
                        </div>

                        {/* Duration picker — for timed sessions / variable duration */}
                        {selectedCustomModule.calendar.enabled &&
                          selectedCustomModule.calendar.durationOptions.length >
                            0 && (
                            <Card>
                              <CardContent className="space-y-3 p-4">
                                <div className="flex items-center gap-2">
                                  <Clock className="text-muted-foreground size-4" />
                                  <Label className="text-sm font-semibold">
                                    Session Duration
                                  </Label>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                  {selectedCustomModule.calendar.durationOptions.map(
                                    (opt) => (
                                      <button
                                        key={opt.minutes}
                                        type="button"
                                        onClick={() =>
                                          setCustomDurationMinutes(opt.minutes)
                                        }
                                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                                          customDurationMinutes === opt.minutes
                                            ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                                            : "border-border hover:border-border/80 hover:bg-accent/30"
                                        }`}
                                      >
                                        <p
                                          className={`text-lg font-bold tabular-nums ${customDurationMinutes === opt.minutes ? "text-primary" : ""}`}
                                        >
                                          {opt.minutes}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                          minutes
                                        </p>
                                        {opt.price != null && (
                                          <p
                                            className={`mt-1 text-sm font-semibold ${customDurationMinutes === opt.minutes ? "text-primary" : "text-foreground"}`}
                                          >
                                            ${opt.price.toFixed(2)}
                                          </p>
                                        )}
                                      </button>
                                    ),
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                        {/* Resource selection — pools, vans, rooms */}
                        {(selectedCustomModule.calendar.assignedTo ===
                          "resource" ||
                          selectedCustomModule.calendar.assignedTo ===
                            "combination") && (
                          <Card>
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-center gap-2">
                                <MapPin className="text-muted-foreground size-4" />
                                <Label className="text-sm font-semibold">
                                  Select Location / Resource
                                </Label>
                              </div>
                              <div className="space-y-2">
                                {facilityResources
                                  .filter((r) =>
                                    (
                                      selectedCustomModule.calendar
                                        .assignedResourceIds ?? []
                                    ).includes(r.id),
                                  )
                                  .map((res) => (
                                    <button
                                      key={res.id}
                                      type="button"
                                      onClick={() =>
                                        setCustomSelectedResourceId(res.id)
                                      }
                                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                                        customSelectedResourceId === res.id
                                          ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                                          : "border-border hover:border-border/80 hover:bg-accent/30"
                                      }`}
                                    >
                                      <div
                                        className={`flex size-10 items-center justify-center rounded-lg ${
                                          customSelectedResourceId === res.id
                                            ? "bg-primary/10"
                                            : "bg-muted/50"
                                        }`}
                                      >
                                        <MapPin
                                          className={`size-5 ${customSelectedResourceId === res.id ? "text-primary" : "text-muted-foreground"}`}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold">
                                          {res.name}
                                        </p>
                                        <p className="text-muted-foreground text-xs capitalize">
                                          {res.type} · Capacity: {res.capacity}
                                        </p>
                                      </div>
                                      {customSelectedResourceId === res.id && (
                                        <CheckCircle className="text-primary size-5 shrink-0" />
                                      )}
                                    </button>
                                  ))}
                                {facilityResources.filter((r) =>
                                  (
                                    selectedCustomModule.calendar
                                      .assignedResourceIds ?? []
                                  ).includes(r.id),
                                ).length === 0 && (
                                  <p className="text-muted-foreground text-xs italic">
                                    No specific resources assigned — facility
                                    will allocate on arrival.
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Party size — for event-based or transport */}
                        {(selectedCustomModule.category === "event_based" ||
                          selectedCustomModule.category === "transport") && (
                          <Card>
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-center gap-2">
                                <Users className="text-muted-foreground size-4" />
                                <Label className="text-sm font-semibold">
                                  {selectedCustomModule.category === "transport"
                                    ? "Dogs on This Route"
                                    : "Party Size (Dogs)"}
                                </Label>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-9"
                                  disabled={customPartySize <= 1}
                                  onClick={() =>
                                    setCustomPartySize((p) =>
                                      Math.max(1, p - 1),
                                    )
                                  }
                                >
                                  -
                                </Button>
                                <span className="w-12 text-center text-2xl font-bold tabular-nums">
                                  {customPartySize}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-9"
                                  disabled={
                                    customPartySize >=
                                    (selectedCustomModule.onlineBooking
                                      .maxDogsPerSession || 20)
                                  }
                                  onClick={() =>
                                    setCustomPartySize((p) => p + 1)
                                  }
                                >
                                  +
                                </Button>
                                <span className="text-muted-foreground text-xs">
                                  max{" "}
                                  {selectedCustomModule.onlineBooking
                                    .maxDogsPerSession || "—"}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Module info card */}
                        <div className="bg-muted/30 flex items-start gap-3 rounded-xl border p-4">
                          <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <div className="text-muted-foreground space-y-1 text-xs">
                            <p>{selectedCustomModule.description}</p>
                            {selectedCustomModule.checkInOut.enabled && (
                              <p className="font-medium">
                                {selectedCustomModule.checkInOut.checkInType ===
                                "auto"
                                  ? "Auto check-in at booking time"
                                  : "Check-in required on arrival"}
                                {selectedCustomModule.checkInOut
                                  .qrCodeSupport && " · QR check-in available"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Sub-step 1 (Daycare): Add-ons */}
                  {currentDetailsSubStep === 1 &&
                    selectedService === "daycare" && (
                      <div className="space-y-4 px-1 py-2">
                        <div>
                          <Label className="text-base font-semibold">
                            Add-ons
                          </Label>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Add optional services to enhance your pet&apos;s
                            daycare experience
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {eligibleAddons.map((addon) => {
                            const applyTo = addOnApplyTo[addon.id] ?? "all";
                            const isAll = applyTo === "all";
                            const targetPetIds = isAll
                              ? selectedPets.map((p) => p.id)
                              : [applyTo as number];
                            const currentQty =
                              targetPetIds.length > 0
                                ? (extraServices.find(
                                    (es) =>
                                      es.serviceId === addon.id &&
                                      es.petId === targetPetIds[0],
                                  )?.quantity ?? 0)
                                : 0;
                            const totalQty = extraServices
                              .filter((es) => es.serviceId === addon.id)
                              .reduce((s, es) => s + es.quantity, 0);
                            return (
                              <Card
                                key={addon.id}
                                className={`flex min-h-[240px] flex-col overflow-hidden ${totalQty > 0 ? `ring-primary ring-2` : ""} `}
                              >
                                <div className="bg-muted relative h-28 w-full shrink-0">
                                  <Image
                                    src={addon.image}
                                    alt={addon.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <CardContent className="flex flex-1 flex-col space-y-2 p-3">
                                  <div>
                                    <h4 className="text-sm font-semibold">
                                      {addon.name}
                                    </h4>
                                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                      {addon.description}
                                    </p>
                                  </div>
                                  {addon.included &&
                                    addon.included.length > 0 && (
                                      <ul className="text-muted-foreground space-y-0.5 text-xs">
                                        {addon.included
                                          .slice(0, 2)
                                          .map((item, i) => (
                                            <li
                                              key={i}
                                              className="flex items-center gap-1"
                                            >
                                              <CheckCircle className="text-primary size-3 shrink-0" />
                                              {item}
                                            </li>
                                          ))}
                                      </ul>
                                    )}
                                  <p className="text-primary text-sm font-semibold">
                                    {addon.hasUnits
                                      ? `$${addon.pricePerUnit} / ${addon.unit}`
                                      : `$${addon.basePrice}`}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground text-xs">
                                      Apply to:
                                    </span>
                                    <Select
                                      value={isAll ? "all" : String(applyTo)}
                                      onValueChange={(v) => {
                                        setAddOnApplyTo((prev) => ({
                                          ...prev,
                                          [addon.id]:
                                            v === "all" ? "all" : Number(v),
                                        }));
                                        if (v === "all") {
                                          setExtraServices((prev) => [
                                            ...prev.filter(
                                              (es) => es.serviceId !== addon.id,
                                            ),
                                            ...selectedPets.map((p) => ({
                                              serviceId: addon.id,
                                              quantity: currentQty || 1,
                                              petId: p.id,
                                            })),
                                          ]);
                                        } else {
                                          const petId = Number(v);
                                          setExtraServices((prev) => [
                                            ...prev.filter(
                                              (es) => es.serviceId !== addon.id,
                                            ),
                                            {
                                              serviceId: addon.id,
                                              quantity: currentQty || 1,
                                              petId,
                                            },
                                          ]);
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">
                                          All pets
                                        </SelectItem>
                                        {selectedPets.map((p) => (
                                          <SelectItem
                                            key={p.id}
                                            value={String(p.id)}
                                          >
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="mt-auto flex items-center gap-2 pt-0.5">
                                    {addon.hasUnits ? (
                                      <>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="size-7 p-0 text-xs"
                                          disabled={currentQty === 0}
                                          onClick={() => {
                                            if (currentQty <= 0) return;
                                            const newQty = currentQty - 1;
                                            setExtraServices((prev) => {
                                              const next = prev.filter(
                                                (es) =>
                                                  !(
                                                    es.serviceId === addon.id &&
                                                    targetPetIds.includes(
                                                      es.petId,
                                                    )
                                                  ),
                                              );
                                              targetPetIds.forEach((petId) => {
                                                if (newQty > 0)
                                                  next.push({
                                                    serviceId: addon.id,
                                                    quantity: newQty,
                                                    petId,
                                                  });
                                              });
                                              return next;
                                            });
                                          }}
                                        >
                                          -
                                        </Button>
                                        <span className="min-w-[2ch] text-center text-xs font-medium">
                                          {currentQty}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="size-7 p-0 text-xs"
                                          onClick={() => {
                                            const newQty = currentQty + 1;
                                            setExtraServices((prev) => {
                                              const next = prev.filter(
                                                (es) =>
                                                  !(
                                                    es.serviceId === addon.id &&
                                                    targetPetIds.includes(
                                                      es.petId,
                                                    )
                                                  ),
                                              );
                                              targetPetIds.forEach((petId) => {
                                                next.push({
                                                  serviceId: addon.id,
                                                  quantity: newQty,
                                                  petId,
                                                });
                                              });
                                              return next;
                                            });
                                          }}
                                        >
                                          +
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant={
                                          currentQty > 0 ? "default" : "outline"
                                        }
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => {
                                          if (currentQty > 0) {
                                            setExtraServices((prev) =>
                                              prev.filter(
                                                (es) =>
                                                  !(
                                                    es.serviceId === addon.id &&
                                                    targetPetIds.includes(
                                                      es.petId,
                                                    )
                                                  ),
                                              ),
                                            );
                                          } else {
                                            setExtraServices((prev) => {
                                              const next = prev.filter(
                                                (es) =>
                                                  es.serviceId !== addon.id,
                                              );
                                              targetPetIds.forEach((petId) =>
                                                next.push({
                                                  serviceId: addon.id,
                                                  quantity: 1,
                                                  petId,
                                                }),
                                              );
                                              return next;
                                            });
                                          }
                                        }}
                                      >
                                        {currentQty > 0 ? (
                                          <>
                                            <CheckCircle className="mr-1 size-3" />{" "}
                                            Added
                                          </>
                                        ) : (
                                          "Add"
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Sub-step 1 (Boarding): Room Type */}
                  {currentDetailsSubStep === 1 &&
                    selectedService === "boarding" && (
                      <div className="space-y-4 px-1 py-2">
                        <Label className="text-base">Choose room type</Label>
                        <p className="text-muted-foreground text-sm">
                          {allowDifferentRoomPerPet
                            ? "Select a room type for each pet. Only rooms that fit your pets are shown."
                            : "One room type will apply to all pets."}
                        </p>
                        {eligibleBoardingRooms.length === 0 ? (
                          <Alert>
                            <AlertDescription>
                              No room types match your selected pets (type or
                              weight). Please contact the facility.
                            </AlertDescription>
                          </Alert>
                        ) : allowDifferentRoomPerPet ? (
                          <div className="space-y-4">
                            {selectedPets.map((pet) => {
                              const assigned = roomAssignments.find(
                                (a) => a.petId === pet.id,
                              );
                              return (
                                <Card key={pet.id}>
                                  <CardContent className="p-4">
                                    <p className="mb-3 font-medium">
                                      <PawPrint className="mr-1 inline size-4" />
                                      {pet.name} ({pet.type}, {pet.weight} lbs)
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      {eligibleBoardingRooms.map((room) => {
                                        const available =
                                          room.totalRooms - room.bookedRooms;
                                        const isSelected =
                                          assigned?.roomId === room.id;
                                        return (
                                          <div
                                            key={room.id}
                                            onClick={() => {
                                              if (available > 0) {
                                                setRoomAssignments((prev) => [
                                                  ...prev.filter(
                                                    (a) => a.petId !== pet.id,
                                                  ),
                                                  {
                                                    petId: pet.id,
                                                    roomId: room.id,
                                                  },
                                                ]);
                                              }
                                            }}
                                            className={`flex min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-all ${
                                              isSelected
                                                ? "border-primary bg-primary/5"
                                                : `border-border hover:border-primary/50`
                                            } ${
                                              available === 0
                                                ? `cursor-not-allowed opacity-60`
                                                : ""
                                            } `}
                                          >
                                            <div className="bg-muted relative h-28 shrink-0">
                                              {room.image ? (
                                                <Image
                                                  src={room.image}
                                                  alt={room.name}
                                                  fill
                                                  className="object-cover"
                                                  unoptimized
                                                />
                                              ) : (
                                                <div className="flex size-full items-center justify-center">
                                                  <Bed className="text-muted-foreground size-8" />
                                                </div>
                                              )}
                                              {isSelected && (
                                                <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1">
                                                  <CheckCircle className="size-4" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex flex-1 flex-col p-2.5">
                                              <h4 className="text-sm font-semibold">
                                                {room.name}
                                              </h4>
                                              <p className="text-primary mt-0.5 text-xs font-bold">
                                                ${room.price}/night
                                              </p>
                                              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                                {room.description}
                                              </p>
                                              <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                                                {room.included
                                                  .slice(0, 3)
                                                  .map((item, i) => (
                                                    <li
                                                      key={i}
                                                      className="flex items-center gap-1"
                                                    >
                                                      <CheckCircle className="text-primary size-3 shrink-0" />
                                                      {item}
                                                    </li>
                                                  ))}
                                              </ul>
                                              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                                {room.allowedPetTypes.includes(
                                                  "Dog",
                                                ) && (
                                                  <Dog className="size-3.5" />
                                                )}
                                                {room.allowedPetTypes.includes(
                                                  "Cat",
                                                ) && (
                                                  <Cat className="size-3.5" />
                                                )}
                                                {(room.minWeightLbs != null ||
                                                  room.maxWeightLbs !=
                                                    null) && (
                                                  <span>
                                                    {room.minWeightLbs !=
                                                      null &&
                                                      `≥${room.minWeightLbs} lbs`}
                                                    {room.maxWeightLbs !=
                                                      null &&
                                                      ` ≤${room.maxWeightLbs} lbs`}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="mt-0.5 text-xs">
                                                {available <= 2
                                                  ? "Limited availability"
                                                  : `${available} available`}
                                              </p>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="mt-auto h-7 w-full text-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDetailsOpen({
                                                    type: "room",
                                                    id: room.id,
                                                  });
                                                }}
                                              >
                                                <Info className="mr-1 size-3.5" />
                                                View details
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {eligibleBoardingRooms.map((room) => {
                              const available =
                                room.totalRooms - room.bookedRooms;
                              const isSelected =
                                selectedPets.length > 0 &&
                                roomAssignments.length ===
                                  selectedPets.length &&
                                roomAssignments.every(
                                  (a) => a.roomId === room.id,
                                );
                              return (
                                <div
                                  key={room.id}
                                  className={`flex min-h-[260px] cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-all ${
                                    isSelected
                                      ? `border-primary bg-primary/5 ring-primary ring-2`
                                      : `border-border hover:border-primary/50`
                                  } ${
                                    available === 0
                                      ? `cursor-not-allowed opacity-60`
                                      : ""
                                  } `}
                                  onClick={() => {
                                    if (available > 0) {
                                      setRoomAssignments(
                                        selectedPets.map((p) => ({
                                          petId: p.id,
                                          roomId: room.id,
                                        })),
                                      );
                                    }
                                  }}
                                >
                                  <div className="bg-muted relative h-32 shrink-0">
                                    {room.image ? (
                                      <Image
                                        src={room.image}
                                        alt={room.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="bg-muted flex size-full items-center justify-center">
                                        <Bed className="text-muted-foreground size-10" />
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1">
                                        <CheckCircle className="size-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-1 flex-col p-3">
                                    <h3 className="text-base font-semibold">
                                      {room.name}
                                    </h3>
                                    <p className="text-primary mt-0.5 text-sm font-bold">
                                      ${room.price}/night
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                      {room.description}
                                    </p>
                                    <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                                      {room.included
                                        .slice(0, 4)
                                        .map((item, i) => (
                                          <li
                                            key={i}
                                            className="flex items-center gap-1"
                                          >
                                            <CheckCircle className="text-primary size-3 shrink-0" />
                                            {item}
                                          </li>
                                        ))}
                                    </ul>
                                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                                      {room.allowedPetTypes.includes("Dog") && (
                                        <Dog className="size-3.5" />
                                      )}
                                      {room.allowedPetTypes.includes("Cat") && (
                                        <Cat className="size-3.5" />
                                      )}
                                      {(room.minWeightLbs != null ||
                                        room.maxWeightLbs != null) && (
                                        <span>
                                          {room.minWeightLbs != null &&
                                            `≥${room.minWeightLbs} lbs`}
                                          {room.maxWeightLbs != null &&
                                            ` ≤${room.maxWeightLbs} lbs`}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      {available <= 2
                                        ? "Limited availability"
                                        : `${available} available`}
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-auto h-8 w-full text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsOpen({
                                          type: "room",
                                          id: room.id,
                                        });
                                      }}
                                    >
                                      <Info className="mr-1 size-3.5" />
                                      View details
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Sub-step 2 (Boarding): Add-ons */}
                  {currentDetailsSubStep === 2 &&
                    selectedService === "boarding" && (
                      <div className="space-y-4 px-1 py-2">
                        <div>
                          <Label className="text-base font-semibold">
                            Add-ons
                          </Label>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Add optional services to enhance your pet&apos;s
                            boarding experience
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {eligibleAddons.map((addon) => {
                            const applyTo = addOnApplyTo[addon.id] ?? "all";
                            const isAll = applyTo === "all";
                            const targetPetIds = isAll
                              ? selectedPets.map((p) => p.id)
                              : [applyTo as number];
                            const currentQty =
                              targetPetIds.length > 0
                                ? (extraServices.find(
                                    (es) =>
                                      es.serviceId === addon.id &&
                                      es.petId === targetPetIds[0],
                                  )?.quantity ?? 0)
                                : 0;
                            const totalQty = extraServices
                              .filter((es) => es.serviceId === addon.id)
                              .reduce((s, es) => s + es.quantity, 0);
                            return (
                              <Card
                                key={addon.id}
                                className={`flex min-h-[240px] flex-col overflow-hidden ${totalQty > 0 ? `ring-primary ring-2` : ""} `}
                              >
                                <div className="bg-muted relative h-28 w-full shrink-0">
                                  <Image
                                    src={addon.image}
                                    alt={addon.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <CardContent className="flex flex-1 flex-col space-y-2 p-3">
                                  <div>
                                    <h4 className="text-sm font-semibold">
                                      {addon.name}
                                    </h4>
                                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                      {addon.description}
                                    </p>
                                  </div>
                                  {addon.included &&
                                    addon.included.length > 0 && (
                                      <ul className="text-muted-foreground space-y-0.5 text-xs">
                                        {addon.included
                                          .slice(0, 2)
                                          .map((item, i) => (
                                            <li
                                              key={i}
                                              className="flex items-center gap-1"
                                            >
                                              <CheckCircle className="text-primary size-3 shrink-0" />
                                              {item}
                                            </li>
                                          ))}
                                      </ul>
                                    )}
                                  <p className="text-primary text-sm font-semibold">
                                    {addon.hasUnits
                                      ? `$${addon.pricePerUnit} / ${addon.unit}`
                                      : `$${addon.basePrice}`}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground text-xs">
                                      Apply to:
                                    </span>
                                    <Select
                                      value={isAll ? "all" : String(applyTo)}
                                      onValueChange={(v) => {
                                        setAddOnApplyTo((prev) => ({
                                          ...prev,
                                          [addon.id]:
                                            v === "all" ? "all" : Number(v),
                                        }));
                                        if (v === "all") {
                                          setExtraServices((prev) => [
                                            ...prev.filter(
                                              (es) => es.serviceId !== addon.id,
                                            ),
                                            ...selectedPets.map((p) => ({
                                              serviceId: addon.id,
                                              quantity: currentQty || 1,
                                              petId: p.id,
                                            })),
                                          ]);
                                        } else {
                                          const petId = Number(v);
                                          setExtraServices((prev) => [
                                            ...prev.filter(
                                              (es) => es.serviceId !== addon.id,
                                            ),
                                            {
                                              serviceId: addon.id,
                                              quantity: currentQty || 1,
                                              petId,
                                            },
                                          ]);
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">
                                          All pets
                                        </SelectItem>
                                        {selectedPets.map((p) => (
                                          <SelectItem
                                            key={p.id}
                                            value={String(p.id)}
                                          >
                                            {p.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="mt-auto flex items-center gap-2 pt-0.5">
                                    {addon.hasUnits ? (
                                      <>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="size-7 p-0 text-xs"
                                          disabled={currentQty === 0}
                                          onClick={() => {
                                            if (currentQty <= 0) return;
                                            const newQty = currentQty - 1;
                                            setExtraServices((prev) => {
                                              const next = prev.filter(
                                                (es) =>
                                                  !(
                                                    es.serviceId === addon.id &&
                                                    targetPetIds.includes(
                                                      es.petId,
                                                    )
                                                  ),
                                              );
                                              targetPetIds.forEach((petId) => {
                                                if (newQty > 0)
                                                  next.push({
                                                    serviceId: addon.id,
                                                    quantity: newQty,
                                                    petId,
                                                  });
                                              });
                                              return next;
                                            });
                                          }}
                                        >
                                          −
                                        </Button>
                                        <span className="min-w-[2ch] text-center text-xs font-medium">
                                          {currentQty}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="size-7 p-0 text-xs"
                                          onClick={() => {
                                            const newQty = currentQty + 1;
                                            setExtraServices((prev) => {
                                              const next = prev.filter(
                                                (es) =>
                                                  !(
                                                    es.serviceId === addon.id &&
                                                    targetPetIds.includes(
                                                      es.petId,
                                                    )
                                                  ),
                                              );
                                              targetPetIds.forEach((petId) => {
                                                next.push({
                                                  serviceId: addon.id,
                                                  quantity: newQty,
                                                  petId,
                                                });
                                              });
                                              return next;
                                            });
                                          }}
                                        >
                                          +
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant={
                                          currentQty > 0 ? "default" : "outline"
                                        }
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => {
                                          if (currentQty > 0)
                                            setExtraServices((prev) =>
                                              prev.filter(
                                                (es) =>
                                                  !(
                                                    es.serviceId === addon.id &&
                                                    targetPetIds.includes(
                                                      es.petId,
                                                    )
                                                  ),
                                              ),
                                            );
                                          else
                                            setExtraServices((prev) => {
                                              const next = prev.filter(
                                                (es) =>
                                                  es.serviceId !== addon.id,
                                              );
                                              targetPetIds.forEach((petId) =>
                                                next.push({
                                                  serviceId: addon.id,
                                                  quantity: 1,
                                                  petId,
                                                }),
                                              );
                                              return next;
                                            });
                                        }}
                                      >
                                        {currentQty > 0 ? (
                                          <>
                                            <CheckCircle className="mr-1 size-3" />{" "}
                                            Added
                                          </>
                                        ) : (
                                          "Add"
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Feeding sub-step (Daycare: 2, Boarding: 3) */}
                  {((currentDetailsSubStep === 2 &&
                    selectedService === "daycare") ||
                    (currentDetailsSubStep === 3 &&
                      selectedService === "boarding")) && (
                    <CareInstructionsStep
                      feedingEntries={feedingEntries}
                      onFeedingChange={setFeedingEntries}
                      medicationEntries={[]}
                      onMedicationChange={() => {}}
                      petNames={selectedPets.map((p) => p.name)}
                      mode="feeding"
                    />
                  )}

                  {/* Medication sub-step (Daycare: 3, Boarding: 4) */}
                  {((currentDetailsSubStep === 3 &&
                    selectedService === "daycare") ||
                    (currentDetailsSubStep === 4 &&
                      selectedService === "boarding")) && (
                    <CareInstructionsStep
                      feedingEntries={[]}
                      onFeedingChange={() => {}}
                      medicationEntries={medicationEntries}
                      onMedicationChange={setMedicationEntries}
                      petNames={selectedPets.map((p) => p.name)}
                      mode="medication"
                    />
                  )}

                  {/* Sub-step 1 (Grooming): Package */}
                  {currentDetailsSubStep === 1 &&
                    selectedService === "grooming" && (
                      <div className="space-y-4 px-1 py-2">
                        <Label className="text-base">
                          Choose a grooming package
                        </Label>
                        <p className="text-muted-foreground text-sm">
                          Select one package. Add-ons (e.g. nail trim, teeth
                          brushing) are on the next step.
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {GROOMING_PACKAGES.map((pkg) => {
                            const isSelected =
                              selectedGroomingPackage === pkg.id;
                            return (
                              <div
                                key={pkg.id}
                                className={`flex min-h-[260px] cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? `border-primary bg-primary/5 ring-primary ring-2`
                                    : `border-border hover:border-primary/50`
                                } `}
                                onClick={() =>
                                  setSelectedGroomingPackage(pkg.id)
                                }
                              >
                                <div className="bg-muted relative h-32 shrink-0">
                                  {pkg.image ? (
                                    <Image
                                      src={pkg.image}
                                      alt={pkg.name}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="bg-muted flex size-full items-center justify-center">
                                      <Scissors className="text-muted-foreground size-8" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full p-1">
                                      <CheckCircle className="size-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-1 flex-col p-3">
                                  <h3 className="text-base font-semibold">
                                    {pkg.name}
                                  </h3>
                                  <p className="text-primary mt-0.5 text-sm font-bold">
                                    From ${pkg.price}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    ~{pkg.durationMinutes} min
                                  </p>
                                  {pkg.notes && (
                                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                      {pkg.notes}
                                    </p>
                                  )}
                                  <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                                    {pkg.included.slice(0, 4).map((item, i) => (
                                      <li
                                        key={i}
                                        className="flex items-center gap-1"
                                      >
                                        <CheckCircle className="text-primary size-3 shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-auto h-8 w-full text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsOpen({
                                        type: "package",
                                        id: pkg.id,
                                      });
                                    }}
                                  >
                                    <Info className="mr-1 size-3.5" />
                                    View details
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Sub-step 2 (Grooming): Add-ons */}
                  {currentDetailsSubStep === 2 &&
                    selectedService === "grooming" && (
                      <div className="space-y-4 px-1 py-2">
                        <Label className="text-base">Add-ons (optional)</Label>
                        <p className="text-muted-foreground text-sm">
                          Nail trim, teeth brushing, and more. Select any
                          add-ons to include with your package.
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {GROOMING_ADDONS.map((addon) => {
                            const isSelected = selectedGroomingAddons.includes(
                              addon.id,
                            );
                            const addonWithExtras = addon as {
                              name: string;
                              price: number;
                              description?: string;
                              image?: string;
                            };
                            return (
                              <div
                                key={addon.id}
                                className={`flex min-h-[200px] cursor-pointer flex-col overflow-hidden rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? `border-primary bg-primary/5 ring-primary ring-2`
                                    : `border-border hover:border-primary/50`
                                } `}
                                onClick={() => {
                                  setSelectedGroomingAddons((prev) =>
                                    prev.includes(addon.id)
                                      ? prev.filter((id) => id !== addon.id)
                                      : [...prev, addon.id],
                                  );
                                }}
                              >
                                <div className="bg-muted relative h-24 shrink-0">
                                  {addonWithExtras.image ? (
                                    <Image
                                      src={addonWithExtras.image}
                                      alt={addon.name}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center">
                                      <Scissors className="text-muted-foreground size-6" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 rounded-full p-0.5">
                                      <CheckCircle className="size-3.5" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-1 flex-col p-2.5">
                                  <h4 className="text-sm font-semibold">
                                    {addon.name}
                                  </h4>
                                  {addonWithExtras.description && (
                                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                      {addonWithExtras.description}
                                    </p>
                                  )}
                                  <p className="text-primary mt-auto pt-1 text-sm font-semibold">
                                    +${addon.price}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <div className="space-y-2">
                    <Label>Special Requests or Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any special instructions or requests..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Complete Required Forms */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-1 text-base font-semibold">
                      Complete Required Forms
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {requiredFormsStatus.allComplete
                        ? "All requirements are complete. You can proceed to confirm your booking."
                        : "The following items are required before you can confirm your booking."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Progress:</span>
                    <span
                      className={
                        requiredFormsStatus.allComplete
                          ? "font-semibold text-green-600"
                          : "text-muted-foreground"
                      }
                    >
                      {requiredFormsStatus.completedCount}/
                      {requiredFormsStatus.totalCount} completed
                    </span>
                  </div>
                  {requiredFormsStatus.missing.length > 0 && (
                    <Card>
                      <CardContent className="space-y-3 p-4">
                        <p className="text-muted-foreground text-sm font-medium">
                          Missing requirements
                        </p>
                        <ul className="space-y-2">
                          {requiredFormsStatus.missing.map((item, idx) => (
                            <li
                              key={idx}
                              className="border-border flex items-center justify-between gap-4 border-b py-2 last:border-0"
                            >
                              <div>
                                {item.petName && (
                                  <span className="font-medium">
                                    {item.petName}:{" "}
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  {item.type === "vaccination"
                                    ? "Vaccination records — "
                                    : item.type === "agreement"
                                      ? "Agreement — "
                                      : item.type === "form"
                                        ? "Form — "
                                        : ""}
                                  {item.label}
                                </span>
                              </div>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary shrink-0 text-sm font-medium hover:underline"
                              >
                                Fill now →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {requiredFormsStatus.allComplete && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="size-5" />
                      <span className="font-medium">
                        All set! Proceed to confirm your booking.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Tip Your Care Team — full-screen, conversion-focused */}
              {currentStep === 4 && (
                <div className="space-y-6 py-4">
                  {tipsEnabled ? (
                    <>
                      <div className="space-y-2 text-center">
                        <h3 className="text-2xl font-semibold">
                          Tip Your Care Team
                        </h3>
                        <p className="text-muted-foreground mx-auto max-w-md">
                          Your tip goes directly to the team who will care for
                          your pet. Any amount is appreciated and helps support
                          our staff.
                        </p>
                      </div>
                      <Card className="mx-auto max-w-lg">
                        <CardContent className="space-y-6 p-6">
                          <div>
                            <p className="text-muted-foreground mb-3 text-sm font-medium">
                              Select an amount
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                              {tipSuggestions.map((s, idx) => {
                                const isPercent = s.type === "percent";
                                const isSelected = isPercent
                                  ? tipPercentage === s.value
                                  : tipAmount === s.value &&
                                    tipPercentage === null;
                                const isRecommended =
                                  recommendedTipIndex === idx;
                                return (
                                  <Button
                                    key={s.label}
                                    variant={isSelected ? "default" : "outline"}
                                    size="lg"
                                    className={`relative h-14 text-base font-semibold ${
                                      isRecommended && !isSelected
                                        ? `ring-primary ring-2 ring-offset-2`
                                        : ""
                                    } `}
                                    onClick={() =>
                                      isPercent
                                        ? handleTipPercentage(s.value)
                                        : handleTipFixed(s.value)
                                    }
                                  >
                                    {s.label}
                                    {isRecommended && (
                                      <span className="bg-primary text-primary-foreground absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-sm px-1.5 py-0.5 text-[10px] font-normal">
                                        Recommended
                                      </span>
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">
                              Or enter a custom amount
                            </Label>
                            <div className="flex gap-2">
                              <span className="bg-muted/50 text-muted-foreground flex items-center rounded-md border px-3 text-sm">
                                $
                              </span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={customTipAmount}
                                onChange={(e) =>
                                  handleCustomTip(e.target.value)
                                }
                                className="text-base"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          {tipAmount > 0 && (
                            <p className="text-center text-sm font-medium text-green-600">
                              Thank you! Your ${tipAmount.toFixed(2)} tip will
                              go directly to the team.
                            </p>
                          )}
                          <div className="border-t pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTipAmount(0);
                                setTipPercentage(null);
                                setCustomTipAmount("");
                              }}
                              className="text-muted-foreground hover:text-foreground text-sm underline"
                            >
                              No tip
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="text-muted-foreground py-8 text-center">
                      <p className="font-medium">
                        Tipping is not enabled for this facility.
                      </p>
                      <p className="mt-1 text-sm">
                        Continue to confirm your booking.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Confirm — facility receipt-style */}
              {currentStep === 5 && (
                <div className="mx-auto max-w-2xl space-y-4">
                  {/* Receipt card — same style as facility ConfirmStep */}
                  <div className="bg-card overflow-hidden rounded-xl border shadow-lg">
                    {/* Header */}
                    <div
                      className="relative overflow-hidden px-6 py-6"
                      style={{
                        backgroundColor:
                          isCustomModule && customCategoryMeta?.color
                            ? customCategoryMeta.color
                            : "#f59e0b",
                      }}
                    >
                      <div className="relative flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          {(() => {
                            const ServiceIcon =
                              allServices.find((s) => s.id === selectedService)
                                ?.icon ?? Receipt;
                            return (
                              <ServiceIcon className="size-7 text-white" />
                            );
                          })()}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-white">
                            Booking Receipt
                          </h2>
                          <p className="text-sm text-white/90">
                            {allServices.find((s) => s.id === selectedService)
                              ?.name ?? "Pet Care Services"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Client & Pets */}
                    <div className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="bg-muted/30 rounded-lg border p-4">
                          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                            Client
                          </p>
                          <p className="text-foreground font-semibold">
                            {customer?.name ?? "—"}
                          </p>
                          {customer?.email && (
                            <p className="text-muted-foreground mt-0.5 text-sm">
                              {customer.email}
                            </p>
                          )}
                        </div>
                        <div className="bg-muted/30 rounded-lg border p-4">
                          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                            Pet{selectedPets.length !== 1 ? "s" : ""}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPets.map((pet) => (
                              <Badge
                                key={pet.id}
                                variant="secondary"
                                className="gap-1.5 px-2.5 py-1 font-medium"
                              >
                                <PawPrint className="size-3" />
                                {pet.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Service summary */}
                    <div className="space-y-3 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {
                              allServices.find((s) => s.id === selectedService)
                                ?.name
                            }
                          </p>
                          {selectedService === "grooming" &&
                            selectedGroomingPackage && (
                              <p className="text-muted-foreground text-sm">
                                {
                                  GROOMING_PACKAGES.find(
                                    (p) => p.id === selectedGroomingPackage,
                                  )?.name
                                }
                              </p>
                            )}
                        </div>
                        <p className="font-semibold">
                          ${calculatedPrice.toFixed(2)}
                        </p>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-muted-foreground">Date & Time</p>
                          {selectedService === "daycare" &&
                          daycareDateTimes.length > 0 ? (
                            <p>
                              {daycareDateTimes.length} day
                              {daycareDateTimes.length !== 1 ? "s" : ""}
                            </p>
                          ) : effectiveStartDate ? (
                            <p>
                              {new Date(
                                effectiveStartDate + "T00:00:00",
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                              {effectiveEndDate &&
                                effectiveEndDate !== effectiveStartDate && (
                                  <>
                                    {" "}
                                    →{" "}
                                    {new Date(
                                      effectiveEndDate + "T00:00:00",
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </>
                                )}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p>
                            {effectiveCheckInTime}
                            {effectiveCheckOutTime
                              ? ` - ${effectiveCheckOutTime}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {/* Room type (boarding) */}
                      {selectedService === "boarding" &&
                        roomAssignments.length > 0 && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">
                              Room type
                            </p>
                            {roomAssignments.map((a) => {
                              const room = CUSTOMER_BOARDING_ROOM_TYPES.find(
                                (r) => r.id === a.roomId,
                              );
                              const pet = selectedPets.find(
                                (p) => p.id === a.petId,
                              );
                              return (
                                <p key={`${a.petId}-${a.roomId}`}>
                                  {pet?.name}: {room?.name ?? a.roomId}
                                </p>
                              );
                            })}
                          </div>
                        )}

                      {/* Grooming package/add-ons */}
                      {selectedService === "grooming" &&
                        (selectedGroomingPackage ||
                          selectedGroomingAddons.length > 0) && (
                          <div className="text-sm">
                            {selectedGroomingPackage && (
                              <p>
                                <span className="text-muted-foreground">
                                  Package:
                                </span>{" "}
                                {
                                  GROOMING_PACKAGES.find(
                                    (p) => p.id === selectedGroomingPackage,
                                  )?.name
                                }
                              </p>
                            )}
                            {selectedGroomingAddons.length > 0 && (
                              <p>
                                <span className="text-muted-foreground">
                                  Add-ons:
                                </span>{" "}
                                {selectedGroomingAddons
                                  .map(
                                    (id) =>
                                      GROOMING_ADDONS.find((a) => a.id === id)
                                        ?.name ?? id,
                                  )
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                      {/* Custom module details */}
                      {isCustomModule && selectedCustomModule && (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{
                                borderColor: customCategoryMeta?.color,
                                color: customCategoryMeta?.color,
                              }}
                            >
                              {customCategoryMeta?.name ??
                                selectedCustomModule.category}
                            </Badge>
                          </div>
                          {customDurationMinutes > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Duration
                              </span>
                              <span>{customDurationMinutes} minutes</span>
                            </div>
                          )}
                          {customSelectedResourceId && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Location
                              </span>
                              <span>
                                {facilityResources.find(
                                  (r) => r.id === customSelectedResourceId,
                                )?.name ?? customSelectedResourceId}
                              </span>
                            </div>
                          )}
                          {(selectedCustomModule.category === "event_based" ||
                            selectedCustomModule.category === "transport") &&
                            customPartySize > 1 && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  {selectedCustomModule.category === "transport"
                                    ? "Dogs on route"
                                    : "Party size"}
                                </span>
                                <span>{customPartySize} dogs</span>
                              </div>
                            )}
                          {selectedCustomModule.checkInOut.enabled && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Check-in
                              </span>
                              <span className="capitalize">
                                {selectedCustomModule.checkInOut.checkInType}
                                {selectedCustomModule.checkInOut.qrCodeSupport
                                  ? " · QR available"
                                  : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Add-ons (daycare/boarding) */}
                      {extraServices.length > 0 &&
                        (selectedService === "daycare" ||
                          selectedService === "boarding") && (
                          <div className="text-sm">
                            <p className="text-muted-foreground mb-1">
                              Add-ons
                            </p>
                            <div className="space-y-0.5">
                              {extraServices.map((es, idx) => {
                                const addon = eligibleAddons.find(
                                  (a) => a.id === es.serviceId,
                                );
                                const pet = selectedPets.find(
                                  (p) => p.id === es.petId,
                                );
                                return (
                                  <p key={`${es.serviceId}-${es.petId}-${idx}`}>
                                    {addon?.name ?? es.serviceId} ×{" "}
                                    {es.quantity}
                                    {pet ? ` (${pet.name})` : ""}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* Feeding & Medication summary */}
                      {(selectedService === "daycare" ||
                        selectedService === "boarding") && (
                        <div className="text-sm">
                          <p className="text-muted-foreground font-medium">
                            Care Instructions
                          </p>
                          {feedingEntries.length === 0 &&
                          medicationEntries.length === 0 ? (
                            <p className="text-muted-foreground italic">
                              None added
                            </p>
                          ) : (
                            <div className="mt-1 space-y-1">
                              {feedingEntries.length > 0 && (
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium">
                                    Feeding:
                                  </p>
                                  {feedingEntries.map((f, fi) => (
                                    <p key={fi} className="text-xs">
                                      {f.label} at {f.time}
                                      {f.amount ? ` · ${f.amount}` : ""}
                                      {f.unit ? ` ${f.unit}` : ""}
                                      {f.feedingInstruction
                                        ? ` · ${f.feedingInstruction}`
                                        : ""}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {medicationEntries.length > 0 && (
                                <div className="space-y-0.5">
                                  <p className="text-xs font-medium">
                                    Medications:
                                  </p>
                                  {medicationEntries.map((m, mi) => (
                                    <p key={mi} className="text-xs">
                                      {m.name || "Unnamed"}{" "}
                                      {m.dosage ? `(${m.dosage})` : ""} —{" "}
                                      {m.frequency}
                                      {m.isCritical ? " ⚠" : ""}
                                      {m.supplyCount
                                        ? ` · ${m.supplyCount} doses`
                                        : ""}
                                      {m.drugAllergies?.length
                                        ? ` · Allergies: ${m.drugAllergies.join(", ")}`
                                        : ""}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pricing breakdown */}
                    {(() => {
                      const taxRate =
                        facilityConfig.pricing?.taxSettings?.taxRate ?? 0;
                      const taxIncluded =
                        facilityConfig.pricing?.taxSettings?.taxIncluded ??
                        false;
                      const taxAmount =
                        taxRate > 0 && !taxIncluded
                          ? calculatedPrice * taxRate
                          : 0;
                      const receiptTotal =
                        calculatedPrice + taxAmount + tipAmount;
                      return (
                        <div className="border-t border-dashed p-4">
                          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                            Pricing breakdown
                          </p>
                          <div className="space-y-2 text-sm">
                            {extraServices.length > 0 && (
                              <div className="space-y-1">
                                {extraServices.map((es, i) => {
                                  const addon = eligibleAddons.find(
                                    (a) => a.id === es.serviceId,
                                  );
                                  const unitPrice =
                                    addon?.hasUnits && addon?.pricePerUnit
                                      ? addon.pricePerUnit
                                      : (addon?.basePrice ?? 0);
                                  const lineTotal = unitPrice * es.quantity;
                                  const pet = selectedPets.find(
                                    (p) => p.id === es.petId,
                                  );
                                  return (
                                    <div
                                      key={i}
                                      className="text-muted-foreground flex justify-between text-xs"
                                    >
                                      <span>
                                        {addon?.name ?? es.serviceId} ×{" "}
                                        {es.quantity}
                                        {pet ? ` (${pet.name})` : ""}
                                      </span>
                                      <span>${lineTotal.toFixed(2)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Subtotal
                              </span>
                              <span>${calculatedPrice.toFixed(2)}</span>
                            </div>
                            {taxAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Taxes
                                </span>
                                <span>${taxAmount.toFixed(2)}</span>
                              </div>
                            )}
                            {requiresDeposit && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Deposit
                                </span>
                                <span>${calculatedDeposit.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tip</span>
                              <span>
                                {tipAmount > 0
                                  ? `$${tipAmount.toFixed(2)}`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t-2 border-dashed pt-3 text-lg font-bold">
                            <span>Total</span>
                            <span className="text-primary">
                              ${receiptTotal.toFixed(2)}
                            </span>
                          </div>
                          {requiresDeposit && (
                            <p className="text-muted-foreground mt-2 text-xs">
                              ${calculatedDeposit.toFixed(2)} due now · $
                              {(receiptTotal - calculatedDeposit).toFixed(2)} at
                              service
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Footer */}
                    <div className="bg-muted/50 border-t p-3 text-center">
                      <p className="text-muted-foreground text-xs">
                        Thank you for choosing our pet care services!
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Receipt generated on{" "}
                        {new Date().toLocaleDateString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Details modal: room or grooming package — photos + notes */}
        <Dialog
          open={!!detailsOpen}
          onOpenChange={(open) => !open && setDetailsOpen(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {detailsOpen?.type === "room" &&
                  CUSTOMER_BOARDING_ROOM_TYPES.find(
                    (r) => r.id === detailsOpen.id,
                  )?.name}
                {detailsOpen?.type === "package" &&
                  GROOMING_PACKAGES.find((p) => p.id === detailsOpen.id)?.name}
              </DialogTitle>
            </DialogHeader>
            {detailsOpen?.type === "room" &&
              (() => {
                const room = CUSTOMER_BOARDING_ROOM_TYPES.find(
                  (r) => r.id === detailsOpen.id,
                );
                if (!room) return null;
                const photos = (
                  room.images && room.images.length > 0
                    ? room.images
                    : [room.image]
                ).slice(0, 5);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((src, i) => (
                        <div
                          key={i}
                          className="bg-muted relative aspect-video overflow-hidden rounded-lg"
                        >
                          <Image
                            src={src}
                            alt={`${room.name} ${i + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                    {room.notes && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-muted-foreground mb-1 text-sm font-medium">
                          Notes
                        </p>
                        <p className="text-sm">{room.notes}</p>
                      </div>
                    )}
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      {room.included.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="text-primary size-4 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            {detailsOpen?.type === "package" &&
              (() => {
                const pkg = GROOMING_PACKAGES.find(
                  (p) => p.id === detailsOpen.id,
                );
                if (!pkg) return null;
                const photos = (
                  pkg.images && pkg.images.length > 0 ? pkg.images : [pkg.image]
                ).slice(0, 5);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((src, i) => (
                        <div
                          key={i}
                          className="bg-muted relative aspect-video overflow-hidden rounded-lg"
                        >
                          <Image
                            src={src}
                            alt={`${pkg.name} ${i + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                    {pkg.notes && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-muted-foreground mb-1 text-sm font-medium">
                          Notes
                        </p>
                        <p className="text-sm">{pkg.notes}</p>
                      </div>
                    )}
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      {pkg.included.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="text-primary size-4 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </WizardWrapper>
  );
}
