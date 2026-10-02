"use client";

import {
  saveUnfinishedBookingOnLeave,
  useSaveUnfinishedBooking,
} from "@/lib/api/unfinished-bookings";
import type { ResumeStepId } from "@/lib/resume-booking";
import { formatDateLocal } from "@/lib/shift-recurrence";

import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import {
  formatCalendarDayLong,
  formatDateShort,
  formatList,
  formatMoney,
  formatPercent,
  formatTimeOfDay,
  isPluralOne,
} from "@/lib/i18n/format";
import { useCustomerFacility as useCustomerFacilityProfile } from "@/lib/api/customer-facility";
import { wizardProgress } from "@/lib/bookings/wizard/progress";
import { WizardDialog } from "@/components/bookings/wizard/shell/WizardDialog";
import { WizardRail } from "@/components/bookings/wizard/shell/WizardRail";
import { WizardTopBar } from "@/components/bookings/wizard/shell/WizardTopBar";
import { WizardHeader } from "@/components/bookings/wizard/shell/WizardHeader";
import { WizardFooter } from "@/components/bookings/wizard/shell/WizardFooter";
import { DiscardPanel } from "@/components/bookings/wizard/shell/DiscardPanel";
import { SuccessScreen } from "@/components/bookings/wizard/shell/SuccessScreen";
import type {
  WizardStepView,
  WizardSubStepView,
} from "@/components/bookings/wizard/shell/types";
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  useDepositRules,
  useFacilitySettings,
  useFeedingInstructions,
  useMedicationInstructions,
  usePricingRules,
} from "@/lib/api/facility-settings";
import { usePricedAddOns } from "@/lib/add-ons/use-offered-add-ons";
import type { TaxConfig } from "@/lib/settings/tax";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Check, AlertTriangle } from "lucide-react";
import { DetailsStep } from "./steps";
import { BoardingSchedule } from "@/components/bookings/wizard/steps/details/schedule/BoardingSchedule";
import { DaycareSchedule } from "@/components/bookings/wizard/steps/details/schedule/DaycareSchedule";
import { RoomTypeStep } from "@/components/bookings/wizard/steps/details/rooms/RoomTypeStep";
import { AddOnsStep } from "@/components/bookings/wizard/steps/details/add-ons/AddOnsStep";
import { PackageStep } from "@/components/bookings/wizard/steps/details/grooming/PackageStep";
import {
  ProgramStep,
  type ProgramChoice,
} from "@/components/bookings/wizard/steps/details/training/ProgramStep";
import { ClassStep } from "@/components/bookings/wizard/steps/details/training/ClassStep";
import {
  GoalsStep,
  type TrainingIntake,
} from "@/components/bookings/wizard/steps/details/training/GoalsStep";
import { useOfferedTrainingClasses } from "@/lib/api/training-classes";
import { useGrantLessonPack } from "@/lib/api/training-lesson-packs";
import { automationQueries } from "@/lib/api/automations";
import type { MissingForm } from "@/lib/forms/requirements";
import {
  fetchTrainingGoalOptions,
  fetchTrainingPrograms,
} from "@/lib/api/training-book";
import {
  classesForProgram,
  classPrice,
  classSessionDates,
  classWhen,
  type OfferedClass,
} from "@/lib/training/offered-classes";
import {
  programFormat,
  programMinutes,
  programPrice,
} from "@/lib/training/program-offer";
import { useTrainingTrainers } from "@/lib/api/training-trainers";
import type { TrainingPackage } from "@/types/training";
import {
  StaffTimeStep,
  type StaffTime,
} from "@/components/bookings/wizard/steps/details/scheduler/StaffTimeStep";
import { groomPrice } from "@/lib/bookings/wizard/groom-pricing";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { isStationEligibleForPetSize } from "@/lib/grooming/stations";
import { backToBack } from "@/lib/bookings/wizard/staff-slots";
import { hhmmOf, minutesOf } from "@/lib/bookings/wizard/time-windows";
import type { GroomingSizeTier } from "@/lib/grooming/size-tier";
import type { CoatType as GroomingCoatType } from "@/types/grooming";
import { ConfirmStep } from "@/components/bookings/wizard/steps/confirm/ConfirmStep";
import { useConfirmModel } from "@/components/bookings/wizard/steps/confirm/use-confirm-model";
import {
  confirmButtonKey,
  type PreviewStatus,
} from "@/lib/bookings/wizard/confirm-view";
import { StatusChip } from "@/components/bookings/wizard/steps/confirm/ConfirmHero";
import { describeFeeding } from "@/lib/feeding/describe";
import { ClientPetStep } from "@/components/bookings/wizard/steps/client-pet/ClientPetStep";
import { ServiceStep } from "@/components/bookings/wizard/steps/service/ServiceStep";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { clientQueries, useCreateClient } from "@/lib/api/client";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { groomingQueries, resolveAutoAddOns } from "@/lib/api/grooming";
import { groomingSizeFor } from "@/lib/grooming/size-tier";
import {
  EVALUATION_OVERRIDE_MIN_REASON,
  type EvaluationIssue,
} from "@/lib/bookings/wizard/evaluation-issues";
import { StaffAssignments } from "@/components/bookings/wizard/steps/confirm/StaffAssignments";
import { bookableLookup } from "@/lib/add-ons/bookable";
import type { ServiceModule } from "@/types/facility-staff";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { useRedeemPackagePass } from "@/lib/api/customer-packages";
import { syncRedeemedPassToQuickBooks } from "@/lib/quickbooks/document-sync";
import { STEPS, detailSubSteps } from "./constants";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useSettings } from "@/hooks/use-settings";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import { useRooms } from "@/hooks/use-rooms";
import { useLocationContext } from "@/hooks/use-location-context";
import { boardingNightlyRate } from "@/lib/boarding-pricing";
import type { ChosenBoardingService } from "@/lib/bookings/wizard/boarding-choice";
import { rateGapMessage } from "@/lib/bookings/rate-gap";
import { assembleQuote } from "@/lib/bookings/quote/assemble";
import {
  boardingParts,
  daycareParts,
  groomingParts,
} from "@/lib/bookings/booking-parts";
import {
  autoAssignDaycareSection,
  roomsForAssignments,
} from "@/lib/capacity-engine";
import { planKennels, type KennelChange } from "@/lib/boarding/kennel-changes";
import { playAreaChoices } from "@/lib/bookings/wizard/play-area-choices";
import { defaultAddOnLines } from "@/lib/pricing/boarding-default-addons";
import { estimateAddOnLines } from "@/lib/estimates/add-on-lines";
import { estimateFeeLines } from "@/lib/estimates/fee-lines";
import { toast } from "sonner";
import { useEstimateMutations, type EstimateCreate } from "@/lib/api/estimates";
import {
  customerEstimateLink,
  sendToast,
  type SentEstimate,
} from "@/components/bookings/use-estimate-actions";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  useGroomingMenu,
  useGroomingSizeTiers,
} from "@/lib/api/grooming-catalogue";
import { useGroomingAddOnOffer } from "@/lib/add-ons/use-grooming-add-on-offer";
import { useBookingWaivers } from "./use-booking-waivers";
import {
  findApplicableDepositRule,
  computeDepositAmount,
} from "@/lib/settings/deposits";
import type { DepositMode } from "@/components/bookings/wizard/steps/confirm/ChecklistSections";
import {
  useCancelTrainingSeries,
  useCreateTrainingSeries,
  useEnrollInTrainingSeries,
} from "@/lib/api/training-series";

import type { Client } from "@/types/client";
import type { AppointmentStage } from "@/types/grooming";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type {
  NewBooking,
  Booking,
  DaycareDateTime,
  ExtraService,
  VetContact,
  BookingCare,
} from "@/types/booking";
import type { Pet, Evaluation } from "@/types/pet";
import { useCareFees } from "@/lib/api/facility-settings";
import { useUpdatePet } from "@/lib/api/client";

import { fill as fillWords } from "@/lib/medications/dose";
import { profileAfterBooking } from "@/lib/medications/draft";
import {
  careStayFor,
  FEEDING_SUB_STEP_ID,
  legacySubStepId,
  MEDICATION_SUB_STEP_ID,
  subStepIndexOf,
} from "@/lib/bookings/care-steps";
import { careStepUse } from "@/lib/settings/care-setup";
import { feedingProfileAfterBooking } from "@/lib/feeding/plan";
import { useMedicationStep } from "@/components/booking/medications/use-medication-step";
import { useLabelPhotos } from "@/components/booking/medications/use-label-photos";
import { MedicationSchedulePreview } from "@/components/booking/medications/medication-schedule-preview";
import { useFeedingStep } from "@/components/booking/feeding/use-feeding-step";
import { FeedingSchedulePreview } from "@/components/booking/feeding/feeding-schedule-preview";
import { bookingQueries } from "@/lib/api/booking";
import { isoDayOrUndefined } from "@/lib/bookings/booking-timing";
import { staffQueries } from "@/lib/api/staff";

// A care step switched off books nothing — the same empty list every render.
const NO_MEDICATIONS: MedicationItem[] = [];
const NO_FEEDING: FeedingScheduleItem[] = [];

// Stable while the query loads, so a memo keyed on it does not recompute.
const NO_BOOKINGS: Booking[] = [];
// Stable for a stay with no default add-ons, for the same reason.
const NO_EXTRA_SERVICES: ExtraService[] = [];

// Types

export interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  /**
   * The FIXTURE's facility key, used for one thing: scoping the browser-local
   * service add-ons store. Optional because a caller opening the modal from a
   * REAL booking has no number to give — a facility is a uuid (see
   * types/booking.ts) — and must not be made to invent one. Absent, the
   * add-ons store falls back to its unscoped key, which this component already
   * watches alongside the scoped one.
   */
  facilityId?: number;
  facilityName: string;
  /**
   * Saves the booking. The form WAITS for it: answer `false` (or throw) when
   * it was not saved — having said why — and the form stays as it was.
   * Anything else closes it. See `handleComplete`.
   */
  /**
   * Anything but `false` means the booking was saved. A caller that knows the
   * created booking's ref returns it, and then a pass redeemed for this
   * booking can be attributed to it — which is what makes giving one back
   * possible at all. A caller that does not is unchanged, and its redemption
   * is simply unlinked, exactly as every one of them was before.
   */
  onCreateBooking: (
    booking: NewBooking,
  ) =>
    | void
    | boolean
    | { ref: number }
    | Promise<void | boolean | { ref: number }>;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  /** Every pet to start with, as a resumed draft had; wins over preSelectedPetId. */
  preSelectedPetIds?: number[];
  preSelectedService?: string;
  /** Deep-link the training booking flow to a specific Course Type from the
   *  Course Catalog — the TrainingScheduleStep skips the course-type picker
   *  and scopes its series list to this course. The single source of truth. */
  preSelectedCourseTypeId?: string;
  /** Legacy deep-link by Program (Rates tab). Resolved to the program's
   *  course type downstream so the customer `?program=` link keeps working. */
  preSelectedProgramId?: string;
  /** When true, the Service step is hidden + skipped. Used for deep links
   *  from a service-specific catalog (e.g. the customer tapped Enroll on a
   *  training program card) so the customer doesn't have to confirm their
   *  service choice again. */
  lockService?: boolean;
  /** Pre-fill the wizard with details the customer submitted in their online booking request. */
  preSelectedStartDate?: string; // "YYYY-MM-DD"
  preSelectedEndDate?: string; // "YYYY-MM-DD"
  preSelectedCheckInTime?: string; // "HH:mm"
  preSelectedCheckOutTime?: string; // "HH:mm"
  preSelectedDaycareDates?: string[]; // "YYYY-MM-DD"[]
  preSelectedRoomId?: string;
  preSelectedDaycareSectionId?: string;
  preSelectedExtraServices?: ExtraService[];
  /**
   * A groom's add-ons to start with, by the ids the groom's own list uses —
   * an estimate reopened as a booking ("Edit" in the convert dialog). Kept
   * as chosen ones: a package's rules only ever swap what they attached.
   */
  preSelectedGroomingAddOnIds?: string[];
  preSelectedFeedingSchedule?: FeedingScheduleItem[];
  preSelectedMedications?: MedicationItem[];
  preSelectedSpecialRequests?: string;
  preSelectedNotificationEmail?: boolean;
  preSelectedNotificationSMS?: boolean;
  /** Resume: the step the customer left on, and the sub-step within it. */
  preSelectedStep?: ResumeStepId;
  /** A draft from before 2026-10-01: the sub-step's POSITION then. */
  preSelectedSubStep?: number;
  /** The sub-step's id (lib/bookings/care-steps.ts). */
  preSelectedSubStepId?: number;
  /** The pets answered "takes no medication" — an edit or a draft. */
  preSelectedNoMedication?: number[];
  /** Each pet's vet, by pet id — an edit or a draft. */
  preSelectedVetContacts?: Record<string, VetContact>;
  /**
   * The ref of the booking being edited — what its label photos belong to.
   */
  editingRef?: number;
  /** When true, the wizard is being used by a customer making a booking request (not facility staff). */
  isCustomerMode?: boolean;
  /** Custom message shown to the customer after they submit a booking request. Configured by the facility. */
  bookingRequestMessage?: string;
  /** When true, opens the wizard in estimate mode instead of booking mode. */
  estimateMode?: boolean;
  /** When true, opens the wizard in edit mode — hides service/client-pet steps and changes labels. */
  editMode?: boolean;
  /** Pass-redemption mode (customer): skips the payment step and redeems a
   *  prepaid pass on confirm instead of charging.
   *
   *  Kept identical to the copy in `use-booking-modal.tsx` — two declarations
   *  of one contract, which is why changing it needed both edited. */
  passRedemption?: {
    serviceLabel: string;
    category: string;
    onRedeem: (ctx: {
      petId?: number;
      petName?: string;
      /** The booking the pass is being spent on, when the caller knows it. */
      bookingRef?: number;
    }) => Promise<{
      ok: boolean;
      passesLeft: number;
      error?: string;
    }>;
  };
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

/**
 * A picked calendar day as `YYYY-MM-DD`, read in the browser's own clock.
 * `toISOString()` reads UTC, which names the day BEFORE for anyone east of
 * Greenwich — the calendar hands back local midnight.
 */
function stayDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (day <= end) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  return days;
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The size bands' loading default: one array, never a new one per render. */
const NO_SIZE_TIERS: GroomingSizeTier[] = [];
const NO_TRAINING_PROGRAMS: TrainingPackage[] = [];
const NO_GOALS: string[] = [];
const NO_TRAINERS: Array<{ id: string; staffId: string; name: string }> = [];
const NO_CLASSES: OfferedClass[] = [];
// A trainer may teach any program: no package to qualify for.
const NO_PACKAGE_IDS: string[] = [];
const NO_MISSING_FORMS: MissingForm[] = [];
/** Staff's reason to book without a required form: a few words at least. */
const FORMS_MIN_REASON = 5;

export function BookingModal({
  open,
  onOpenChange,
  clients: callerClients,
  facilityId,
  facilityName,
  onCreateBooking,
  preSelectedClientId,
  preSelectedPetId,
  preSelectedPetIds,
  preSelectedService,
  preSelectedProgramId,
  lockService = false,
  preSelectedStartDate,
  preSelectedEndDate,
  preSelectedCheckInTime,
  preSelectedCheckOutTime,
  preSelectedDaycareDates,
  preSelectedRoomId,
  preSelectedDaycareSectionId,
  preSelectedExtraServices,
  preSelectedGroomingAddOnIds,
  preSelectedFeedingSchedule,
  preSelectedMedications,
  preSelectedSpecialRequests,
  preSelectedNotificationEmail,
  preSelectedNotificationSMS,
  preSelectedStep,
  preSelectedSubStep,
  preSelectedSubStepId,
  preSelectedNoMedication,
  preSelectedVetContacts,
  editingRef,
  isCustomerMode = false,
  bookingRequestMessage,
  estimateMode = false,
  editMode = false,
  passRedemption,
}: NewBookingModalProps) {
  // This modal is reached from THREE shells — customer, facility and employee —
  // so its words live in `shell.booking` rather than in any one portal group.
  const t = useShellText("booking");
  // The send toast's words, shared with the estimate card and the wizard.
  const estimateText = useStaffText("estimateActions");
  // The kennel-change refusal, in the reader's language.
  const { fill: kennelFill, locale: kennelLocale } =
    useStaffText("kennelMoves");
  const { fees: careFees } = useCareFees();
  // The bookings the caller may see: the facility's for staff, a customer's
  // own for a customer. Availability and "new customer" were computed from a
  // fixture array of another facility's bookings.
  const { data: staffProfiles } = useQuery(staffQueries.profiles());
  const locale = useShellLocale();
  // A customer is told whose booking form this is — the facility's own name
  // (/api/customer/facility), not the fixture the customer pages once read.
  const customerFacility = useCustomerFacilityProfile({
    enabled: isCustomerMode,
  });
  const {
    daycare,
    boarding,
    grooming,
    training,
    bookingFlow,
    serviceNotifDefaults,
    evaluation: evaluationConfig,
    hoursConfigured,
  } = useSettings();
  // The facility's own surcharges and discounts, from `facility_settings`.
  // These used to come from localStorage, so what a customer was charged
  // depended on which browser took the booking.
  const { rules: pricingRules } = usePricingRules();
  // Same story, one screen along: the deposit came from localStorage until
  // 2026-09-05, so two staff could ask the same customer for two different
  // amounts on the same booking.
  const { rules: depositRules, isPending: depositRulesPending } =
    useDepositRules();
  const configs = useMemo(
    () => ({ daycare, boarding, grooming, training }),
    [daycare, boarding, grooming, training],
  );
  const { getModuleBySlug } = useCustomServices();
  const { sections: daycareSections } = useDaycareAreas();
  const { categories: roomCategories, rooms: facilityRooms } = useRooms();
  const { currentLocationId } = useLocationContext();
  const queryClient = useQueryClient();
  const enrollInSeries = useEnrollInTrainingSeries();
  const { mutate: redeemPass } = useRedeemPackagePass();
  const { data: customerPackagesData = [] } = useQuery(
    groomingQueries.customerPackages(),
  );
  // Pet-pricing overrides feed Step 1 of the rate engine (pet-custom
  // shortcut) so the Confirm-step subtotal matches what the resolver
  // produces on the service card AND what's stored on apt.basePrice
  // when the appointment finally hits PaymentDialog.
  const { data: groomingPetPricingOverrides = [] } = useQuery(
    groomingQueries.allPetServicePricing(),
  );
  // The facility's grooming menu, from Postgres. What this quotes must be what
  // create_booking records: since 20260806560000 the appointment's price comes
  // from `grooming_services`, so a fixture here would show the customer one
  // number and file another.
  //
  // AND IT MUST BE THE RIGHT FACILITY'S MENU. This is the read that decides
  // the number a customer agrees to, and for a customer the staff route
  // scopes by a membership they do not have — so it fell through to RLS and
  // returned every facility they are a client of, merged. Picking the other
  // business's "Full Groom" quoted the other business's price on this
  // business's booking (20260924160000).
  const { data: groomingMenu = [] } = useGroomingMenu({
    asCustomer: isCustomerMode,
  });
  // The facility's size bands — the ones `create_booking` prices a groom by.
  const { data: groomingSizeTiers = NO_SIZE_TIERS } = useGroomingSizeTiers({
    asCustomer: isCustomerMode,
  });
  // Travel-zone surcharge (Step 6). The ZIP-prefix TAX that came with it is
  // gone: see "NO TAX IN A BOOKING'S PRICE" in calculatePrice.
  // Distance to a travel zone is measured from the facility's own postal
  // code; it was a constant ("H2X 1Z4") for every facility.
  const {
    travelZones: groomingTravelZones,
    basePostalCode: facilityBasePostal,
  } = useMobileGrooming();

  // Estimate mode — initialized from prop, key-remount resets it correctly
  const [isEstimateMode, setIsEstimateMode] = useState(estimateMode);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [estimateSent, setEstimateSent] = useState(false);
  const [generatedEstimateId, setGeneratedEstimateId] = useState<string | null>(
    null,
  );
  const [estimatePricingSnapshot, setEstimatePricingSnapshot] =
    useState<EstimatePricingSnapshot | null>(null);
  // The estimate this mode wrote. It set a success state and numbered it from
  // the fixture, and "Send" flipped a flag — nothing was stored, so an
  // estimate made here existed until the modal closed.
  const [savedEstimate, setSavedEstimate] = useState<{
    id: string;
    token?: string;
  } | null>(null);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const { create: createEstimate, act: actOnEstimate } = useEstimateMutations();

  // Customer booking request confirmation state
  const [bookingRequested, setBookingRequested] = useState(false);

  // The facility's own tax settings. This read the fixture facilities list,
  // so an estimate carried fixture facility 11's taxes whoever it was for.
  const facilityTaxConfig = useFacilitySettings().settings.tax_config
    .value as TaxConfig;

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

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setEstimateCreated(false);
      setEstimateSent(false);
      setGeneratedEstimateId(null);
      setSavedEstimate(null);
      setEstimatePricingSnapshot(null);
    } else {
      setIsEstimateMode(false);
      setEstimateCreated(false);
      setEstimateSent(false);
      setGeneratedEstimateId(null);
      setSavedEstimate(null);
      setEstimatePricingSnapshot(null);
    }
  }

  // ── STEPS ──────────────────────────────────────────────────────────────
  //
  // Four, always, as the client's mock draws them (2026-10-01). A step the
  // caller already decided is LOCKED — shown done, never re-opened — rather
  // than taken out of the list: an edit's client and service, and a service
  // the caller fixed (a deep link into training, a report card's "Book
  // again"). Next and Previous step over a locked step.
  const displayedSteps = STEPS;
  const lockedStepIds = new Set<string>([
    ...(editMode ? ["client-pet", "service"] : []),
    ...(lockService && preSelectedService ? ["service"] : []),
  ]);
  const stepIndexOf = (id: string) =>
    Math.max(
      0,
      displayedSteps.findIndex((step) => step.id === id),
    );
  const nextOpenStep = (from: number) => {
    for (let i = from + 1; i < displayedSteps.length; i++) {
      if (!lockedStepIds.has(displayedSteps[i]!.id)) return i;
    }
    return -1;
  };
  const previousOpenStep = (from: number) => {
    for (let i = from - 1; i >= 0; i--) {
      if (!lockedStepIds.has(displayedSteps[i]!.id)) return i;
    }
    return -1;
  };
  // Where a fresh booking starts, from what the caller preselected.
  const freshStepIndex =
    preSelectedClientId && preSelectedPetId && preSelectedService
      ? stepIndexOf("details")
      : preSelectedClientId && preSelectedPetId
        ? stepIndexOf("service")
        : 0;
  const initialStepIndex = (() => {
    // An edit opens on Details: its client and service are not in question.
    if (editMode) return stepIndexOf("details");
    // RESUMING: open on the step the draft was left on — the preselection
    // below is a guess, wrong for a resume.
    if (preSelectedStep) {
      const saved = displayedSteps.findIndex((s) => s.id === preSelectedStep);
      if (saved >= 0) return saved;
    }
    return freshStepIndex;
  })();
  const [currentStep, setCurrentStep] = useState(initialStepIndex);
  // Seeded from the draft when resuming: `step` returns them to the right
  // SCREEN, this to the right question on it. The sub-step's ID, not its
  // place: the list can change under it — a care step the facility turns off,
  // the settings arriving — and an id stays on the same question, or the next
  // one when its own is gone (lib/bookings/care-steps.ts).
  const [currentSubStepId, setCurrentSubStepId] = useState(() =>
    preSelectedStep
      ? (preSelectedSubStepId ??
        legacySubStepId(
          preSelectedService,
          preSelectedSubStep,
          isCustomerMode,
        ) ??
        0)
      : 0,
  );

  // Reset the main content scroll position when moving between wizard steps
  // or sub-steps. Without this, scroll carries over from the previous step —
  // e.g. scrolling down the client list and clicking Next would leave the
  // service step scrolled past its first row of service cards.
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
  }, [currentStep, currentSubStepId]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const saveUnfinished = useSaveUnfinishedBooking();

  // ── THE CLIENTS STEP 1 SEARCHES ──────────────────────────────────────
  //
  // Staff search the facility's clients as they are NOW. The list a caller
  // passes was read when it opened the form — the header passes
  // `clientQueries.all()` as it stood, so a form opened before that read
  // landed searched nobody. The caller's list still counts (a client page
  // passes its own client), and a client made from inside the form with
  // "+ New client" is added at once, before any list has re-read.
  const { data: liveClients } = useQuery({
    ...clientQueries.all(),
    enabled: !isCustomerMode,
  });
  const [addedClients, setAddedClients] = useState<Client[]>([]);
  const clients = useMemo(() => {
    const byId = new Map<number, Client>();
    for (const list of [callerClients, liveClients ?? [], addedClients]) {
      for (const client of list) byId.set(client.id, client);
    }
    return [...byId.values()];
  }, [callerClients, liveClients, addedClients]);
  // The new-client form, shown in this form's place (§5i: never stacked).
  const [creatingClient, setCreatingClient] = useState(false);
  const createClient = useCreateClient();
  const mayCreateClients = usePermission("create_clients");

  // Client selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preSelectedClientId ?? null,
  );
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>(
    preSelectedPetIds?.length
      ? preSelectedPetIds
      : preSelectedPetId
        ? [preSelectedPetId]
        : [],
  );

  // ── NEITHER A CLIENT NOR A PET IS CREATED IN THIS WIZARD ─────────────────
  //
  // Both inline quick-create forms lived here and both are gone (2026-09-20,
  // client feedback). They asked for less than the record needs — no breed
  // list, a size band where a weight belongs, an age in months with no date
  // picker — and they duplicated two screens that ask properly: Clients →
  // New client, and Add a pet on the client's own profile.
  //
  // So step one SELECTS and only selects: search the client list, tick their
  // pets. A client with no pets on file is told where to add one. The drafts
  // and merge that existed to fold new rows into the prop list went with
  // them, since the list is now exactly what the caller passed.

  // Service selection state
  const [selectedService, setSelectedService] = useState<string>(
    preSelectedService ?? "",
  );
  const handleServiceChange = (service: string) => {
    setSelectedService(service);
    if (service === "evaluation") {
      setServiceType("evaluation");
    } else if (service === "daycare") {
      setServiceType("full_day");
    } else {
      setServiceType("");
    }
    setCurrentSubStepId(0);
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
  // ── WHICH DAYCARE SERVICE ────────────────────────────────────────────
  //
  // The facility's choice, carried as a row id. Until 2026-09-23 nobody
  // chose: `daycareRateForHours` charged the cheapest active rate covering
  // the stay, so the menu was decoration and a receipt could not name what
  // was sold. The price rides along so the quote does not re-read the
  // catalogue on every keystroke.
  // A half-day service's morning or afternoon (the client's mock,
  // 2026-10-01); the times it picks are what the booking keeps.
  const [daycarePart, setDaycarePart] = useState<"am" | "pm">("am");
  const [daycareService, setDaycareService] = useState<{
    rowId: string;
    name: string;
    price: number;
  } | null>(null);
  // WHICH BOARDING SERVICE, and it is the same story one service along:
  // until Phase 5 `room_categories` was the kennel class AND the nightly
  // rate, so the menu was the building and a facility could not offer two
  // priced services in one class. Null stays on the kennel-class path, which
  // is what every boarding booking made before this was sold at.
  const [boardingService, setBoardingService] =
    useState<ChosenBoardingService | null>(null);
  // Each pet's room on the Room type step (the client's mock, 2026-10-01):
  // the card chosen, the service it is, and whether the pets share.
  const [petRoomCards, setPetRoomCards] = useState<Record<number, string>>({});
  const [petBoardingServices, setPetBoardingServices] = useState<
    Record<number, ChosenBoardingService>
  >({});
  const [boardingShare, setBoardingShare] = useState(false);
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
  // Boarding: the kennel changes planned with a NEW booking — from a night on,
  // another lodging type. Each stretch becomes a free kennel of its type at
  // save (`planKennels`), and the booking and its moves are one transaction.
  const [kennelChanges, setKennelChanges] = useState<KennelChange[]>([]);
  // The kennel — or play area — that was clicked to open this form. It was
  // kept only when a pet came pre-selected too, and the occupancy grid opens
  // the form with a room and a date but no pet: so the kennel staff clicked
  // was forgotten by the time they chose the dog. Each dog chosen now starts
  // in it, and the room step can still move them.
  const preferredRoomId =
    preSelectedService === "daycare"
      ? (preSelectedDaycareSectionId ?? preSelectedRoomId)
      : preSelectedRoomId;
  useEffect(() => {
    if (!preferredRoomId || selectedService !== preSelectedService) return;
    setRoomAssignments((prev) => {
      const missing = selectedPetIds.filter(
        (petId) => !prev.some((a) => a.petId === petId),
      );
      if (missing.length === 0) return prev;
      return [
        ...prev,
        ...missing.map((petId) => ({ petId, roomId: preferredRoomId })),
      ];
    });
  }, [preferredRoomId, selectedPetIds, selectedService, preSelectedService]);
  const [feedingSchedule, setFeedingSchedule] = useState<FeedingScheduleItem[]>(
    preSelectedFeedingSchedule ?? [],
  );
  const [walkSchedule, setWalkSchedule] = useState("");
  const [medications, setMedications] = useState<MedicationItem[]>(
    preSelectedMedications ?? [],
  );
  const [noMedication, setNoMedication] = useState<number[]>(
    preSelectedNoMedication ?? [],
  );
  const [vetContacts, setVetContacts] = useState<Record<string, VetContact>>(
    preSelectedVetContacts ?? {},
  );
  const [extraServices, setExtraServices] = useState<ExtraService[]>(
    preSelectedExtraServices ?? [],
  );
  // Who each chosen add-on that needs somebody is assigned to, by line
  // (`serviceId::petId`), as the confirm step sets it. Kept BESIDE the lines
  // rather than on them: the lines a service attaches by itself are derived,
  // not state, and would have nowhere to keep it. `null` is "nobody", said
  // on purpose; a line not in here keeps what it arrived with.
  const [addOnStaff, setAddOnStaff] = useState<Record<string, string | null>>(
    {},
  );
  // What the owner asked for, in their words. There was no field for it, and
  // what a customer typed into an online request was dropped when staff
  // scheduled it, because nothing read `preSelectedSpecialRequests`.
  const [specialRequests, setSpecialRequests] = useState(
    preSelectedSpecialRequests ?? "",
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
  // Package redemption — when set, a session is debited from this client
  // package once the booking is saved.
  //
  // An "Express Check-In auto-send" switch sat beside it, ON by default, and
  // a toast said the form had gone out. Nothing sent it — there is no sender
  // for that form — so the switch is gone rather than kept as a promise.
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
  // Grooming-only: manual duration override. Cleared whenever the pet or
  // package changes.
  const [groomingManualDuration, setGroomingManualDuration] = useState<
    number | undefined
  >(undefined);
  // Grooming-only: ids of grooming-specific add-ons (GROOMING_ADD_ONS catalog)
  // selected for this booking. Separate from `extraServices` which holds
  // facility-wide service add-ons (different catalog, per-pet quantities).
  const [groomingSelectedAddOnIds, setGroomingSelectedAddOnIds] = useState<
    string[]
  >(preSelectedGroomingAddOnIds ?? []);
  // Grooming: each pet's package (the Package step, 2026-10-01). A pet not
  // in it takes `serviceType`, which stays the FIRST pet's package for every
  // path that still reads one.
  const [groomingPetPackages, setGroomingPetPackages] = useState<
    Record<number, string>
  >({});
  // A pet's package: its own pick; before anyone has picked, the package
  // the booking opened with (a rebook, a link) — never the first pet's
  // choice, which silently gave every other pet the same groom.
  const packageIdFor = useCallback(
    (petId: number) =>
      groomingPetPackages[petId] ||
      (Object.keys(groomingPetPackages).length === 0 ? serviceType : ""),
    [groomingPetPackages, serviceType],
  );
  // Grooming: the slot picked on Groomer & time, with the appointment's
  // length when it was picked — a different length is a different slot.
  const [groomingTime, setGroomingTime] = useState<
    StaffTime & { minutes: number; groomerName: string | null }
  >({
    date: null,
    start: null,
    groomerId: null,
    minutes: 0,
    groomerName: null,
  });
  // Training (the client's mock, 2026-10-01): the program and its pack,
  // the class (a group program) or the trainer's slot (a lesson or a
  // consult), and what the owner wants worked on.
  const [trainingChoice, setTrainingChoice] = useState<ProgramChoice>({
    programId: preSelectedProgramId ?? null,
    pack: 1,
  });
  const [trainingClassId, setTrainingClassId] = useState<string | null>(null);
  const [trainingTime, setTrainingTime] = useState<
    StaffTime & { minutes: number; groomerName: string | null }
  >({
    date: null,
    start: null,
    groomerId: null,
    minutes: 0,
    groomerName: null,
  });
  const [trainingIntake, setTrainingIntake] = useState<TrainingIntake>({
    goals: [],
    experience: null,
    notes: "",
  });
  // Grooming: pets staff marked matted — the surcharge and its minutes.
  const [groomingMatted, setGroomingMatted] = useState<Record<number, boolean>>(
    {},
  );
  const trainingAudience = isCustomerMode ? "customer" : "staff";
  const { data: trainingPrograms = NO_TRAINING_PROGRAMS } = useQuery({
    queryKey: ["training", "packages", trainingAudience] as const,
    queryFn: () => fetchTrainingPrograms(trainingAudience),
    enabled: selectedService === "training",
  });
  const { data: trainingGoalOptions = NO_GOALS } = useQuery({
    queryKey: ["training", "goal-options", trainingAudience] as const,
    queryFn: () => fetchTrainingGoalOptions(trainingAudience),
    enabled: selectedService === "training",
  });
  const offeredClasses = useOfferedTrainingClasses({
    asCustomer: isCustomerMode,
    enabled: selectedService === "training",
  });
  const createTrainingSeries = useCreateTrainingSeries();
  const cancelTrainingSeries = useCancelTrainingSeries();
  const grantLessonPack = useGrantLessonPack();
  // Staff's: which staff row a trainer's slot belongs to, for the series.
  const { data: trainingTrainers = NO_TRAINERS } = useTrainingTrainers({
    enabled: selectedService === "training" && !isCustomerMode,
  });
  const trainingProgram =
    trainingPrograms.find((p) => p.id === trainingChoice.programId) ?? null;
  const trainingFormat = trainingProgram
    ? programFormat(trainingProgram)
    : null;
  const trainingClasses = trainingProgram
    ? classesForProgram(
        offeredClasses.data ?? NO_CLASSES,
        trainingProgram,
        trainingPrograms.filter((p) => programFormat(p) === "group").length,
      )
    : NO_CLASSES;
  const trainingClass =
    trainingClasses.find((c) => c.id === trainingClassId) ?? null;
  // The first session the dog attends — the class's start, or its next
  // session when it is already running.
  const trainingFirstSession = trainingClass
    ? (classSessionDates(trainingClass)[0] ?? trainingClass.startDate)
    : null;
  const trainingMinutes = trainingProgram ? programMinutes(trainingProgram) : 0;

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
    setGroomingManualDuration(undefined);
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
      setGroomingManualDuration(undefined);
      setGroomingSelectedAddOnIds([]);
      setGroomingPetPackages({});
      setGroomingMatted({});
      setGroomingTime({
        date: null,
        start: null,
        groomerId: null,
        minutes: 0,
        groomerName: null,
      });
    }
  }, [selectedService]);
  useEffect(() => {
    if (selectedService === "training") return;
    setTrainingClassId(null);
    setTrainingTime({
      date: null,
      start: null,
      groomerId: null,
      minutes: 0,
      groomerName: null,
    });
  }, [selectedService]);
  // Staff's answer to the first-day evaluation on Confirm; null until they
  // give one, which reads as ON wherever a pet needs evaluating (below).
  const [evaluationChoice, setEvaluationChoice] = useState<boolean | null>(
    null,
  );
  // Staff may book past a missing, failed or expired evaluation — the
  // facility's own call — with a reason kept on the booking. `key` ties the
  // decision to the pets and service it was made for: change either and it
  // has to be made again.
  const [evaluationOverride, setEvaluationOverride] = useState<{
    key: string;
    reason: string;
  } | null>(null);
  // How staff take a deposit (the client's mock, 2026-10-01): the card on
  // file, a payment link, cash or e-transfer now, or later. "Later" until
  // they choose — nothing is recorded as taken that was not.
  const [depositMode, setDepositMode] = useState<DepositMode>("later");
  const [depositCashMethod, setDepositCashMethod] = useState<
    "cash" | "e_transfer"
  >("cash");

  // ── WHICH CARE STEPS THIS SERVICE HAS (2026-10-01) ────────────────────
  //
  // Feeding and Medication are the facility's to switch off, make optional
  // or require, per service (Settings › Services › Feeding & medications).
  // A step switched off is not in the list, and books nothing.
  const { instructions: feedingInstructions } = useFeedingInstructions();
  const { instructions: medicationInstructions } = useMedicationInstructions();
  const feedingUse = careStepUse(feedingInstructions, selectedService);
  const medicationUse = careStepUse(medicationInstructions, selectedService);

  // The Details screen's sub-steps: the service's own, then its care steps.
  // Customers never see Room Assignment (id 1): the facility assigns it.
  const currentSubSteps = useMemo(
    () =>
      detailSubSteps(selectedService, {
        customer: isCustomerMode,
        care: { feeding: feedingUse, medication: medicationUse },
      }),
    [selectedService, isCustomerMode, feedingUse, medicationUse],
  );
  // Where the sub-step the form is on sits in the list as it is now.
  const currentSubStep = subStepIndexOf(currentSubSteps, currentSubStepId);
  const goToSubStep = (index: number) =>
    setCurrentSubStepId(currentSubSteps[index]?.id ?? 0);

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
            // The service is chosen on Room type now, by everyone.
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
          case 0: // A package for every pet
            return (
              selectedPetIds.length > 0 &&
              selectedPetIds.every((petId) => !!packageIdFor(petId))
            );
          case 1: // Add-ons — always optional
            return true;
          case 2: // Groomer & time: a slot picked for this length
            return groomingTime.start !== null && !!groomingTime.date;
          default:
            return false;
        }
      }
      if (selectedService === "training") {
        switch (stepId) {
          case 0: // A program
            return !!trainingProgram;
          case 1: // A class, or the trainer's slot
            return trainingFormat === "group"
              ? !!trainingClassId
              : trainingTime.start !== null && !!trainingTime.date;
          default: // Goals, and the care steps — all optional
            return true;
        }
      }
      // Custom services — schedule sub-step only
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
      packageIdFor,
      groomingTime,
      trainingProgram,
      trainingFormat,
      trainingClassId,
      trainingTime,
    ],
  );

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

  // ── THE MEDICATIONS STEP (2026-10-01) ─────────────────────────────────────
  //
  // The client's design, as one hook: the step in the main column and the
  // stay-and-doses panel in the rail read the same state. Its days are the
  // stay's — a boarding range, or the daycare days chosen. What is BOOKED is
  // `effectiveMedications`: every saved medication and every named, complete
  // one still open (lib: use-medication-step).
  const careStay = useMemo(
    () =>
      careStayFor({
        service: selectedService,
        boardingStart: boardingRangeStart
          ? localDay(boardingRangeStart)
          : undefined,
        boardingEnd: boardingRangeEnd ? localDay(boardingRangeEnd) : undefined,
        daycareDates: daycareSelectedDates.map(localDay),
        startDate,
        // A class: every session the dog is booked into; a lesson, its day.
        trainingDates:
          selectedService !== "training"
            ? []
            : trainingFormat === "group"
              ? trainingClass
                ? classSessionDates(trainingClass)
                : []
              : trainingTime.date
                ? [trainingTime.date]
                : [],
      }),
    [
      selectedService,
      boardingRangeStart,
      boardingRangeEnd,
      daycareSelectedDates,
      startDate,
      trainingFormat,
      trainingClass,
      trainingTime.date,
    ],
  );
  const medicationPets = useMemo(
    () =>
      effectiveSelectedPets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        saved: pet.medications,
        vet: pet.vet,
      })),
    [effectiveSelectedPets],
  );
  // The label photos chosen here, sent once the booking has its ref.
  const labelPhotos = useLabelPhotos(editingRef);
  const medicationStep = useMedicationStep({
    medications,
    setMedications,
    pets: medicationPets,
    service: selectedService,
    stay: careStay,
    // A pet starts from its profile on a NEW booking; an edit, or a draft
    // that brought its own, keeps what it has.
    fromProfiles:
      !editMode &&
      !(preSelectedMedications && preSelectedMedications.length > 0),
    staff: !isCustomerMode,
    // An edit loads the booking's first pet only: the others' medications
    // are kept exactly as they were (lib/bookings/care-pets.ts).
    keepOtherPets: editMode,
    // An estimate is a price, not a request for care: nothing is required.
    required: medicationUse === "required" && !isEstimateMode,
    noMedication,
    setNoMedication,
    vetContacts,
    setVetContacts,
    labelPhotos,
  });
  // What is booked: nothing when the facility has the step off for this
  // service — so a pet's profile medications do not ride along on a groom.
  const effectiveMedications =
    medicationUse === "disabled"
      ? NO_MEDICATIONS
      : medicationStep.effectiveMedications;

  // ── THE FEEDING STEP (2026-10-01) ─────────────────────────────────────────
  //
  // The client's design, as one hook, like the Medications step: a plan per
  // pet, booked as it is written. What is BOOKED is `effectiveFeeding`; the
  // booking's stored plans are what it was opened with, and an untouched one
  // is booked exactly as it was (lib: use-feeding-step).
  const feedingPets = useMemo(
    () =>
      effectiveSelectedPets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        saved: pet.feedingPlan,
      })),
    [effectiveSelectedPets],
  );
  const feedingStep = useFeedingStep({
    feeding: feedingSchedule,
    pets: feedingPets,
    service: selectedService,
    stay: careStay,
    fromProfiles:
      !editMode &&
      !(preSelectedFeedingSchedule && preSelectedFeedingSchedule.length > 0),
    staff: !isCustomerMode,
    keepOtherPets: editMode,
    required: feedingUse === "required" && !isEstimateMode,
  });
  const effectiveFeeding =
    feedingUse === "disabled" ? NO_FEEDING : feedingStep.effectiveFeeding;

  /** A sub-step is done: its own answers, or the care step's. */
  const feedingComplete = feedingStep.complete;
  const medicationComplete = medicationStep.complete;
  const subStepDone = useCallback(
    (stepId: number) =>
      stepId === FEEDING_SUB_STEP_ID
        ? feedingComplete
        : stepId === MEDICATION_SUB_STEP_ID
          ? medicationComplete
          : isSubStepComplete(stepId),
    [feedingComplete, medicationComplete, isSubStepComplete],
  );
  const updatePet = useUpdatePet();

  /**
   * "Save to pet profile for future visits": a medication or a feeding plan
   * ticked for it goes onto the pet's profile, and one that came from the
   * profile and was unticked comes off — so the next booking starts with
   * them. After the booking is saved, never instead of it: a refusal (a
   * member of staff who may not edit pet records) is said, and the booking
   * stands. ONE write per pet carrying both: the route merges `details` from
   * what it reads, so two at once would each put back what the other took.
   */
  const saveCareProfiles = async () => {
    const pets = effectiveSelectedPets.filter((pet) => pet.id > 0);
    const results = await Promise.allSettled(
      pets.map(async (pet) => {
        const medications = profileAfterBooking(
          pet.medications ?? [],
          effectiveMedications.filter((item) => item.petId === pet.id),
        );
        const feedingPlan = feedingProfileAfterBooking(
          pet.feedingPlan,
          effectiveFeeding.find((item) => item.petId === pet.id),
        );
        const vet = medicationStep.effectiveVetContacts?.[String(pet.id)];
        const vetChanged =
          vet !== undefined &&
          JSON.stringify(vet) !== JSON.stringify(pet.vet ?? {});
        const patch = {
          ...(medications ? { medications } : {}),
          ...(feedingPlan !== undefined ? { feedingPlan } : {}),
          ...(vetChanged ? { vet } : {}),
        };
        if (Object.keys(patch).length > 0) {
          await updatePet.mutateAsync({ ref: pet.id, patch });
        }
      }),
    );
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        toast.warning(
          fillWords(t("careProfileNotSaved"), { pet: pets[index].name }),
        );
      }
    });
  };

  /**
   * One pet's care as it is booked — what a training enrolment carries to
   * its sessions, and what the cart keeps for a dog already set up.
   */
  const careForPet = (petId: number): BookingCare | undefined => {
    const feeding = effectiveFeeding.filter((item) => item.petId === petId);
    const meds = effectiveMedications.filter((item) => item.petId === petId);
    const none =
      medicationUse === "disabled"
        ? []
        : medicationStep.effectiveNoMedication.filter((id) => id === petId);
    const vet =
      medicationUse === "disabled"
        ? undefined
        : medicationStep.effectiveVetContacts?.[String(petId)];
    const care: BookingCare = {
      ...(feeding.length > 0 ? { feedingSchedule: feeding } : {}),
      ...(meds.length > 0 ? { medications: meds } : {}),
      ...(none.length > 0 ? { noMedication: none } : {}),
      ...(vet ? { vetContacts: { [String(petId)]: vet } } : {}),
    };
    return Object.keys(care).length > 0 ? care : undefined;
  };

  /**
   * The label photos chosen on this form, sent to the booking now that it is
   * saved. One that does not save is said, by medication; the booking stands
   * either way — a customer brings the label, staff add it from Edit.
   */
  const flushLabelPhotos = async (
    ref: number | undefined,
    booked: readonly MedicationItem[] = effectiveMedications,
  ) => {
    if (!ref || medicationUse === "disabled" || !labelPhotos.changed) return;
    const failed = await labelPhotos.flush(
      ref,
      booked.map((item) => ({ id: item.id, name: item.name })),
    );
    if (failed.length > 0) {
      toast.warning(
        fillWords(t("medsPhotoNotSaved"), {
          names: formatList(failed, locale),
        }),
        {
          description: t(
            isCustomerMode
              ? "medsPhotoNotSavedCustomer"
              : "medsPhotoNotSavedStaff",
          ),
        },
      );
    }
  };

  // The groom's extras: the one list create_booking checks every requested
  // add-on against, narrowed by the add-on rules for this service, location
  // and these pets — the SAME call the details step makes, so the list priced
  // here is the list offered there (lib/add-ons/use-grooming-add-on-offer.ts).
  const groomingAddOnCatalog = useGroomingAddOnOffer({
    packageId: selectedService === "grooming" ? serviceType : null,
    pets: effectiveSelectedPets,
    asCustomer: isCustomerMode,
  });

  // Only the bookings on the dates being booked, for auto-assigning a section
  // or a unit, not every booking the facility (or customer) ever had.
  const sortedDaycareDays = daycareSelectedDates
    .map((d) => d.toISOString().split("T")[0])
    .sort();

  const assignFrom =
    selectedService === "boarding"
      ? boardingRangeStart?.toISOString().split("T")[0]
      : sortedDaycareDays[0];
  const assignTo =
    selectedService === "boarding"
      ? boardingRangeEnd?.toISOString().split("T")[0]
      : sortedDaycareDays[sortedDaycareDays.length - 1];
  const { data: knownBookings = NO_BOOKINGS } = useQuery({
    ...bookingQueries.window({ from: assignFrom, to: assignTo }),
    enabled: Boolean(assignFrom && assignTo),
  });

  // In customer mode the Room Assignment step is hidden — the system
  // auto-assigns each pet to the best-fit section/unit based on the facility's
  // configured rules (pet type, weight) and available capacity. The facility
  // can override from the facility side after the booking request arrives.
  useEffect(() => {
    if (effectiveSelectedPets.length === 0) return;

    if (selectedService === "daycare") {
      if (daycareSelectedDates.length === 0) return;
      // Staff keep a play area they chose on Confirm.
      if (!isCustomerMode && roomAssignments.length > 0) return;
      const firstDate = localDay(daycareSelectedDates[0]);
      const next: Array<{ petId: number; roomId: string }> = [];
      for (const pet of effectiveSelectedPets) {
        const section = autoAssignDaycareSection(
          pet,
          firstDate,
          daycareSections,
          knownBookings,
        );
        if (section) next.push({ petId: pet.id, roomId: section.id });
      }
      setRoomAssignments(next);
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- a staff choice is read, never re-run on
  }, [
    isCustomerMode,
    selectedService,
    effectiveSelectedPets,
    daycareSelectedDates,
    daycareSections,
    knownBookings,
  ]);

  // The selected client's own bookings, asked for by client: whether they are
  // new, and which pets are. A customer may read their own; staff theirs.
  const { data: selectedClientBookingsData } = useQuery({
    ...bookingQueries.byClient(selectedClientId ?? 0),
    enabled: selectedClientId != null,
  });
  const selectedClientBookings =
    selectedClientId == null
      ? NO_BOOKINGS
      : (selectedClientBookingsData ?? NO_BOOKINGS);

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
    // Only a customer is sent to the evaluation. Staff choose, at the
    // service step — book it first, or book without it and say why.
    if (
      isCustomerMode &&
      bookingFlow.evaluationRequired &&
      bookingFlow.hideServicesUntilEvaluationCompleted &&
      !canAccessLockedServices
    ) {
      return "evaluation";
    }
    return selectedService;
  }, [bookingFlow, selectedService, canAccessLockedServices, isCustomerMode]);

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

  // What the total adds for an add-on already on the booking: every live
  // add-on for this type of service, at the booking location's price — the
  // rule the server's re-price applies (lib/add-ons/use-offered-add-ons.ts),
  // so the quote and the server agree. The pickers offer a narrower list.
  //
  // An effect here used to add every "default" and "required" add-on to each
  // pet. Add-ons carry neither flag since the one list (defaults belong to a
  // SERVICE, as boarding's do), so it could never fire, and it went.
  const storedAddOns = usePricedAddOns(selectedService);

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

  // The add-ons the chosen boarding service attaches by length of stay.
  // DERIVED, never stored in `extraServices`: they follow the dates and the
  // service as they change, and a line kept in state would outlive both. They
  // are priced and saved beside the chosen add-ons — see
  // `lib/pricing/boarding-default-addons.ts` for how the days are counted.
  // Not when EDITING: a saved booking's lines already hold its defaults, and
  // deriving them again would charge each one twice.
  const boardingDefaultLines = useMemo(
    () =>
      !editMode &&
      selectedService === "boarding" &&
      boardingService &&
      boardingNights > 0
        ? Object.keys(petBoardingServices).length > 0
          ? // Each pet's own service attaches its own defaults.
            pricingSelectedPetIds.flatMap((petId) =>
              defaultAddOnLines({
                defaults: (petBoardingServices[petId] ?? boardingService)
                  .defaultAddOns,
                nights: boardingNights,
                petIds: [petId],
                catalogue: storedAddOns,
              }),
            )
          : defaultAddOnLines({
              defaults: boardingService.defaultAddOns,
              nights: boardingNights,
              petIds: pricingSelectedPetIds,
              catalogue: storedAddOns,
            })
        : NO_EXTRA_SERVICES,
    [
      editMode,
      selectedService,
      boardingService,
      petBoardingServices,
      boardingNights,
      pricingSelectedPetIds,
      storedAddOns,
    ],
  );

  // A groom's package attaches add-ons by its own rules, PER PET (the
  // client's mock, 2026-10-01): each pet's package, against that pet's
  // size, weight, coat and breed. They were the FIRST pet's rules, applied
  // once, inside a screen that is no longer drawn. Not when editing — the
  // saved booking's lines already hold them.
  const groomingDefaultLines = useMemo(
    () =>
      !editMode && selectedService === "grooming"
        ? effectiveSelectedPets.flatMap((pet) => {
            const id = packageIdFor(pet.id);
            const pkg = id ? groomingMenu.find((p) => p.id === id) : undefined;
            if (!pkg) return [];
            return resolveAutoAddOns(pkg, {
              petSize:
                groomingSizeFor(pet.weight, groomingSizeTiers) ?? undefined,
              petWeight: pet.weight,
              coatType: pet.coatType as GroomingCoatType | undefined,
              breed: pet.breed || undefined,
            }).map((serviceId) => ({ serviceId, petId: pet.id, quantity: 1 }));
          })
        : NO_EXTRA_SERVICES,
    [
      editMode,
      selectedService,
      effectiveSelectedPets,
      packageIdFor,
      groomingMenu,
      groomingSizeTiers,
    ],
  );

  // Each pet's groom on the table, in order: its package, priced and timed
  // for that pet (`groomPrice`), plus its own add-ons' minutes — and the
  // whole appointment, every pet back to back (the client's mock).
  const addOnByRef = bookableLookup(storedAddOns);
  const groomPets =
    selectedService === "grooming"
      ? effectiveSelectedPets.flatMap((pet) => {
          const id = packageIdFor(pet.id);
          const pkg = id ? groomingMenu.find((p) => p.id === id) : undefined;
          if (!pkg) return [];
          const groom = groomPrice({
            pet,
            pkg,
            tiers: groomingSizeTiers,
            matted: groomingMatted[pet.id] === true,
            overrides: groomingPetPricingOverrides,
          });
          const addOnMinutes = [...extraServices, ...groomingDefaultLines]
            .filter((line) => line.petId === pet.id)
            .reduce(
              (sum, line) =>
                sum +
                (addOnByRef.get(line.serviceId)?.durationMin ?? 0) *
                  Math.max(0, line.quantity),
              0,
            );
          return [{ pet, pkg, groom, minutes: groom.minutes + addOnMinutes }];
        })
      : [];
  const groomTotalMinutes = backToBack(groomPets.map((g) => g.minutes));
  // The tables that fit the largest pet on the appointment, by the
  // facility's own sizes — a staff row on Confirm, as the old picker was.
  const { stations: groomingStations } = useGroomingStations();
  const largestGroomSize = (() => {
    const order = ["small", "medium", "large", "giant"] as const;
    let largest: (typeof order)[number] | null = null;
    for (const { groom } of groomPets) {
      const size = groom.size ?? "small";
      if (!largest || order.indexOf(size) > order.indexOf(largest))
        largest = size;
    }
    return largest;
  })();
  const stationOptions = largestGroomSize
    ? groomingStations
        .filter(
          (station) =>
            station.active &&
            station.status !== "out-of-service" &&
            isStationEligibleForPetSize(station, largestGroomSize),
        )
        .map((station) => ({ id: station.id, name: station.name }))
    : [];
  // A slot picked for another length no longer fits: it is picked again.
  if (
    groomingTime.start !== null &&
    groomingTime.minutes !== groomTotalMinutes
  ) {
    setGroomingTime({ ...groomingTime, start: null });
  }

  // The quote: one pure function of what was chosen (lib/bookings/quote).
  // Check if service requires evaluation
  const serviceRequiresEvaluation = useMemo(() => {
    return requiresEvaluationForService(selectedService);
  }, [requiresEvaluationForService, selectedService]);

  // Check if evaluation is optional
  const isEvaluationOptional = useMemo(() => {
    return isEvaluationOptionalForService(selectedService);
  }, [isEvaluationOptionalForService, selectedService]);

  // The pets this service's evaluation rule stops, and why — the test the
  // steps below always applied: an expired or failed evaluation stops any
  // service, and a missing one stops a service that requires it.
  const evaluationIssues = useMemo((): EvaluationIssue[] => {
    if (!selectedService || selectedService === "evaluation") return [];
    const issues: EvaluationIssue[] = [];
    for (const pet of selectedPets) {
      if (petHasExpiredEvaluation(pet)) {
        issues.push({ pet, reason: "expired" });
      } else if (petHasFailedEvaluation(pet)) {
        issues.push({ pet, reason: "failed" });
      } else if (
        serviceRequiresEvaluation &&
        !isEvaluationOptional &&
        !petHasValidEvaluation(pet)
      ) {
        issues.push({ pet, reason: "missing" });
      }
    }
    return issues;
  }, [
    selectedService,
    selectedPets,
    petHasExpiredEvaluation,
    petHasFailedEvaluation,
    petHasValidEvaluation,
    serviceRequiresEvaluation,
    isEvaluationOptional,
  ]);
  const evaluationIssueKey = `${selectedService}:${evaluationIssues
    .map((issue) => `${issue.pet.id}-${issue.reason}`)
    .join(",")}`;
  // A customer is stopped by the rule; staff go on once they have said why.
  const evaluationOverridden =
    !isCustomerMode &&
    evaluationIssues.length > 0 &&
    evaluationOverride?.key === evaluationIssueKey &&
    evaluationOverride.reason.trim().length >= EVALUATION_OVERRIDE_MIN_REASON;

  // ── EVALUATED ON THE FIRST DAY (the client's mock, 2026-10-01) ────────
  // Staff booking a pet the service's evaluation rule stops are asked on
  // Confirm whether it is evaluated on its first day — ON until they say
  // otherwise, as the mock has it. Off asks for the reason kept today.
  const includesEvaluation =
    !isCustomerMode &&
    selectedService !== "evaluation" &&
    evaluationIssues.length > 0 &&
    (evaluationChoice ?? true);

  const calculatePrice = useMemo(
    () =>
      assembleQuote({
        t,
        locale,
        selectedService,
        serviceType,
        startDate,
        endDate,
        checkInTime,
        checkOutTime,
        boardingRangeStart,
        boardingRangeEnd,
        boardingNights,
        daycareSelectedDates,
        daycareDateTimes,
        selectedClient,
        selectedPets,
        pricingPets,
        pricingSelectedPetIds,
        isNewCustomer: effectiveIsNewCustomer,
        newPetIds: effectiveNewPetIds,
        isEstimateMode,
        isGuestEstimate,
        daycareService,
        boardingService,
        boardingPetServices: petBoardingServices,
        boardingShare,
        roomCategories,
        facilityRooms,
        roomAssignments,
        locationId: currentLocationId,
        groomingMenu,
        groomingPetPackages: Object.fromEntries(
          selectedPets.flatMap((pet) => {
            const id =
              groomingPetPackages[pet.id] ||
              (Object.keys(groomingPetPackages).length === 0
                ? serviceType
                : "");
            return id ? [[pet.id, id]] : [];
          }),
        ),
        groomingMatted,
        groomingSizeTiers,
        groomingPetPricingOverrides,
        groomingAddOnCatalog,
        groomingSelectedAddOnIds,
        groomingIsMobile,
        groomingTravelZones,
        facilityBasePostal,
        // "Private lesson · Bubu — 3-session pack — $270.00" (the client's
        // mock): the program, the dog, and what it buys.
        trainingLines: trainingProgram
          ? selectedPets.map((pet) => {
              if (trainingFormat === "group") {
                const weeks = trainingClass
                  ? trainingClass.sessionsLeft
                  : trainingProgram.sessions;
                return {
                  price: trainingClass
                    ? classPrice(trainingClass)
                    : trainingProgram.price,
                  label: trainingProgram.name,
                  detail: fillWords(
                    t(
                      isPluralOne(weeks, locale)
                        ? "wizWeeksOne"
                        : "wizWeeksOther",
                    ),
                    { count: weeks },
                  ),
                  petName: pet.name,
                };
              }
              if (trainingFormat === "lesson") {
                return {
                  price: programPrice(trainingProgram, trainingChoice.pack),
                  label: trainingProgram.name,
                  detail:
                    trainingChoice.pack > 1
                      ? fillWords(t("wizSessionPack"), {
                          count: trainingChoice.pack,
                        })
                      : t("wizOneSession"),
                  petName: pet.name,
                };
              }
              return {
                price: programPrice(trainingProgram),
                label: trainingProgram.name,
                detail: fillWords(t("wizMinutes"), {
                  count: programMinutes(trainingProgram),
                }),
                petName: pet.name,
              };
            })
          : [],
        evaluation: evaluationConfig,
        includesEvaluation,
        customBasePrice: (slug) => getModuleBySlug(slug)?.pricing.basePrice,
        customName: (slug) => getModuleBySlug(slug)?.name,
        pricingRules,
        extraServices,
        defaultLines:
          selectedService === "grooming"
            ? groomingDefaultLines
            : boardingDefaultLines,
        addOnsCatalog: storedAddOns,
        // A room-type rule names kennel CLASSES and an assignment may name a
        // room; a room answers with its class, a class id falls through as is.
        roomCategoryOf: (roomId) =>
          facilityRooms.find((room) => room.id === roomId)?.categoryId,
        careFees,
        medicationSettings: medicationStep.settings,
        feedingSettings: feedingStep.settings,
        careStay,
        medications: effectiveMedications,
        feeding: effectiveFeeding,
        redeemedPackageId,
        estimateTaxRate,
      }),
    [
      t,
      locale,
      selectedService,
      serviceType,
      startDate,
      endDate,
      checkInTime,
      checkOutTime,
      boardingRangeStart,
      boardingRangeEnd,
      boardingNights,
      daycareSelectedDates,
      daycareDateTimes,
      selectedClient,
      selectedPets,
      pricingPets,
      pricingSelectedPetIds,
      effectiveIsNewCustomer,
      effectiveNewPetIds,
      isEstimateMode,
      isGuestEstimate,
      daycareService,
      boardingService,
      petBoardingServices,
      boardingShare,
      roomCategories,
      facilityRooms,
      roomAssignments,
      currentLocationId,
      groomingMenu,
      groomingPetPackages,
      groomingMatted,
      groomingSizeTiers,
      groomingPetPricingOverrides,
      groomingAddOnCatalog,
      groomingSelectedAddOnIds,
      groomingIsMobile,
      groomingTravelZones,
      facilityBasePostal,
      trainingProgram,
      trainingFormat,
      trainingClass,
      trainingChoice,
      evaluationConfig,
      includesEvaluation,
      getModuleBySlug,
      pricingRules,
      extraServices,
      boardingDefaultLines,
      groomingDefaultLines,
      storedAddOns,
      careFees,
      medicationStep.settings,
      feedingStep.settings,
      careStay,
      effectiveMedications,
      effectiveFeeding,
      redeemedPackageId,
      estimateTaxRate,
    ],
  );

  // The add-on lines as the booking is sent and the confirm step shows them:
  // the priced lines, each with whoever the confirm step assigned it to.
  const billedAddOnLines = useMemo(
    () =>
      calculatePrice.effectiveExtraServices.map((line) => {
        const key = `${line.serviceId}::${line.petId}`;
        if (!(key in addOnStaff)) return line;
        const chosen = addOnStaff[key];
        return {
          serviceId: line.serviceId,
          quantity: line.quantity,
          petId: line.petId,
          ...(chosen ? { staffId: chosen } : {}),
        };
      }),
    [calculatePrice.effectiveExtraServices, addOnStaff],
  );

  // Resolve any deposit rule that applies to this booking. Customer-mode
  // now participates so the deposit + card picker can render on Confirm.
  // The facility's rules, and NOT while they are still arriving. This called
  // loadDepositRules(), which answered from localStorage — or, on any browser
  // that had never opened the settings screen, from the seed file — so the
  // deposit a customer was asked for depended on the machine the booking was
  // taken on. `isPending` is what stops the replacement quoting a figure
  // before the real terms have landed.
  const applicableDepositRule = useMemo(() => {
    if (isEstimateMode || !selectedService || depositRulesPending) return null;
    return findApplicableDepositRule(
      selectedService,
      calculatePrice.total,
      depositRules,
    );
  }, [
    isEstimateMode,
    selectedService,
    calculatePrice.total,
    depositRules,
    depositRulesPending,
  ]);

  // The facility's waivers this client still has to sign for the service.
  const waivers = useBookingWaivers({
    service: selectedService,
    clientRef:
      selectedClientId !== null && selectedClientId > 0
        ? selectedClientId
        : undefined,
    asCustomer: isCustomerMode,
  });
  // The facility's required forms this booking would still be missing,
  // asked before it is made (the client's mock, 2026-10-02) — listed on
  // Confirm; a customer completes them, staff say why it goes ahead without.
  const onConfirmStep = displayedSteps[currentStep]?.id === "confirm";
  const missingForms = useQuery({
    queryKey: [
      "forms",
      "missing-for-booking",
      isCustomerMode ? "mine" : selectedClientId,
      selectedPetIds,
      selectedService,
    ] as const,
    queryFn: async (): Promise<MissingForm[]> => {
      const response = await fetch("/api/forms/missing-for-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRef:
            !isCustomerMode && selectedClientId && selectedClientId > 0
              ? selectedClientId
              : undefined,
          petRefs: selectedPetIds.filter((id) => id > 0),
          service: selectedService,
        }),
      });
      if (!response.ok) return [];
      const body = (await response.json()) as { missing?: MissingForm[] };
      return Array.isArray(body.missing) ? body.missing : [];
    },
    enabled:
      open &&
      onConfirmStep &&
      !isEstimateMode &&
      !!selectedService &&
      selectedPetIds.length > 0,
    refetchOnWindowFocus: true,
  });
  const formsMissing = missingForms.data ?? NO_MISSING_FORMS;
  const formsBlocking = formsMissing.some(
    (form) => form.enforcement === "block",
  );
  const [formsReason, setFormsReason] = useState("");
  // Staff: the signing link sent from Confirm, by channel, to whom (the
  // client's mock, 2026-10-02). Another client is another link.
  const [signingLinks, setSigningLinks] = useState<{
    email?: string;
    sms?: string;
  }>({});
  const [signingLinkSending, setSigningLinkSending] = useState<
    "email" | "sms" | null
  >(null);
  const [signingLinksClient, setSigningLinksClient] =
    useState(selectedClientId);
  if (signingLinksClient !== selectedClientId) {
    setSigningLinksClient(selectedClientId);
    setSigningLinks({});
  }
  const sendSigningLink = async (via: "email" | "sms") => {
    if (!selectedClient || signingLinkSending) return;
    setSigningLinkSending(via);
    try {
      const response = await fetch("/api/waivers/send-signing-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRef: selectedClient.id,
          service: selectedService || undefined,
          channel: via,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        sent?: boolean;
        detail?: string;
        to?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.sent) {
        toast.error(t("wizLinkNotSent"), {
          description: body?.error ?? body?.detail,
        });
        return;
      }
      setSigningLinks((prev) => ({ ...prev, [via]: body.to ?? "" }));
    } finally {
      setSigningLinkSending(null);
    }
  };

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
        // A customer's pets must pass the service's evaluation rule here;
        // staff decide on Confirm (evaluated on the first day, or why not).
        if (isCustomerMode && evaluationIssues.length > 0) return false;
        return true;
      case "details": {
        if (isCustomerMode && evaluationIssues.length > 0) return false;
        const subStepId = currentSubSteps[currentSubStep]?.id ?? 0;
        // The Medications step: a medication with a name is booked, so Next
        // waits while one is incomplete — no day, no time, no amount — or
        // while a saved one's chosen dates are all outside the stay.
        if (
          subStepId === MEDICATION_SUB_STEP_ID &&
          !medicationStep.canContinue
        ) {
          return false;
        }
        // The Feeding step: a plan is booked as it is written, so Next waits
        // while one has no meal time, no day, a half-typed time or a portion
        // of nothing.
        if (subStepId === FEEDING_SUB_STEP_ID && !feedingStep.canContinue) {
          return false;
        }
        // A required care step waits for every pet's answer.
        return subStepDone(subStepId);
      }
      case "confirm": {
        // A pet the evaluation rule stops is evaluated on its first day, or
        // staff say why not; a customer cannot get this far with one.
        if (
          evaluationIssues.length > 0 &&
          !includesEvaluation &&
          !evaluationOverridden
        ) {
          return false;
        }
        // Waivers: a CUSTOMER signs what applies before asking — they are the
        // signer, and they are here. Staff are not refused: a phone booking
        // is taken without the client present, and the confirm step shows
        // what is outstanding for the counter or check-in.
        if (isCustomerMode && (waivers.loading || waivers.pending.length > 0))
          return false;
        // A form the facility requires: a customer completes it first; staff
        // go ahead only with a reason, kept on the booking (2026-10-02).
        if (formsBlocking) {
          if (isCustomerMode) return false;
          if (formsReason.trim().length < FORMS_MIN_REASON) return false;
        }
        return true;
      }
      default:
        return false;
    }
  }, [
    includesEvaluation,
    currentStep,
    displayedSteps,
    currentSubStep,
    selectedClientId,
    selectedPetIds,
    selectedService,
    evaluationIssues,
    evaluationOverridden,
    isEstimateMode,
    isGuestEstimate,
    isGuestInquiryComplete,
    waivers.loading,
    waivers.pending.length,
    isCustomerMode,
    currentSubSteps,
    medicationStep.canContinue,
    feedingStep.canContinue,
    subStepDone,
    formsBlocking,
    formsReason,
  ]);

  const applicablePackages = useMemo(() => {
    if (!selectedClient || !selectedService) return [];

    // What Confirm offers to apply: a pass this client holds for this service.
    const packages: {
      id: string;
      name: string;
      passesLeft: number;
      totalPasses: number;
    }[] = [];

    // 1. Legacy packages (from client.packages)
    if (selectedClient.packages) {
      for (const pkg of selectedClient.packages) {
        if (pkg.remainingCredits > 0) {
          // For legacy packages, we might need a rough heuristic if they don't have a serviceId mapping,
          // but let's assume they map to the module/service if their name or moduleId matches.
          // For now, if they are just active, we might include them, or strictly check moduleId.
          if (
            pkg.moduleId === selectedService ||
            pkg.name.toLowerCase().includes(selectedService)
          ) {
            packages.push({
              id: pkg.id,
              name: pkg.name,
              passesLeft: pkg.remainingCredits,
              totalPasses: pkg.totalCredits,
            });
          }
        }
      }
    }

    // 2. New Prepaid packages (from customerPackages query)
    const prepaid = customerPackagesData.filter(
      (p) => p.customerId === selectedClient.id && p.status === "active",
    );
    for (const pkg of prepaid) {
      if (pkg.passesTotal - pkg.passesUsed > 0) {
        // A pass covers the booking when its moduleId matches the picked
        // service (e.g. "grooming"). passes[].packageId points at the specific
        // catalog row and is checked separately when finer matching is needed
        // (currently only the module check is required here).
        const coversService = pkg.passes.some(
          (pass) => pass.moduleId === selectedService,
        );

        if (coversService) {
          packages.push({
            id: pkg.id,
            name: pkg.packageName,
            passesLeft: pkg.passesTotal - pkg.passesUsed,
            totalPasses: pkg.passesTotal,
          });
        }
      }
    }

    return packages;
  }, [selectedClient, selectedService, serviceType, customerPackagesData]);

  const handleNext = () => {
    // There was a tip step here, for customers. Its tip never reached the
    // booking — the database zeroes a customer's tip on insert
    // (enforce_booking_integrity) — and it showed three invented staff to
    // split it between. A tip is given on /pay, where it is charged.

    const currentStepId = displayedSteps[currentStep]?.id;
    // A Details screen split into sub-steps — any with more than one, which
    // training has since its care steps (2026-10-01).
    if (currentStepId === "details" && currentSubSteps.length > 1) {
      if (currentSubStep < currentSubSteps.length - 1) {
        goToSubStep(currentSubStep + 1);
        return;
      }
    }
    const nextStep = nextOpenStep(currentStep);
    if (nextStep >= 0) {
      setCurrentStep(nextStep);
      setCurrentSubStepId(0);
      rememberUnfinished(nextStep);
    }
  };

  const handlePrevious = () => {
    const currentStepId = displayedSteps[currentStep]?.id;
    const prevIndex = previousOpenStep(currentStep);
    const prevStepId = displayedSteps[prevIndex]?.id;

    // A Details screen split into sub-steps steps back through them.
    if (currentStepId === "details" && currentSubSteps.length > 1) {
      if (currentSubStep > 0) {
        goToSubStep(currentSubStep - 1);
        return;
      }
    }
    if (prevIndex >= 0) {
      setCurrentStep(prevIndex);
      // Back into a split Details screen lands on its last sub-step.
      if (prevStepId === "details" && currentSubSteps.length > 1) {
        goToSubStep(currentSubSteps.length - 1);
      } else {
        setCurrentSubStepId(0);
      }
    }
  };

  // What the estimate says, from the same figures the confirm step shows.
  // `subtotal` there is already net of discounts, so the lines carry the
  // gross and the discount travels separately; the route recomputes the total
  // from exactly these and lands on the figure on screen.
  const estimateDates = () => ({
    startDate:
      selectedService === "daycare" && daycareSelectedDates.length > 0
        ? daycareSelectedDates[0].toISOString().split("T")[0]
        : selectedService === "boarding" && boardingRangeStart
          ? boardingRangeStart.toISOString().split("T")[0]
          : startDate,
    endDate:
      selectedService === "boarding" && boardingRangeEnd
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
  });

  const persistEstimate = async (
    recipient: Pick<EstimateCreate, "clientRef" | "guest" | "petRefs">,
  ) => {
    if (estimateBusy) return;
    const price = calculatePrice;
    const cents = (n: number) => Math.round(n * 100) / 100;
    const gross = cents(price.subtotal + price.discount);
    const serviceLabel = serviceType
      ? `${selectedService} · ${serviceType}`
      : selectedService;
    const lines: EstimateCreate["lineItems"] = [
      { label: serviceLabel, amount: cents(price.basePrice), quantity: 1 },
    ];
    // One line per add-on, named as a booking names it, so a booking made
    // from the estimate bills each as an add-on line of its own. They were
    // one "Add-ons" line, which converted into money inside the booking's
    // price (lib/estimates/add-on-lines.ts).
    const firstPet = pricingSelectedPetIds[0];
    const addOnLines = estimateAddOnLines({
      lines: price.effectiveExtraServices,
      catalogue: storedAddOns,
      // The share of those lines the boarding service attached by itself,
      // which "Edit" must not hand back to a form that derives it again.
      included: boardingDefaultLines,
      groom:
        selectedService === "grooming" && firstPet != null
          ? {
              addOnIds: groomingSelectedAddOnIds,
              petRef: firstPet,
              offers: groomingAddOnCatalog,
            }
          : undefined,
    });
    lines.push(...addOnLines);
    const addOnMoney = cents(
      addOnLines.reduce((sum, line) => sum + line.amount * line.quantity, 0),
    );
    // One line per fee as well, naming the rule that charged it, so a
    // booking made from the estimate carries each as that fee's line on its
    // bill (lib/estimates/fee-lines.ts). They were inside one "Fees and
    // adjustments" line, which converted into money inside the price.
    const feeLines = estimateFeeLines({
      adjustments: price.adjustments,
      fees: pricingRules.customFees,
    });
    lines.push(...feeLines);
    const feeMoney = cents(
      feeLines.reduce((sum, line) => sum + line.amount * line.quantity, 0),
    );
    // What is left is what a booking made in this form keeps inside its
    // price: surcharges and the care fees.
    const rest = cents(gross - price.basePrice - addOnMoney - feeMoney);
    if (Math.abs(rest) >= 0.01) {
      lines.push({
        label: t("estimateLineOtherCharges"),
        amount: rest,
        quantity: 1,
      });
    }
    const dates = estimateDates();
    setEstimateBusy(true);
    try {
      const saved = await createEstimate.mutateAsync({
        ...recipient,
        service: selectedService,
        serviceType: serviceType || undefined,
        startDate: dates.startDate || undefined,
        endDate: dates.endDate || undefined,
        checkInTime: dates.checkInTime || undefined,
        checkOutTime: dates.checkOutTime || undefined,
        lineItems: lines,
        discount: cents(price.discount),
        taxRate: price.taxRate,
        send: false,
      });
      setEstimatePricingSnapshot(buildEstimatePricingSnapshot(price));
      setSavedEstimate({ id: saved.id, token: saved.estimateToken });
      setGeneratedEstimateId(saved.estimateId);
      setEstimateCreated(true);
    } catch (error) {
      toast.error(t("estimateSaveFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setEstimateBusy(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  // The booking just made, for the screen that follows it (staff). A
  // customer's request has its own flag, `bookingRequested`.
  const [createdBooking, setCreatedBooking] = useState<{
    ref?: number;
    status: PreviewStatus;
    /** Agreements still unsigned when it was made. */
    missing: number;
    linkSent: boolean;
    /** A confirmation email is on its way: the facility's rule is on, the
     *  switch was left on and the client has an address (2026-10-02). */
    emailed: boolean;
  } | null>(null);
  // Staff: whether the facility's booking confirmation sends an email at all
  // — the done screen says one is on its way only when it does.
  const { data: automationRules } = useQuery({
    ...automationQueries.rules(),
    enabled: open && !isCustomerMode,
  });
  const confirmationEmailOn = (automationRules ?? []).some(
    (rule) =>
      rule.trigger === "booking_created" &&
      rule.enabled &&
      !!rule.emailTemplateId &&
      (rule.serviceTypes.length === 0 ||
        rule.serviceTypes.includes(selectedService)),
  );
  const lastSavedRef = useRef<number | undefined>(undefined);

  // The caller saves the booking. It answers `false` — or throws — when it did
  // not, having said why; anything else means it is saved.
  /**
   * `ok` is the answer every call site already used; `ref` is new and is
   * undefined for a caller that does not return one. Both redemption paths
   * below run AFTER this resolves — "once the booking exists" — so the ref is
   * available to them for the first time.
   */
  const saveThrough = async (
    booking: NewBooking,
  ): Promise<{ ok: boolean; ref?: number }> => {
    try {
      const outcome = await onCreateBooking(booking);
      if (outcome === false) return { ok: false };
      const ref =
        typeof outcome === "object" && outcome !== null
          ? outcome.ref
          : undefined;
      lastSavedRef.current = ref;
      return ref === undefined ? { ok: true } : { ok: true, ref };
    } catch (error) {
      toast.error(t("bookingNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return { ok: false };
    }
  };

  // ── THE FORM WAITS FOR ITS SAVE ───────────────────────────────────────────
  //
  // This called `onCreateBooking(booking)` and, on the next line, reset the
  // form and closed it. The save was still in flight, so a refused booking — a
  // kennel already taken, a pet that is not the client's — reported its error
  // over a closed form, and everything staff had entered was gone. It waits
  // now, and a booking that was not saved leaves the form exactly as it was.
  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    // No draft is saved while the booking is being sent, or after it was.
    draftSubmittedRef.current = true;
    // The ref the done screen names is this save's, never a previous one's.
    lastSavedRef.current = undefined;
    try {
      if (await completeBooking()) {
        if (editMode) {
          // An edit goes back to the booking it came from.
          resetForm();
          onOpenChange(false);
        } else {
          setCreatedBooking({
            ref: lastSavedRef.current,
            status: confirmModel.status,
            missing: waivers.pending.length,
            linkSent: Boolean(signingLinks.email || signingLinks.sms),
            // A training enrolment raises no confirmation: it is no booking
            // the confirmation rule hears about.
            emailed:
              selectedService !== "training" &&
              confirmationEmailOn &&
              notificationEmail &&
              !!selectedClient?.email,
          });
        }
      } else {
        draftSubmittedRef.current = false;
      }
    } catch (error) {
      draftSubmittedRef.current = false;
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  /** True when the form should close: what was asked for is saved. */
  const completeBooking = async (): Promise<boolean> => {
    if (isEstimateMode && isGuestEstimate) {
      await persistEstimate({
        guest: {
          name: guestName.trim() || guestEmail.trim() || t("newInquiry"),
          email: guestEmail.trim() || undefined,
          phone: guestPhone.trim() || undefined,
          pet: guestPetSummary[0] ? { name: guestPetSummary[0] } : undefined,
        },
        petRefs: [],
      });
      return false;
    }

    const clientId = selectedClientId;

    const petIdList = selectedPetIds;
    const petId: number | number[] =
      petIdList.length === 1 ? petIdList[0] : petIdList;

    if (!clientId || petIdList.length === 0) return false;

    // ── ONE DAYCARE DAY IS A DAY TOO ────────────────────────────────────────
    //
    // Two days or more go out as one part per day (withBookingParts), each
    // with its own date and times. ONE day went out as it was: the day as its
    // start, and the form's own end date and times — which the daycare picker
    // never fills — as its end. The database refused it ("null value in
    // column end_at"), so a single day of daycare could not be booked from
    // this form at all. It is that day, start to end, at that day's times.
    const daycareDay =
      selectedService === "daycare" && daycareSelectedDates.length > 0
        ? localDay(daycareSelectedDates[0])
        : undefined;
    const daycareDayTimes = daycareDay
      ? daycareDateTimes.find((d) => d.date === daycareDay)
      : undefined;

    // A room card is a room TYPE; the booking holds a room. See
    // roomsForAssignments — a type sent as a room was refused outright.
    //
    // The stays it checks are asked for NOW, for exactly these nights, and
    // waited on. `knownBookings` is a background read whose window is built
    // from UTC, so east of Greenwich it names another pair of days, and while
    // it loads it reads as "no bookings": every room looked free, the first
    // was picked, and the database refused it as taken.
    let bookedRooms = roomAssignments;
    let kennelMoves: KennelChange[] = [];
    if (
      selectedService === "boarding" &&
      boardingRangeStart &&
      boardingRangeEnd
    ) {
      const nights = {
        from: localDay(boardingRangeStart),
        to: localDay(boardingRangeEnd),
      };
      let stays: Booking[];
      try {
        stays = await queryClient.fetchQuery({
          ...bookingQueries.window(nights),
          staleTime: 0,
        });
      } catch (error) {
        toast.error(t("bookingNotSaved"), {
          description: error instanceof Error ? error.message : undefined,
        });
        return false;
      }
      const oneKennel =
        roomAssignments.length > 0 &&
        new Set(roomAssignments.map((a) => a.roomId)).size === 1;
      if (
        !editMode &&
        !isCustomerMode &&
        oneKennel &&
        kennelChanges.length > 0
      ) {
        // Each stretch of nights its own free kennel of its type, for exactly
        // those nights — the first stretch too, which no longer needs a kennel
        // free for the whole stay.
        const plan = planKennels({
          petIds: roomAssignments.map((a) => a.petId),
          startDate: nights.from,
          endDate: nights.to,
          first: roomAssignments[0]!.roomId,
          changes: kennelChanges,
          categories: roomCategories,
          units: facilityRooms,
          bookings: stays,
        });
        if (!plan.ok) {
          const type =
            roomCategories.find((c) => c.id === plan.stretch.roomId)?.name ??
            facilityRooms.find((r) => r.id === plan.stretch.roomId)?.name ??
            plan.stretch.roomId;
          toast.error(t("bookingNotSaved"), {
            description: kennelFill("noRoomForStretch", {
              type,
              from: formatCalendarDayLong(plan.stretch.from, kennelLocale),
              to: formatCalendarDayLong(plan.stretch.to, kennelLocale),
            }),
          });
          return false;
        }
        bookedRooms = roomAssignments.map((a) => ({
          petId: a.petId,
          roomId: plan.unitAssignment,
        }));
        kennelMoves = plan.kennelMoves;
      } else {
        bookedRooms = roomsForAssignments({
          separate: !boardingShare,
          assignments: roomAssignments,
          startDate: nights.from,
          endDate: nights.to,
          categories: roomCategories,
          units: facilityRooms,
          bookings: stays,
        });
      }
    }

    const booking: NewBooking = {
      clientId,
      petId,
      facilityId,
      service: selectedService,
      serviceType:
        selectedService === "evaluation"
          ? "evaluation"
          : // Daycare's `service_type` is the service's NAME now, not
            // `full_day`/`half_day` derived from a five-hour rule of thumb.
            // The id travels in `details.daycareServiceId`, which is what
            // the server re-price and the tax stamp resolve.
            selectedService === "daycare" && daycareService
            ? daycareService.name
            : selectedService === "training" && trainingProgram
              ? trainingProgram.name
              : serviceType,
      startDate:
        daycareDay ??
        (selectedService === "boarding" && boardingRangeStart
          ? localDay(boardingRangeStart)
          : startDate),
      endDate:
        daycareDay ??
        (selectedService === "evaluation"
          ? startDate
          : selectedService === "boarding" && boardingRangeEnd
            ? localDay(boardingRangeEnd)
            : endDate || startDate),
      checkInTime:
        selectedService === "boarding" && boardingDateTimes.length > 0
          ? boardingDateTimes[0].checkInTime
          : daycareDayTimes?.checkInTime || checkInTime,
      checkOutTime:
        selectedService === "boarding" && boardingDateTimes.length > 0
          ? boardingDateTimes[boardingDateTimes.length - 1].checkOutTime
          : daycareDayTimes?.checkOutTime || checkOutTime,
      // A customer's booking is a REQUEST, always: the database makes every
      // booking a customer inserts `request_submitted` with no price
      // (private.enforce_booking_integrity), whatever a setting said. Staff
      // are the facility, so theirs is confirmed.
      // Staff booking for a client with agreements still to sign: Pending,
      // until the database sees the last one signed (20261002123123).
      status: isCustomerMode
        ? "request_submitted"
        : !isEstimateMode && waivers.pending.length > 0
          ? "pending"
          : "confirmed",
      awaitingAgreements:
        !isCustomerMode && !isEstimateMode && waivers.pending.length > 0
          ? true
          : undefined,
      // A customer's card, charged the deposit when the facility confirms
      // the request — the sentence on Confirm says so (2026-10-02).
      depositCardId:
        isCustomerMode &&
        confirmModel.depositAmount > 0 &&
        confirmModel.depositCardId
          ? confirmModel.depositCardId
          : undefined,
      basePrice: calculatePrice.basePrice,
      discount: calculatePrice.discount,
      // The SERVICE's price. Any custom fee is excluded here and written as a
      // line item by the server, so the customer owes `total_cost +
      // extras_total` — the same figure they were quoted, itemised. Putting
      // the fee in both places would charge it twice.
      totalCost: calculatePrice.serviceTotal,
      // No paymentStatus: a new booking has taken no money, and the database
      // says so rather than being told. See 20260806680000.
      // The id the server re-price and the tax stamp resolve. Without it
      // both fall back to the pre-cutover rule and disagree with the quote.
      daycareServiceId:
        selectedService === "daycare"
          ? (daycareService?.rowId ?? null)
          : undefined,
      // Boarding's twin of the line above. `details.roomCategoryId` is the
      // field three files read and NOTHING has ever written — measured
      // 2026-09-24 — which is why every customer boarding booking failed to
      // auto-confirm silently. This is the id that actually travels.
      boardingServiceId:
        selectedService === "boarding"
          ? (boardingService?.rowId ?? null)
          : undefined,
      boardingPetServices:
        selectedService === "boarding" &&
        Object.keys(petBoardingServices).length > 1
          ? Object.fromEntries(
              Object.entries(petBoardingServices).map(([petId, s]) => [
                petId,
                s.rowId,
              ]),
            )
          : undefined,
      boardingShare:
        selectedService === "boarding" && boardingShare ? true : undefined,
      specialRequests: specialRequests.trim() || undefined,
      daycareSelectedDates:
        daycareSelectedDates.length > 0
          ? daycareSelectedDates.map(localDay)
          : undefined,
      daycareDateTimes:
        daycareDateTimes.length > 0 ? daycareDateTimes : undefined,

      kennel: kennel || undefined,
      // Daycare areas are not rooms the database holds, so every dog's area
      // travels with the booking; the first is kept as `sectionId`, which the
      // daycare board reads.
      sectionId:
        selectedService === "daycare" && roomAssignments.length > 0
          ? roomAssignments[0].roomId
          : undefined,
      daycareAreaAssignments:
        selectedService === "daycare" && roomAssignments.length > 0
          ? roomAssignments
          : undefined,
      unitAssignment:
        selectedService === "boarding" && bookedRooms.length > 0
          ? bookedRooms[0].roomId
          : undefined,
      kennelMoves: kennelMoves.length > 0 ? kennelMoves : undefined,
      // What the Feeding step books: every pet's plan as it stands. Nothing
      // where the facility has the step off for this service — and on an
      // edit, nothing sent leaves what the booking holds.
      feedingSchedule: feedingUse === "disabled" ? undefined : effectiveFeeding,
      walkSchedule: walkSchedule || undefined,
      // What the Medications step books: every saved medication and every
      // named, complete one still open there.
      medications:
        medicationUse === "disabled" ? undefined : effectiveMedications,
      // The pets answered "takes no medication" — kept so an edit does not
      // ask again; an edit sends the list even empty, to clear it.
      noMedication:
        medicationUse === "disabled" ||
        (!editMode && medicationStep.effectiveNoMedication.length === 0)
          ? undefined
          : medicationStep.effectiveNoMedication,
      vetContacts:
        medicationUse === "disabled"
          ? undefined
          : medicationStep.effectiveVetContacts,
      extraServices: billedAddOnLines.length > 0 ? billedAddOnLines : undefined,
      notificationEmail: notificationEmail,
      notificationSMS: notificationSMS,
      assignedStaff: (() => {
        if (!selectedStaffId) return undefined;
        const s = (staffProfiles ?? []).find((m) => m.id === selectedStaffId);
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
      groomingMatted:
        selectedService === "grooming" &&
        groomPets.length === 1 &&
        groomingMatted[groomPets[0]!.pet.id] === true
          ? true
          : undefined,
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
      // Only a table that still fits the pets on it.
      stationAssignment:
        selectedService === "grooming" &&
        groomingStationId &&
        stationOptions.some((station) => station.id === groomingStationId)
          ? groomingStationId
          : undefined,
      // Grooming-specific add-ons (separate catalog from facility-wide
      // ServiceAddOns which still live on `extraServices`).
      // Only ids the facility's list still has: create_booking refuses the
      // whole booking over one it does not know.
      groomingAddOns: (() => {
        if (selectedService !== "grooming") return undefined;
        const known = groomingSelectedAddOnIds.filter((id) =>
          groomingAddOnCatalog.some((a) => a.id === id),
        );
        return known.length > 0 ? known : undefined;
      })(),
      // Training (the client's mock, 2026-10-01): what was asked for — a
      // customer's request carries it to staff, who enrol from it; staff's
      // own enrolment writes the goals onto every session itself.
      ...(selectedService === "training" && trainingProgram
        ? {
            trainingProgramId: trainingProgram.id,
            trainingFormat: trainingFormat ?? undefined,
            trainingPack:
              trainingFormat === "lesson" && trainingChoice.pack > 1
                ? trainingChoice.pack
                : undefined,
            trainingSeriesId:
              trainingFormat === "group"
                ? (trainingClassId ?? undefined)
                : undefined,
            trainerId:
              trainingFormat !== "group"
                ? (trainingTime.groomerId ?? undefined)
                : undefined,
            trainingGoals:
              trainingIntake.goals.length > 0
                ? trainingIntake.goals
                : undefined,
            trainingExperience: trainingIntake.experience ?? undefined,
            trainerNotes: trainingIntake.notes.trim() || undefined,
          }
        : {}),
      // Staff's reason to go ahead without a required form, typed on
      // Confirm; the server saves it with who gave it.
      formOverrideReason:
        !isCustomerMode && formsBlocking && formsReason.trim()
          ? formsReason.trim()
          : undefined,
      includesEvaluation: includesEvaluation || undefined,
      evaluationStatus: includesEvaluation ? "pending" : undefined,
      // Booked past the evaluation rule: which pets were short of it, and why.
      evaluationOverride:
        evaluationOverridden && evaluationOverride
          ? {
              reason: evaluationOverride.reason.trim(),
              pets: evaluationIssues.map(({ pet, reason }) => ({
                id: pet.id,
                name: pet.name,
                reason,
              })),
            }
          : undefined,
      initialDeposit: (() => {
        if (!applicableDepositRule) return undefined;
        // A customer's booking arrives unpriced (enforce_booking_integrity),
        // so there is no deposit to take yet: the facility asks for it when it
        // confirms. The card this used to send was charged by nothing.
        if (isCustomerMode) return undefined;
        // Staff flow: cash or e-transfer taken now is recorded as a payment
        // by the server, in that tender.
        const amount = computeDepositAmount(
          applicableDepositRule,
          calculatePrice.total,
        );
        if (depositMode === "cash" && amount > 0) {
          return {
            amount,
            method: depositCashMethod,
            ruleLabel: applicableDepositRule.label,
          };
        }
        return undefined;
      })(),
    };

    if (isEstimateMode) {
      // In estimate mode the booking is not made: the quote is stored instead.
      await persistEstimate({
        clientRef: clientId,
        petRefs: petIdList.filter((id) => id > 0),
      });
      return false;
    }

    // ── A CUSTOMER'S CLASS IS AN ENROLMENT, AS A REQUEST (2026-10-02) ─────
    //
    // The place is held and every session is booked as a request, grouped
    // as one: the facility approves or declines the class whole, or its own
    // rule confirms it now. A lesson or a consult stays a request below — a
    // customer makes no series; staff do, when they decide it.
    if (
      isCustomerMode &&
      selectedService === "training" &&
      trainingFormat === "group" &&
      trainingClassId &&
      selectedClient
    ) {
      const intake = {
        goals: trainingIntake.goals,
        experience: trainingIntake.experience,
        notes: trainingIntake.notes.trim() || undefined,
      };
      const results = await Promise.allSettled(
        selectedPets.map((pet) =>
          enrollInSeries.mutateAsync({
            seriesId: trainingClassId,
            clientId: selectedClient.id,
            petId: pet.id,
            care: careForPet(pet.id),
            intake,
            depositCardId:
              confirmModel.depositAmount > 0 && confirmModel.depositCardId
                ? confirmModel.depositCardId
                : undefined,
          }),
        ),
      );
      const enrolled = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      const refused = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      if (refused) {
        toast.error(t("trainingEnrolFailed"), {
          description:
            refused.reason instanceof Error
              ? refused.reason.message
              : undefined,
        });
      }
      if (enrolled.length === 0) return false;
      lastSavedRef.current = enrolled[0]?.bookingRefs?.[0];
      await saveCareProfiles();
      setBookingRequested(true);
      return false;
    }

    if (isCustomerMode) {
      const requested = await saveThrough(withBookingParts(booking));
      if (!requested.ok) return false;
      await saveCareProfiles();
      await flushLabelPhotos(requested.ref);
      // Pass-redemption booking: apply one prepaid pass once the booking
      // exists, and say how many are left.
      if (passRedemption) {
        const primaryPetId = Array.isArray(petId) ? petId[0] : petId;
        const primaryPet = selectedPets.find((p) => p.id === primaryPetId);
        const result = await passRedemption.onRedeem({
          petId: primaryPetId,
          petName: primaryPet?.name,
          // Which booking spent it. Null here is why no pass has ever been
          // returnable: the ledger could not say what it was spent on.
          bookingRef: requested.ref,
        });
        if (result.ok) {
          toast.success(t("bookingConfirmed"), {
            description: t("passUsed")
              .replace("{category}", passRedemption.category)
              .replace("{left}", String(result.passesLeft)),
          });
        } else {
          // A redemption that fails after the booking is made means a visit
          // nobody has paid for, and the customer is the only person who can
          // see both facts.
          toast.error(t("passNotApplied"), {
            description: result.error ?? t("passNotAppliedHelp"),
          });
        }
      }
      setBookingRequested(true);
      return false;
    }

    // ── TRAINING IS AN ENROLMENT (the client's mock, 2026-10-01) ─────────
    //
    // A group program enrols each dog in the class picked, which books it
    // into every session still ahead (enroll_in_training_series). A lesson or
    // a consult is a series of its own — one session, the trainer and the
    // slot taken, a place for each dog — and then the same enrolment, so the
    // session is one booking per dog on the trainer's calendar. The goals
    // reach every booking the enrolment makes.
    if (selectedService === "training" && selectedClient && !editMode) {
      if (!trainingProgram) return false;
      let seriesId = trainingFormat === "group" ? trainingClassId : null;
      let madeSeries: string | null = null;
      if (trainingFormat !== "group") {
        if (!trainingTime.date || trainingTime.start === null) return false;
        const trainer = trainingTrainers.find(
          (person) => person.id === trainingTime.groomerId,
        );
        try {
          const created = await createTrainingSeries.mutateAsync({
            name: `${trainingProgram.name} · ${formatList(
              selectedPets.map((pet) => pet.name),
              locale,
            )}`,
            courseTypeName: trainingProgram.name,
            dayOfWeek: new Date(`${trainingTime.date}T12:00:00`).getDay(),
            startTime: hhmmOf(trainingTime.start),
            durationMinutes: trainingMinutes,
            startDate: trainingTime.date,
            numberOfSessions: 1,
            capacity: selectedPets.length,
            // A pass from a pack pays for this session: nothing to charge.
            totalPrice: redeemedPackageId
              ? 0
              : programPrice(
                  trainingProgram,
                  trainingFormat === "lesson" ? trainingChoice.pack : 1,
                ),
            staffId: trainer?.staffId ?? null,
            programId: trainingProgram.id,
            kind: "private",
            taxable: trainingProgram.taxable,
          });
          seriesId = created.id;
          madeSeries = created.id;
        } catch (error) {
          toast.error(t("bookingNotSaved"), {
            description: error instanceof Error ? error.message : undefined,
          });
          return false;
        }
      }
      if (!seriesId) return false;
      const series = seriesId;
      const intake = {
        goals: trainingIntake.goals,
        experience: trainingIntake.experience,
        notes: trainingIntake.notes.trim() || undefined,
      };
      const results = await Promise.allSettled(
        selectedPets.map((pet) =>
          enrollInSeries.mutateAsync({
            seriesId: series,
            clientId: selectedClient.id,
            petId: pet.id,
            // The dog's feeding and medications, for every session.
            care: careForPet(pet.id),
            intake,
          }),
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["training"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      const refused = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      const enrolled = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      if (refused.length > 0) {
        toast.error(t("trainingEnrolFailed"), {
          description:
            refused[0].reason instanceof Error
              ? refused[0].reason.message
              : undefined,
        });
      }
      if (enrolled.length === 0) {
        // Nobody is booked into the session made for them: it goes, rather
        // than sit empty on the trainer's calendar.
        if (madeSeries) {
          await cancelTrainingSeries
            .mutateAsync(madeSeries)
            .catch(() => undefined);
        }
        return false;
      }
      if (trainingFormat === "group") {
        toast.success(
          t("trainingEnrolled").replace("{count}", String(enrolled.length)),
        );
      }
      // Enrolled, but a dog's care did not reach its sessions: said, so
      // staff can add it from the sessions' bookings.
      if (enrolled.some((r) => r.careNotSaved === true)) {
        toast.warning(t("trainingCareNotSaved"));
      }
      // The done screen names the first session's booking.
      lastSavedRef.current =
        enrolled[0]?.bookingRefs?.[0] ?? enrolled[0]?.bookings[0]?.bookingRef;
      // A session a pass paid for spends it, on that booking.
      if (redeemedPackageId && selectedPets[0]) {
        redeemSelectedPackage(
          redeemedPackageId,
          selectedPets[0].id,
          lastSavedRef.current,
        );
      }
      // A pack: the first session is booked at its price; the rest are the
      // client's to book, as passes.
      if (trainingFormat === "lesson" && trainingChoice.pack > 1) {
        await grantLessonPack
          .mutateAsync({
            clientId: selectedClient.id,
            programId: trainingProgram.id,
            sessions: trainingChoice.pack,
            pets: enrolled.length,
            packageName: `${trainingProgram.name} · ${fillWords(
              t("wizSessionPack"),
              { count: trainingChoice.pack },
            )}`,
          })
          .catch(() => toast.warning(t("wizPackNotSaved")));
      }
      await saveCareProfiles();
      // A class is often prepaid: the deposit on the first session.
      await collectDeposit(lastSavedRef.current);
      return true;
    }

    const saved = await saveThrough(
      editMode ? booking : withBookingParts(booking, bookedRooms),
    );
    if (!saved.ok) return false;
    await saveCareProfiles();
    await flushLabelPhotos(editMode ? editingRef : saved.ref);

    // An EDIT creates no evaluation and redeems no pass — those describe a
    // new booking. The caller reports what the edit itself did.
    if (editMode) return true;

    // No evaluation is booked behind staff's back. This made one for every
    // pet short of a passed evaluation, dated TODAY at 09:00 whatever the
    // booking's own dates — a booking nobody asked for, often in the past.
    // Staff book the evaluation first, add it to this booking's first day
    // (the switch on Confirm), or book without it and say why.

    if (redeemedPackageId) {
      const primaryPetId = Array.isArray(petId) ? petId[0] : petId;
      redeemSelectedPackage(redeemedPackageId, primaryPetId, saved.ref);
    }

    await collectDeposit(saved.ref);
    return true;
  };

  /**
   * Staff's deposit, once the booking exists (the client's mock, 2026-10-02):
   * the client's saved card charged, or a link sent — the server works the
   * amount out again (POST /api/bookings/{ref}/deposit). Cash was recorded
   * with the booking itself. The booking stands either way; what happened
   * to the money is said.
   */
  const collectDeposit = async (ref: number | undefined) => {
    if (
      isCustomerMode ||
      isEstimateMode ||
      ref === undefined ||
      confirmModel.depositAmount <= 0 ||
      (depositMode !== "card" && depositMode !== "link")
    ) {
      return;
    }
    const channel = selectedClient?.email?.trim() ? "email" : "sms";
    const response = await fetch(`/api/bookings/${ref}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        depositMode === "card"
          ? { action: "charge", savedCardId: confirmModel.depositCardId }
          : { action: "link", channel },
      ),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as {
      charged?: boolean;
      chargedCents?: number;
      cardLabel?: string | null;
      sent?: boolean;
      to?: string;
      detail?: string;
      error?: string;
    } | null;
    if (depositMode === "card") {
      if (response?.ok && body?.charged) {
        toast.success(
          fillWords(t("wizDepositCharged"), {
            amount: formatMoney((body.chargedCents ?? 0) / 100, locale),
            card: body.cardLabel ?? t("wizCard"),
          }),
        );
      } else {
        toast.error(t("wizDepositNotCharged"), {
          description: body?.error ?? body?.detail,
        });
      }
      return;
    }
    if (response?.ok && body?.sent) {
      toast.success(fillWords(t("wizDepositLinkSent"), { to: body.to ?? "" }));
    } else {
      toast.error(t("wizDepositLinkNotSent"), {
        description: body?.error ?? body?.detail,
      });
    }
  };

  // ── ONE BOOKING PER DAY, ONE PER ROOM ─────────────────────────────────────
  //
  // The database holds one attendance and one room per booking. Staff could
  // pick three daycare days, or put two dogs in two kennels, and the form
  // saved ONE booking — the first day, the first kennel; the rest was a list
  // in `details` that no board reads. It now sends a PART per day or per room,
  // and the server writes them all or none (`create_bookings`).
  //
  // A customer's multi-day daycare request is a part per day too, tied by one
  // `bookingGroup`. It was one booking dated its FIRST day with the rest in
  // `details`, and approving it kept it that way: days two and three never
  // reached a board. Staff decide the request whole (the decision route moves
  // every day). A customer's boarding stays one booking — a part carries a
  // room, and a request must not hold a kennel; rooms are the facility's.
  const withBookingParts = (
    booking: NewBooking,
    rooms: Array<{ petId: number; roomId: string }> = roomAssignments,
  ): NewBooking => {
    if (
      isCustomerMode &&
      selectedService !== "daycare" &&
      selectedService !== "grooming"
    )
      return booking;
    const money = {
      basePrice: booking.basePrice,
      discount: booking.discount,
      totalCost: booking.totalCost,
    };
    const petIds = Array.isArray(booking.petId)
      ? booking.petId
      : [booking.petId];

    if (selectedService === "daycare" && daycareSelectedDates.length > 1) {
      return {
        ...booking,
        parts: daycareParts({
          dates: daycareSelectedDates.map(localDay),
          dateTimes: daycareDateTimes,
          petIds,
          checkInTime,
          checkOutTime,
          money,
        }),
      };
    }

    if (
      selectedService === "grooming" &&
      groomPets.length > 1 &&
      groomingTime.date &&
      groomingTime.start !== null
    ) {
      return {
        ...booking,
        parts: groomingParts({
          date: groomingTime.date,
          start: hhmmOf(groomingTime.start),
          pets: groomPets.map((g) => ({
            petId: g.pet.id,
            serviceType: g.pkg.id,
            minutes: g.minutes,
            price: g.groom.price,
            matted: groomingMatted[g.pet.id] === true,
          })),
          money,
        }),
      };
    }

    if (selectedService === "boarding" && petIds.length > 1) {
      const parts = boardingParts({
        petIds,
        roomAssignments: rooms,
        startDate: booking.startDate,
        endDate: booking.endDate,
        checkInTime: booking.checkInTime ?? checkInTime,
        checkOutTime: booking.checkOutTime ?? checkOutTime,
        money,
        serviceOf: (ids) => petBoardingServices[ids[0] ?? -1]?.rowId,
        weightOf: (roomId, ids) =>
          petBoardingServices[ids[0] ?? -1]
            ? petBoardingServices[ids[0]!]!.price
            : roomId
              ? boardingNightlyRate({
                  categories: roomCategories,
                  rooms: facilityRooms,
                  roomAssignments: [{ petId: petIds[0], roomId }],
                  locationId: currentLocationId,
                })
              : 0,
      });
      return parts.length > 1 ? { ...booking, parts } : booking;
    }

    return booking;
  };

  // A session taken from a package, once the booking exists — and, since
  // 2026-09-22, ATTRIBUTED to it. `bookingRef` is undefined when the caller
  // did not return one, which leaves the entry unlinked exactly as all 25
  // existing redemptions are; it is never guessed.
  const redeemSelectedPackage = (
    packageId: string,
    primaryPetId: number,
    bookingRef?: number,
  ) => {
    const legacyPkg = selectedClient?.packages?.find((p) => p.id === packageId);
    if (legacyPkg) {
      toast.success(t("sessionRedeemed").replace("{name}", legacyPkg.name), {
        description: t("sessionsRemaining").replace(
          "{count}",
          String(Math.max(0, legacyPkg.remainingCredits - 1)),
        ),
      });
      return;
    }
    const prepaid = customerPackagesData.find((p) => p.id === packageId);
    if (!prepaid) return;
    const primaryPet = selectedPets.find((p) => p.id === primaryPetId);
    // The pool to draw on. This modal knows the MODULE being booked but not
    // the catalogue service id, so it takes the first pool for that module
    // with passes left — not `passes[0]`, which the mock used and which
    // happily pointed at an exhausted pool.
    const pool = prepaid.passes.find(
      (pass) =>
        pass.moduleId === selectedService &&
        pass.totalPasses - pass.usedPasses > 0,
    );
    if (!pool) return;
    const packageName = prepaid.packageName;
    redeemPass(
      {
        customerPackageId: prepaid.id,
        serviceId: pool.packageId,
        serviceLabel: pool.serviceName,
        bookingId: bookingRef,
        petId: primaryPetId,
        petName: primaryPet?.name,
      },
      {
        onSuccess: ({ passesLeft }) => {
          // A $0 receipt so the books show the service was delivered against
          // a package rather than given away.
          syncRedeemedPassToQuickBooks(
            { facilityId: "11" },
            prepaid,
            { passesLeft, pool },
            { petName: primaryPet?.name },
          );
          toast.success(t("passRedeemed").replace("{name}", packageName), {
            description: t("passesRemaining").replace(
              "{count}",
              String(passesLeft),
            ),
          });
        },
        onError: (error: Error) => {
          toast.error(t("passNotRedeemed"), { description: error.message });
        },
      },
    );
  };

  // A customer's booking form keeps what they have entered as an unfinished
  // booking: on every step forward, when the page is hidden or closed, and
  // when they discard it. The facility can follow up and the resume link
  // reopens it. A booking made for the client and service marks the draft
  // recovered in the database (20260914170117). Never for staff, an edit or an
  // estimate, before anything was chosen, or once the booking has been sent.
  const draftSubmittedRef = useRef(false);
  const unfinishedWrite = (stepIndex: number = currentStep) => {
    if (
      !isCustomerMode ||
      editMode ||
      isEstimateMode ||
      !selectedClient ||
      draftSubmittedRef.current
    ) {
      return null;
    }
    if (stepIndex === 0 && !selectedService) return null;
    const stepId = displayedSteps[stepIndex]?.id;
    const step =
      stepId === "client-pet"
        ? "pet_selection"
        : stepId === "service"
          ? "service_selection"
          : stepId === "confirm"
            ? "review"
            : "date_and_details";
    // It was /^d{4}-d{2}-d{2}$/ — no backslashes, so it matched nothing and
    // every unfinished booking was saved without the dates asked for.
    const day = isoDayOrUndefined;
    const firstPet = selectedPets[0];
    return {
      clientRef: selectedClient.id,
      service: selectedService || undefined,
      step,
      requestedStart: day(startDate),
      requestedEnd: day(endDate),
      // What the booking WOULD have been worth, so the facility can see which
      // abandoned carts are worth following up. An indication only, recorded
      // at the moment they left: rates can change before they come back, and
      // nothing prices a booking from this — the wizard re-prices on resume.
      estimatedValue:
        calculatePrice.total > 0 ? calculatePrice.total : undefined,
      draft: {
        preSelectedPetId: firstPet?.id,
        preSelectedPetIds: selectedPets.map((pet) => pet.id),
        petName: firstPet?.name,
        preSelectedCheckInTime: checkInTime || undefined,
        preSelectedCheckOutTime: checkOutTime || undefined,
        preSelectedDaycareDates: daycareSelectedDates.map((d) =>
          formatDateLocal(d),
        ),
        preSelectedExtraServices: extraServices,
        preSelectedFeedingSchedule: effectiveFeeding,
        preSelectedMedications: effectiveMedications,
        preSelectedSpecialRequests: specialRequests || undefined,
        preSelectedNotificationEmail: notificationEmail,
        preSelectedNotificationSMS: notificationSMS,
        preSelectedNoMedication:
          medicationStep.effectiveNoMedication.length > 0
            ? medicationStep.effectiveNoMedication
            : undefined,
        preSelectedVetContacts:
          medicationUse === "disabled"
            ? undefined
            : medicationStep.effectiveVetContacts,
        // Which question on the Details screen they were on, by its id.
        // Saved with the step rather than instead of it: the step gets them
        // back to the screen, this to the place on it.
        preSelectedSubStepId: currentSubSteps[currentSubStep]?.id ?? 0,
      },
    } as const;
  };

  const rememberUnfinished = (stepIndex?: number) => {
    const write = unfinishedWrite(stepIndex);
    if (write) saveUnfinished.mutate(write);
  };

  // The draft as it stands, for listeners that outlive the render.
  const leaveDraftRef = useRef<ReturnType<typeof unfinishedWrite>>(null);
  useEffect(() => {
    leaveDraftRef.current = unfinishedWrite();
  });
  useEffect(() => {
    if (!isCustomerMode) return;
    const keep = () => {
      const write = leaveDraftRef.current;
      if (write) saveUnfinishedBookingOnLeave(write);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") keep();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", keep);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", keep);
    };
  }, [isCustomerMode]);

  // "Start another booking": a clean form, with what the caller decided —
  // the customer, a pet, a service it locked — put back.
  const startAnother = () => {
    resetForm();
    setCreatedBooking(null);
    if (preSelectedClientId) setSelectedClientId(preSelectedClientId);
    if (preSelectedPetIds?.length) setSelectedPetIds(preSelectedPetIds);
    else if (preSelectedPetId) setSelectedPetIds([preSelectedPetId]);
    if (lockService && preSelectedService) {
      setSelectedService(preSelectedService);
    }
    setCurrentStep(freshStepIndex);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setCreatedBooking(null);
    setPetRoomCards({});
    setPetBoardingServices({});
    setBoardingShare(false);
    setCurrentSubStepId(0);
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
    feedingStep.reset();
    setWalkSchedule("");
    setMedications([]);
    setNoMedication([]);
    setVetContacts({});
    labelPhotos.reset();
    medicationStep.reset();
    setExtraServices([]);
    setAddOnStaff({});
    setNotificationEmail(true);
    setNotificationSMS(false);
    setEvaluationChoice(null);
    setEvaluationOverride(null);
    setBookingRequested(false);
    setSelectedStaffId(null);
    setRedeemedPackageId(null);
    setSpecialRequests("");
    setGroomingIsMobile(false);
    setGroomingStylistId("");
    setGroomingAdditionalStylistIds([]);
    setGroomingStationId("");
    setGroomingStages([]);
    setGroomingManualDuration(undefined);
    setGroomingSelectedAddOnIds([]);
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
    if (!savedEstimate || estimateBusy) return;
    // Opens it to the customer, emails it to the address on file and copies
    // the link. The toast says whether the email went, and why not.
    setEstimateBusy(true);
    actOnEstimate
      .mutateAsync({
        id: savedEstimate.id,
        patch: { action: "send", via: "email" },
      })
      .then(async (sent) => {
        let copied = false;
        if (sent.estimateToken) {
          copied = await navigator.clipboard
            .writeText(customerEstimateLink(sent))
            .then(() => true)
            .catch(() => false);
        }
        const message = sendToast(estimateText, sent as SentEstimate, copied);
        toast.success(message.title, { description: message.description });
        setEstimateSent(true);
      })
      .catch((error: unknown) => {
        toast.error(t("estimateSaveFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
      })
      .finally(() => setEstimateBusy(false));
  };

  // ── The wizard's shell (the client's mock, 2026-10-01) ────────────────────
  // Four steps always: a step the caller decided (an edit's client and
  // service, a service it locked) is shown done rather than hidden, so the
  // rail and the pills read the same in every mode.
  const detailsIndex = displayedSteps.findIndex(
    (step) => step.id === "details",
  );
  const currentStepId = displayedSteps[currentStep]?.id;
  const isDone =
    createdBooking !== null || (isCustomerMode && bookingRequested);
  const serviceName = selectedService
    ? (configs[selectedService as keyof typeof configs]?.clientFacingName ??
      getModuleBySlug(selectedService)?.name ??
      selectedService)
    : "";
  const serviceKind =
    selectedService === "boarding"
      ? t("wizKindBoarding")
      : selectedService === "daycare"
        ? t("wizKindDaycare")
        : selectedService === "grooming"
          ? t("wizKindGrooming")
          : selectedService === "training"
            ? t("wizKindTraining")
            : selectedService === "evaluation"
              ? t("wizKindEvaluation")
              : t("wizKindCustom");
  const shortDay = (value: Date | string) => formatDateShort(value, locale);

  // ── CONFIRM'S FACTS (the client's mock, 2026-10-01) ────────────────────
  const confirmDaycareDays = [...daycareSelectedDates].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  const firstDaycareTimes = confirmDaycareDays[0]
    ? daycareDateTimes.find((d) => d.date === localDay(confirmDaycareDays[0]!))
    : undefined;
  const stayIn = boardingDateTimes[0]?.checkInTime || checkInTime;
  const stayOut =
    boardingDateTimes[boardingDateTimes.length - 1]?.checkOutTime ||
    checkOutTime;
  const [confirmFirstDay, confirmLastDay] =
    selectedService === "boarding"
      ? [
          boardingRangeStart ? localDay(boardingRangeStart) : null,
          boardingRangeEnd ? localDay(boardingRangeEnd) : null,
        ]
      : selectedService === "daycare"
        ? [
            confirmDaycareDays[0] ? localDay(confirmDaycareDays[0]) : null,
            confirmDaycareDays.length > 0
              ? localDay(confirmDaycareDays[confirmDaycareDays.length - 1]!)
              : null,
          ]
        : [startDate || null, endDate || startDate || null];
  const staffName = (() => {
    const id =
      selectedService === "grooming" && groomingStylistId
        ? groomingStylistId
        : selectedStaffId;
    const member = (staffProfiles ?? []).find((s) => s.id === id);
    return member ? `${member.firstName} ${member.lastName}`.trim() : null;
  })();
  const roomNameOf = (roomId: string | undefined) =>
    roomId
      ? (facilityRooms.find((room) => room.id === roomId)?.name ??
        roomCategories.find((category) => category.id === roomId)?.name ??
        null)
      : null;
  const feedingSummary =
    feedingUse === "disabled" && effectiveFeeding.length === 0
      ? null
      : effectiveFeeding
          .map((item) => {
            const meals = describeFeeding(item, {
              t,
              locale,
              stay: careStay,
              settings: feedingStep.settings,
              service: selectedService,
            }).meals;
            const pet = selectedPets.find((p) => p.id === item.petId);
            return selectedPets.length > 1 && pet
              ? `${pet.name}: ${meals}`
              : meals;
          })
          .join(" · ");
  const medicationSummary =
    medicationUse === "disabled" && effectiveMedications.length === 0
      ? null
      : [
          ...effectiveMedications.map((med) => med.name).filter(Boolean),
          ...medicationStep.effectiveNoMedication.map((petId) =>
            fillWords(t("medsTakesNone"), {
              pet: selectedPets.find((p) => p.id === petId)?.name ?? "",
            }),
          ),
          // The vet, as the booking keeps it — "Vet: Plateau Vet · 514-555-
          // 0100", with the pet's name when there are several.
          ...Object.entries(medicationStep.effectiveVetContacts ?? {}).flatMap(
            ([petId, vet]) => {
              const contact = [vet.clinic, vet.phone]
                .filter(Boolean)
                .join(" · ");
              if (!contact) return [];
              const name =
                selectedPets.find((p) => String(p.id) === petId)?.name ?? "";
              return [
                fillWords(t("medsVetLine"), {
                  vet:
                    selectedPets.length > 1 && name
                      ? `${contact} (${name})`
                      : contact,
                }),
              ];
            },
          ),
        ].join(" · ");
  const groomingMinutes = (() => {
    const a = /^(\d{1,2}):(\d{2})/.exec(checkInTime);
    const b = /^(\d{1,2}):(\d{2})/.exec(checkOutTime);
    if (!a || !b) return undefined;
    const diff =
      Number(b[1]) * 60 + Number(b[2]) - (Number(a[1]) * 60 + Number(a[2]));
    return diff > 0 ? diff : undefined;
  })();
  const groomName =
    groomingMenu.find((pkg) => pkg.id === serviceType)?.name ?? null;
  const confirmModel = useConfirmModel({
    t,
    locale,
    isCustomer: isCustomerMode,
    isEstimate: isEstimateMode,
    onConfirm: displayedSteps[currentStep]?.id === "confirm",
    service: selectedService,
    kindLabel: serviceKind,
    pets: selectedPets,
    client: selectedClient,
    facilityName,
    hero:
      selectedService === "boarding" && boardingRangeStart && boardingRangeEnd
        ? {
            stay: {
              start: boardingRangeStart,
              end: boardingRangeEnd,
              checkIn: stayIn,
              checkOut: stayOut,
              nights: boardingNights,
            },
          }
        : selectedService === "daycare"
          ? {
              days: {
                count: confirmDaycareDays.length,
                checkIn: firstDaycareTimes?.checkInTime || checkInTime,
                checkOut: firstDaycareTimes?.checkOutTime || checkOutTime,
              },
            }
          : selectedService === "training" &&
              trainingFormat === "group" &&
              trainingClass &&
              trainingFirstSession
            ? {
                // "Puppy Foundations · starts Sat, Oct 17 · Saturdays · 10:00 AM"
                course: {
                  name: trainingClass.name,
                  start: trainingFirstSession,
                  when: classWhen(trainingClass, t, locale),
                },
              }
            : startDate
              ? {
                  slot: {
                    date: startDate,
                    start: checkInTime,
                    end: checkOutTime || undefined,
                    // "· with Maya R." — the groomer or the trainer the slot
                    // was taken with.
                    staffName:
                      (selectedService === "grooming"
                        ? groomingTime.groomerName
                        : selectedService === "training"
                          ? trainingTime.groomerName
                          : staffName) ?? undefined,
                  },
                }
              : {},
    details: {
      start:
        selectedService === "boarding" ? boardingRangeStart : startDate || null,
      end: selectedService === "boarding" ? boardingRangeEnd : endDate || null,
      checkIn:
        selectedService === "boarding"
          ? stayIn
          : selectedService === "daycare"
            ? firstDaycareTimes?.checkInTime || checkInTime
            : checkInTime,
      checkOut:
        selectedService === "boarding"
          ? stayOut
          : selectedService === "daycare"
            ? firstDaycareTimes?.checkOutTime || checkOutTime
            : checkOutTime,
      nights: boardingNights,
      rooms: selectedPets.map((pet) => ({
        pet: pet.name,
        room:
          petBoardingServices[pet.id]?.name ??
          roomNameOf(
            roomAssignments.find((assignment) => assignment.petId === pet.id)
              ?.roomId,
          ),
      })),
      sharing: boardingShare,
      days: confirmDaycareDays,
      dayType: daycareService?.name ?? null,
      grooms: selectedPets.map((pet) => ({
        pet: pet.name,
        groom:
          groomPets.find((g) => g.pet.id === pet.id)?.pkg.name ?? groomName,
      })),
      minutes:
        selectedService === "grooming" && groomTotalMinutes > 0
          ? groomTotalMinutes
          : groomingMinutes,
      staffName:
        selectedService === "grooming"
          ? (groomingTime.groomerName ?? staffName)
          : staffName,
      program: trainingProgram?.name ?? null,
      pack: trainingFormat === "lesson" ? trainingChoice.pack : 1,
      trainingClass:
        trainingFormat === "group"
          ? trainingClass && trainingFirstSession
            ? {
                name: trainingClass.name,
                when: classWhen(trainingClass, t, locale),
                start: trainingFirstSession,
              }
            : null
          : undefined,
      trainingSlot:
        trainingTime.date && trainingTime.start !== null
          ? {
              date: trainingTime.date,
              start: hhmmOf(trainingTime.start),
              staffName: trainingTime.groomerName,
            }
          : null,
      goals: selectedService === "training" ? trainingIntake.goals : undefined,
      experience:
        selectedService !== "training"
          ? undefined
          : trainingIntake.experience === "none"
            ? t("wizExperienceNone")
            : trainingIntake.experience === "some"
              ? t("wizExperienceSome")
              : trainingIntake.experience === "lots"
                ? t("wizExperienceLots")
                : null,
      addOnCount:
        billedAddOnLines.length +
        (selectedService === "grooming" ? groomingSelectedAddOnIds.length : 0),
      feeding: feedingSummary,
      medication: medicationSummary,
    },
    firstDay: confirmFirstDay,
    lastDay: confirmLastDay,
    onEdit: (edit) => {
      setCurrentStep(stepIndexOf(edit.step));
      setCurrentSubStepId(edit.subStepId ?? 0);
    },
    waivers: { applicable: waivers.applicable, pending: waivers.pending },
    forms:
      formsMissing.length > 0
        ? {
            isCustomer: isCustomerMode,
            missing: formsMissing,
            clientFirstName: (selectedClient?.name ?? "").split(/\s+/)[0] ?? "",
            petRefOf: (name) =>
              selectedPets.find((pet) => pet.name === name)?.id,
            service: selectedService,
            reason: formsReason,
            onReason: setFormsReason,
            minReason: FORMS_MIN_REASON,
            onRecheck: () => void missingForms.refetch(),
            rechecking: missingForms.isFetching,
          }
        : undefined,
    links: isCustomerMode
      ? undefined
      : {
          sent: signingLinks,
          email: selectedClient?.email?.trim() || null,
          phone: selectedClient?.phone?.trim() || null,
          send: (via) => void sendSigningLink(via),
          sending: signingLinkSending,
        },
    evaluation:
      !isCustomerMode && evaluationIssues.length > 0
        ? {
            petNames: evaluationIssues.map((issue) => issue.pet.name),
            price: evaluationConfig.price,
            minutes: evaluationConfig.schedule.defaultDurationMinutes ?? 0,
            on: includesEvaluation,
            onChange: (on) => setEvaluationChoice(on),
            reason:
              evaluationOverride?.key === evaluationIssueKey
                ? evaluationOverride.reason
                : "",
            onReason: (reason) =>
              setEvaluationOverride({ key: evaluationIssueKey, reason }),
            minReason: EVALUATION_OVERRIDE_MIN_REASON,
            onBookEvaluation: () => {
              handleServiceChange("evaluation");
              setServiceType("");
              setCurrentStep(stepIndexOf("details"));
              setCurrentSubStepId(0);
            },
          }
        : undefined,
    // A training pass pays for one session: not a class, not a new pack.
    passes:
      !isCustomerMode &&
      !isEstimateMode &&
      applicablePackages.length > 0 &&
      !(
        selectedService === "training" &&
        (trainingFormat === "group" || trainingChoice.pack > 1)
      )
        ? {
            packages: applicablePackages,
            applied: redeemedPackageId,
            onApply: setRedeemedPackageId,
          }
        : undefined,
    depositRule: applicableDepositRule,
    depositMode,
    setDepositMode,
    cashMethod: depositCashMethod,
    setCashMethod: setDepositCashMethod,
    quote: calculatePrice,
    notify: {
      email: notificationEmail,
      onEmail: setNotificationEmail,
      sms: notificationSMS,
      onSms: setNotificationSMS,
    },
    specialRequests,
    setSpecialRequests,
    onEditClient: () => {
      setCurrentStep(0);
      setCurrentSubStepId(0);
    },
    passRedemption: !!passRedemption,
  });
  const confirmProps = confirmModel.props;
  // Staff: who the stay or day is assigned to, and each add-on that needs
  // somebody — kept from the old Confirm, under the details.
  const staffOption = (s: NonNullable<typeof staffProfiles>[number]) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`.trim(),
  });
  const attendantModule =
    selectedService === "daycare" || selectedService === "boarding"
      ? (selectedService as ServiceModule)
      : null;
  const addOnsByRef = bookableLookup(storedAddOns);
  // Daycare's play area (the client's mock has no screen for it): assigned
  // as a customer's is, and changed here — for every pet at once, so an area
  // one of them does not fit, or a full one, is listed but not choosable.
  const playAreaOptions =
    selectedService === "daycare"
      ? playAreaChoices({
          pets: effectiveSelectedPets,
          days: daycareSelectedDates.map(localDay),
          sections: daycareSections,
          bookings: knownBookings,
          text: {
            spotsLeft: (left, capacity) =>
              fillWords(t("wizSpotsLeft"), { left, capacity }),
            full: t("wizFull"),
            notFor: (pet) => fillWords(t("wizRoomNotFor"), { pet }),
          },
        })
      : [];
  const confirmStaffRows = isCustomerMode ? null : (
    <StaffAssignments
      station={
        selectedService === "grooming" && stationOptions.length > 0
          ? {
              staff: stationOptions,
              value: stationOptions.some((o) => o.id === groomingStationId)
                ? groomingStationId
                : null,
              onChange: (id) => setGroomingStationId(id ?? ""),
            }
          : undefined
      }
      playArea={
        playAreaOptions.length > 0
          ? {
              staff: playAreaOptions,
              value: roomAssignments[0]?.roomId ?? null,
              onChange: (sectionId: string | null) =>
                setRoomAssignments(
                  sectionId
                    ? effectiveSelectedPets.map((pet) => ({
                        petId: pet.id,
                        roomId: sectionId,
                      }))
                    : [],
                ),
            }
          : undefined
      }
      booking={
        attendantModule
          ? {
              role: t("roleAttendant"),
              staff: (staffProfiles ?? [])
                .filter(
                  (s) =>
                    (s.status === "active" &&
                      s.serviceAssignments.includes(attendantModule)) ||
                    s.id === selectedStaffId,
                )
                .map(staffOption),
              value: selectedStaffId,
              onChange: setSelectedStaffId,
            }
          : undefined
      }
      addOns={billedAddOnLines
        .filter((line) => addOnsByRef.get(line.serviceId)?.requiresStaff)
        .map((line) => {
          const pet = selectedPets.find((p) => p.id === line.petId);
          const name = addOnsByRef.get(line.serviceId)?.name ?? line.serviceId;
          return {
            key: `${line.serviceId}::${line.petId}`,
            name: pet ? `${name} · ${pet.name}` : name,
            staff: (staffProfiles ?? [])
              .filter((s) => s.status === "active" || s.id === line.staffId)
              .map(staffOption),
            value: line.staffId ?? null,
            onChange: (staffId: string | null) =>
              setAddOnStaff((chosen) => ({
                ...chosen,
                [`${line.serviceId}::${line.petId}`]: staffId,
              })),
          };
        })}
    />
  );
  const requiresApproval = confirmModel.requiresApproval;
  const depositAmount = confirmModel.depositAmount;
  const estimate = confirmModel.estimate;
  const detailsSummary = (() => {
    if (selectedService === "boarding" && boardingRangeStart) {
      return [
        shortDay(boardingRangeStart),
        boardingRangeEnd ? shortDay(boardingRangeEnd) : "…",
      ].join(" → ");
    }
    if (selectedService === "daycare" && daycareSelectedDates.length > 0) {
      const first = [...daycareSelectedDates].sort(
        (a, b) => a.getTime() - b.getTime(),
      )[0];
      return fillWords(
        t(
          isPluralOne(daycareSelectedDates.length, locale)
            ? "wizSumDaysFromOne"
            : "wizSumDaysFromOther",
        ),
        { count: daycareSelectedDates.length, date: shortDay(first) },
      );
    }
    // A class: "Starts Oct 17" (the client's mock).
    if (selectedService === "training" && trainingFormat === "group") {
      return trainingFirstSession
        ? fillWords(t("wizSumStarts"), { date: shortDay(trainingFirstSession) })
        : t("wizSumServiceInfo");
    }
    if (startDate) {
      return [
        shortDay(`${startDate}T12:00:00`),
        formatTimeOfDay(checkInTime, locale),
      ].join(" · ");
    }
    return t("wizSumServiceInfo");
  })();
  // The rail's compact list, as the mock writes it: "Bubu, Mango".
  const petNames = selectedPets.map((pet) => pet.name).join(", ");
  const stepSummary: Record<string, string> = {
    "client-pet": isCustomerMode
      ? selectedPets.length > 0
        ? petNames
        : t("wizSumChoosePets")
      : selectedClient
        ? selectedPets.length > 0
          ? t("clientAndPets")
              .replace("{client}", selectedClient.name)
              .replace("{pets}", petNames)
          : selectedClient.name
        : isEstimateMode && isGuestEstimate
          ? guestName.trim() || t("newInquiry")
          : t("wizSumSearchClient"),
    service: selectedService ? serviceName : t("wizSumSelectService"),
    details: detailsSummary,
    confirm: isEstimateMode
      ? t("reviewAndSend")
      : isCustomerMode
        ? t("wizSumReviewRequest")
        : t("reviewAndCreate"),
  };
  const stepTitle = (id: string) =>
    id === "client-pet"
      ? isCustomerMode
        ? t("wizStepPets")
        : t("stepClientPet")
      : id === "service"
        ? t("service")
        : id === "details"
          ? t("details")
          : t("stepConfirm");
  const stepViews: WizardStepView[] = displayedSteps.map((step, index) => {
    const state =
      isDone || index < currentStep
        ? "done"
        : index === currentStep
          ? "current"
          : "todo";
    const reachable =
      state === "done" && !isDone && !submitting && !lockedStepIds.has(step.id);
    return {
      id: step.id as WizardStepView["id"],
      title: stepTitle(step.id),
      summary: stepSummary[step.id] ?? "",
      state,
      onSelect: reachable
        ? () => {
            setCurrentStep(index);
            setCurrentSubStepId(0);
          }
        : undefined,
    };
  });
  const subStepViews: WizardSubStepView[] = currentSubSteps.map(
    (sub, subIndex) => {
      const state =
        isDone ||
        currentStep > detailsIndex ||
        (currentStep === detailsIndex && subIndex < currentSubStep)
          ? "done"
          : currentStep === detailsIndex && subIndex === currentSubStep
            ? "current"
            : "todo";
      return {
        id: sub.id,
        title: t(sub.titleKey),
        state,
        onSelect:
          state === "done" && !isDone && !submitting
            ? () => {
                setCurrentStep(detailsIndex);
                setCurrentSubStepId(sub.id);
              }
            : undefined,
      };
    },
  );
  const railSubSteps =
    selectedService && currentStep >= detailsIndex && !isDone
      ? subStepViews
      : [];
  const chipSubSteps =
    selectedService && currentStep === detailsIndex && !isDone
      ? subStepViews
      : [];
  const percent = wizardProgress({
    stepIndex: currentStep,
    subIndex: currentSubStep,
    subCount: currentSubSteps.length,
    done: isDone,
  });
  const percentLabel = formatPercent(percent, locale);
  const stepLabel = t("stepOf")
    .replace("{step}", String(Math.min(currentStep + 1, displayedSteps.length)))
    .replace("{total}", String(displayedSteps.length));
  const wizardTitle = editMode
    ? t("editBooking")
    : isCustomerMode
      ? t("wizBookAVisit")
      : selectedService && currentStep >= detailsIndex
        ? serviceName
        : isEstimateMode
          ? t("newEstimate")
          : t("newBooking");
  const wizardSubtitle = editMode
    ? t("updateDatesHelp")
    : isCustomerMode
      ? (customerFacility?.name ?? "")
      : t("wizCreateForClient");
  const header = isDone
    ? {
        title: isCustomerMode ? t("wizRequestSent") : t("wizBookingCreated"),
        subtitle: null,
      }
    : currentStepId === "client-pet"
      ? {
          title: stepTitle("client-pet"),
          subtitle: isCustomerMode ? t("wizHeadPets") : t("wizHeadClient"),
        }
      : currentStepId === "service"
        ? { title: t("service"), subtitle: t("wizHeadService") }
        : currentStepId === "details"
          ? {
              title: t("details"),
              subtitle:
                currentSubSteps.length > 0
                  ? t(currentSubSteps[currentSubStep]?.titleKey ?? "")
                  : null,
            }
          : {
              title: t("stepConfirm"),
              subtitle: isCustomerMode
                ? t("wizHeadConfirmCustomer")
                : t("wizHeadConfirm"),
            };
  const headerChip =
    selectedService && currentStep >= detailsIndex && !isDone
      ? fillWords(t("wizKindService"), {
          kind: serviceKind,
          service: serviceName,
        })
      : null;
  const atLastStep = currentStep === displayedSteps.length - 1;
  const canGoBack =
    (currentStepId === "details" && currentSubStep > 0) ||
    previousOpenStep(currentStep) >= 0;
  const nextLabel = isDone
    ? t("wizStartAnother")
    : !atLastStep
      ? t("next")
      : t(
          confirmButtonKey({
            isCustomer: isCustomerMode,
            editMode,
            estimateMode: isEstimateMode,
            missingAgreements: waivers.pending.length,
            requiresApproval: requiresApproval && !passRedemption,
            hasDeposit: depositAmount > 0,
          }),
        );
  const nextDisabled = isDone
    ? false
    : !atLastStep
      ? !canProceed
      : !canProceed || submitting || estimateBusy || !!calculatePrice.rateGap;
  const onFooterNext = () => {
    if (isDone) {
      startAnother();
      return;
    }
    if (!atLastStep) {
      handleNext();
      return;
    }
    void handleComplete();
  };
  // The same Total Confirm shows: the subtotal and the facility's taxes.
  const footerEstimate =
    !isDone && currentStepId !== "confirm" && calculatePrice.subtotal > 0
      ? formatMoney(estimate.total, locale)
      : null;
  const hasProgress = currentStep > 0 || !!selectedService;
  const requestClose = () => {
    if (isDone) {
      resetForm();
      setCreatedBooking(null);
      onOpenChange(false);
      return;
    }
    if (hasProgress) setShowCancelConfirm(true);
    else onOpenChange(false);
  };
  const doneTitle = isCustomerMode
    ? passRedemption
      ? t("wizYoureBooked")
      : t("wizRequestSentTitle")
    : createdBooking?.ref
      ? fillWords(t("wizBookingNumberCreated"), { ref: createdBooking.ref })
      : t("wizBookingCreated");
  // What was created, as it was when Create was pressed.
  const doneStatusValue = createdBooking?.status ?? confirmModel.status;
  const doneStatus = <StatusChip status={doneStatusValue} />;
  const doneMissing = createdBooking?.missing ?? 0;
  const doneText = isCustomerMode
    ? passRedemption
      ? t("confirmedWithPass").replace("{service}", passRedemption.serviceLabel)
      : requiresApproval
        ? bookingRequestMessage ||
          bookingFlow.bookingRequestConfirmationMessage ||
          fillWords(t("wizDoneReview"), { hours: confirmModel.approvalHours })
        : t("wizDoneBooked")
    : doneMissing > 0
      ? `${fillWords(
          t(
            isPluralOne(doneMissing, locale)
              ? "wizDoneMissingOne"
              : "wizDoneMissingOther",
          ),
          {
            name: (selectedClient?.name ?? "").split(/\s+/)[0] ?? "",
            count: doneMissing,
          },
        )}${t(createdBooking?.linkSent ? "wizDoneLinkSent" : "wizDoneSendFromPage")}`
      : `${t("wizAllInOrder")} ${
          createdBooking?.emailed && selectedClient?.email
            ? fillWords(t("wizDoneEmailTo"), { email: selectedClient.email })
            : t("wizDoneNoConfirmation")
        }`;

  return (
    <>
      <WizardDialog
        open={open && !creatingClient}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
        title={wizardTitle}
      >
        <WizardRail
          title={wizardTitle}
          subtitle={wizardSubtitle}
          stepLabel={stepLabel}
          percent={percent}
          percentLabel={percentLabel}
          steps={stepViews}
          subSteps={railSubSteps}
          navLabel={t("wizSteps")}
        >
          {/* The client's design shows the stay and its doses BESIDE the
            Medications step; here it sits in the rail, under the steps,
            while that step is open (2026-10-01). Below 1024px, where the
            rail is hidden, the step shows it itself. */}
          {!isDone &&
          currentStepId === "details" &&
          currentSubSteps[currentSubStep]?.id === MEDICATION_SUB_STEP_ID ? (
            <MedicationSchedulePreview step={medicationStep} className="mt-4" />
          ) : null}
          {!isDone &&
          currentStepId === "details" &&
          currentSubSteps[currentSubStep]?.id === FEEDING_SUB_STEP_ID ? (
            <FeedingSchedulePreview step={feedingStep} className="mt-4" />
          ) : null}
        </WizardRail>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WizardTopBar
            title={wizardTitle}
            stepLabel={stepLabel}
            percent={percent}
            percentLabel={percentLabel}
            steps={stepViews}
            subSteps={chipSubSteps}
            onClose={requestClose}
            closeLabel={t("wizClose")}
            stepsLabel={t("wizSteps")}
            subStepsLabel={t("wizDetailsScreens")}
          />
          <WizardHeader
            title={header.title}
            subtitle={header.subtitle}
            chip={headerChip}
          />
          <div
            ref={scrollAreaRef}
            data-wizard-body
            className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6 sm:px-6 sm:pt-[22px] sm:pb-7 lg:px-8 lg:pt-[26px] lg:pb-8"
          >
            {isDone ? (
              <SuccessScreen
                attention={doneStatusValue === "pending_agreements"}
                title={doneTitle}
                status={doneStatus}
                text={doneText}
                summary={confirmModel.heroLine || detailsSummary}
              />
            ) : (
              <>
                {displayedSteps[currentStep]?.id === "service" && (
                  <ServiceStep
                    isCustomerMode={isCustomerMode}
                    selectedService={selectedService}
                    onSelect={(service) => {
                      // What the old cards did, in their order: the service,
                      // then no service type and the first Details screen.
                      handleServiceChange(service);
                      setServiceType("");
                      goToSubStep(0);
                    }}
                    configs={configs}
                    bookingFlow={bookingFlow}
                    selectedPets={selectedPets}
                    clientRef={selectedClient?.id}
                  />
                )}
                {displayedSteps[currentStep]?.id === "client-pet" && (
                  <ClientPetStep
                    isCustomerMode={isCustomerMode}
                    clients={clients}
                    selectedClient={selectedClient}
                    selectedPetIds={selectedPetIds}
                    setSelectedPetIds={setSelectedPetIds}
                    onPickClient={(clientId, petIds) => {
                      setSelectedClientId(clientId);
                      setSelectedPetIds(petIds);
                      setSearchQuery("");
                    }}
                    onClearClient={
                      preSelectedClientId
                        ? undefined
                        : () => {
                            // The mock's Change client: back to the search with
                            // nobody, no pets and no service chosen.
                            setSelectedClientId(null);
                            setSelectedPetIds([]);
                            if (!(lockService && preSelectedService)) {
                              handleServiceChange("");
                            }
                          }
                    }
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onNewClient={
                      mayCreateClients
                        ? () => setCreatingClient(true)
                        : undefined
                    }
                    selectedService={selectedService}
                    preSelectedProgramId={preSelectedProgramId}
                    configs={configs}
                    guest={
                      isEstimateMode && !preSelectedClientId
                        ? {
                            isGuest: isGuestEstimate,
                            setIsGuest: setIsGuestEstimate,
                            name: guestName,
                            setName: setGuestName,
                            email: guestEmail,
                            setEmail: setGuestEmail,
                            phone: guestPhone,
                            setPhone: setGuestPhone,
                            petNames: guestPetNames,
                            setPetNames: setGuestPetNamesSynced,
                            petWeights: guestPetWeights,
                            setPetWeights: setGuestPetWeights,
                          }
                        : undefined
                    }
                  />
                )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "boarding" &&
                  (currentSubSteps[currentSubStep]?.id ?? 0) === 0 && (
                    <BoardingSchedule
                      isCustomer={isCustomerMode}
                      start={boardingRangeStart}
                      end={boardingRangeEnd}
                      checkIn={checkInTime}
                      checkOut={checkOutTime}
                      onRange={(start, end, times) => {
                        setBoardingRangeStart(start);
                        setBoardingRangeEnd(end);
                        setStartDate(start ? localDay(start) : "");
                        setEndDate(end ? localDay(end) : "");
                        if (start && end && times) {
                          setCheckInTime(times.checkIn);
                          setCheckOutTime(times.checkOut);
                          setBoardingDateTimes(
                            stayDays(start, end).map((day) => ({
                              date: localDay(day),
                              checkInTime: times.checkIn,
                              checkOutTime: times.checkOut,
                            })),
                          );
                        } else {
                          setBoardingDateTimes([]);
                        }
                      }}
                      onTimes={(checkIn, checkOut) => {
                        setCheckInTime(checkIn);
                        setCheckOutTime(checkOut);
                        setBoardingDateTimes(
                          boardingDateTimes.map((day) => ({
                            ...day,
                            checkInTime: checkIn,
                            checkOutTime: checkOut,
                          })),
                        );
                      }}
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "daycare" &&
                  (currentSubSteps[currentSubStep]?.id ?? 0) === 0 && (
                    <DaycareSchedule
                      isCustomer={isCustomerMode}
                      pets={effectiveSelectedPets}
                      days={daycareSelectedDates}
                      onDays={setDaycareSelectedDates}
                      dateTimes={daycareDateTimes}
                      onDateTimes={setDaycareDateTimes}
                      service={daycareService}
                      onService={setDaycareService}
                      part={daycarePart}
                      onPart={setDaycarePart}
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "boarding" &&
                  currentSubSteps[currentSubStep]?.id === 1 && (
                    <RoomTypeStep
                      isCustomer={isCustomerMode}
                      pets={effectiveSelectedPets}
                      start={boardingRangeStart}
                      end={boardingRangeEnd}
                      value={{
                        petServices: petRoomCards,
                        petBoardingServices,
                        roomAssignments,
                        share: boardingShare,
                        boardingService,
                      }}
                      onChange={(next) => {
                        setPetRoomCards(next.petServices);
                        setPetBoardingServices(next.petBoardingServices);
                        setRoomAssignments(next.roomAssignments);
                        setBoardingShare(next.share);
                        setBoardingService(next.boardingService);
                      }}
                      kennelChanges={editMode ? undefined : kennelChanges}
                      setKennelChanges={
                        editMode || isCustomerMode
                          ? undefined
                          : setKennelChanges
                      }
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  (selectedService === "boarding" ||
                    selectedService === "daycare") &&
                  currentSubSteps[currentSubStep]?.id === 2 && (
                    <AddOnsStep
                      careType={selectedService}
                      serviceRowId={
                        selectedService === "boarding"
                          ? (boardingService?.rowId ?? null)
                          : (daycareService?.rowId ?? null)
                      }
                      kindLabel={serviceKind}
                      pets={effectiveSelectedPets}
                      value={extraServices}
                      onChange={setExtraServices}
                      included={
                        selectedService === "boarding" && boardingService
                          ? {
                              lines: boardingDefaultLines,
                              serviceName: boardingService.name,
                            }
                          : undefined
                      }
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "grooming" &&
                  currentSubSteps[currentSubStep]?.id === 1 && (
                    <AddOnsStep
                      careType="grooming"
                      serviceRowId={(() => {
                        // The add-on rules of ONE package when every pet has
                        // it; any groom's otherwise.
                        const ids = new Set(
                          effectiveSelectedPets.map((pet) =>
                            packageIdFor(pet.id),
                          ),
                        );
                        const only = ids.size === 1 ? [...ids][0] : undefined;
                        return (
                          groomingMenu.find((p) => p.id === only)?.rowId ?? null
                        );
                      })()}
                      kindLabel={serviceKind}
                      pets={effectiveSelectedPets}
                      value={extraServices}
                      onChange={setExtraServices}
                      maxQuantity={1}
                      hint={t("wizAddOnsHintGroom")}
                      included={
                        groomingDefaultLines.length > 0
                          ? {
                              lines: groomingDefaultLines,
                              serviceName:
                                groomingMenu.find((p) => p.id === serviceType)
                                  ?.name ?? serviceKind,
                            }
                          : undefined
                      }
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "grooming" &&
                  currentSubSteps[currentSubStep]?.id === 2 && (
                    <StaffTimeStep
                      role="groomer"
                      isCustomer={isCustomerMode}
                      pets={effectiveSelectedPets}
                      petMinutes={groomPets.map((g) => g.minutes)}
                      packageIds={[...new Set(groomPets.map((g) => g.pkg.id))]}
                      matted={groomPets.some(
                        (g) => groomingMatted[g.pet.id] === true,
                      )}
                      noticeHours={
                        isCustomerMode
                          ? Math.max(
                              0,
                              ...groomPets.map(
                                (g) => g.pkg.minBookingNoticeHours ?? 0,
                              ),
                            )
                          : undefined
                      }
                      value={groomingTime}
                      onChange={(next) => {
                        setGroomingTime({
                          ...next,
                          minutes: groomTotalMinutes,
                          groomerName: next.groomerName ?? null,
                        });
                        setGroomingStylistId(next.groomerId ?? "");
                        if (next.date && next.start !== null) {
                          setStartDate(next.date);
                          setEndDate(next.date);
                          setCheckInTime(hhmmOf(next.start));
                          setCheckOutTime(
                            hhmmOf(next.start + groomTotalMinutes),
                          );
                        }
                      }}
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "grooming" &&
                  currentSubSteps[currentSubStep]?.id === 0 && (
                    <PackageStep
                      isCustomer={isCustomerMode}
                      onlyApplicable={
                        bookingFlow.onlyShowApplicableServices === true
                      }
                      pets={effectiveSelectedPets}
                      value={Object.fromEntries(
                        effectiveSelectedPets.flatMap((pet) => {
                          const id = packageIdFor(pet.id);
                          return id ? [[pet.id, id]] : [];
                        }),
                      )}
                      onChange={(next) => {
                        setGroomingPetPackages(next);
                        const first = effectiveSelectedPets[0]?.id;
                        setServiceType(
                          (first !== undefined ? next[first] : undefined) ??
                            Object.values(next)[0] ??
                            "",
                        );
                      }}
                      matted={groomingMatted}
                      onMattedChange={setGroomingMatted}
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "training" &&
                  currentSubSteps[currentSubStep]?.id === 0 && (
                    <ProgramStep
                      isCustomer={isCustomerMode}
                      value={trainingChoice}
                      onChange={(next) => {
                        // Another program: its class or slot is not this one's.
                        if (next.programId !== trainingChoice.programId) {
                          setTrainingClassId(null);
                          setTrainingTime({
                            date: null,
                            start: null,
                            groomerId: null,
                            minutes: 0,
                            groomerName: null,
                          });
                        }
                        setTrainingChoice(next);
                      }}
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "training" &&
                  currentSubSteps[currentSubStep]?.id === 1 &&
                  (trainingFormat === "group" ? (
                    <ClassStep
                      classes={trainingClasses}
                      isPending={offeredClasses.isPending}
                      value={trainingClassId}
                      needed={effectiveSelectedPets.length}
                      weeks={trainingProgram?.sessions}
                      maxDogs={trainingProgram?.maxGroupSize}
                      onChange={(classId) => {
                        setTrainingClassId(classId);
                        const picked = trainingClasses.find(
                          (c) => c.id === classId,
                        );
                        if (!picked) return;
                        const first =
                          classSessionDates(picked)[0] ?? picked.startDate;
                        const from = minutesOf(picked.startTime) ?? 0;
                        setStartDate(first);
                        setEndDate(first);
                        setCheckInTime(hhmmOf(from));
                        setCheckOutTime(hhmmOf(from + picked.durationMinutes));
                      }}
                    />
                  ) : (
                    <StaffTimeStep
                      role="trainer"
                      isCustomer={isCustomerMode}
                      pets={effectiveSelectedPets}
                      petMinutes={[trainingMinutes]}
                      packageIds={NO_PACKAGE_IDS}
                      matted={false}
                      value={trainingTime}
                      onChange={(next) => {
                        setTrainingTime({
                          ...next,
                          minutes: trainingMinutes,
                          groomerName: next.groomerName ?? null,
                        });
                        if (next.date && next.start !== null) {
                          setStartDate(next.date);
                          setEndDate(next.date);
                          setCheckInTime(hhmmOf(next.start));
                          setCheckOutTime(hhmmOf(next.start + trainingMinutes));
                        }
                      }}
                    />
                  ))}
                {displayedSteps[currentStep]?.id === "details" &&
                  selectedService === "training" &&
                  currentSubSteps[currentSubStep]?.id === 2 && (
                    <GoalsStep
                      goalOptions={trainingGoalOptions}
                      value={trainingIntake}
                      onChange={setTrainingIntake}
                    />
                  )}
                {displayedSteps[currentStep]?.id === "details" &&
                  !(
                    (selectedService === "boarding" ||
                      selectedService === "daycare") &&
                    [0, 1, 2].includes(currentSubSteps[currentSubStep]?.id ?? 0)
                  ) &&
                  !(
                    (selectedService === "grooming" ||
                      selectedService === "training") &&
                    [0, 1, 2].includes(currentSubSteps[currentSubStep]?.id ?? 0)
                  ) && (
                    <DetailsStep
                      selectedService={selectedService}
                      currentSubStep={currentSubSteps[currentSubStep]?.id ?? 0}
                      isSubStepComplete={isSubStepComplete}
                      startDate={startDate}
                      setStartDate={setStartDate}
                      endDate={endDate}
                      setEndDate={setEndDate}
                      checkInTime={checkInTime}
                      setCheckInTime={setCheckInTime}
                      checkOutTime={checkOutTime}
                      setCheckOutTime={setCheckOutTime}
                      extraServices={extraServices}
                      setExtraServices={setExtraServices}
                      selectedPets={effectiveSelectedPets}
                      feedingStep={feedingStep}
                      medicationStep={medicationStep}
                      careStepReady={currentSubSteps
                        .filter((sub) => sub.id < FEEDING_SUB_STEP_ID)
                        .every((sub) => isSubStepComplete(sub.id))}
                      careStepLabel={t("stepOf")
                        .replace("{step}", String(currentStep + 1))
                        .replace("{total}", String(displayedSteps.length))}
                    />
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
                            {t("estimateSent")}
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
                            {t("estimateSentTo").replace(
                              "{who}",
                              (isGuestEstimate
                                ? guestEmail || guestName || t("inquiryContact")
                                : selectedClient?.name) ?? "",
                            )}
                          </p>
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                            <p className="text-xl font-bold text-emerald-800 tabular-nums">
                              {formatMoney(calculatePrice.total, locale)}
                            </p>
                            <p className="text-xs text-emerald-600">
                              {t("estimatedTotal")}
                            </p>
                          </div>
                          <Button
                            className="mt-6"
                            onClick={() => {
                              resetForm();
                              onOpenChange(false);
                            }}
                          >
                            {t("done")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex size-16 items-center justify-center rounded-full bg-blue-100">
                            <Check className="size-7 text-blue-600" />
                          </div>
                          <h3 className="mt-4 text-lg font-bold text-slate-800">
                            {t("estimateCreated")}
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
                            {t("estimateFor").replace(
                              "{name}",
                              (isGuestEstimate
                                ? guestName || guestEmail || t("newInquiry")
                                : selectedClient?.name) ?? "",
                            )}{" "}
                            —{" "}
                            {isGuestEstimate
                              ? guestPetSummary.length > 0
                                ? guestPetSummary.join(", ")
                                : t("noPetsAdded")
                              : selectedPets.map((pet) => pet.name).join(", ")}
                          </p>
                          <div className="mt-4 rounded-xl border bg-slate-50 px-5 py-3">
                            <p className="text-xl font-bold tabular-nums">
                              {formatMoney(calculatePrice.total, locale)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {selectedService} · {serviceType || t("standard")}
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
                              {t("saveAsDraft")}
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
                              {t("sendToCustomer")}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                {displayedSteps[currentStep]?.id === "confirm" &&
                  !(isEstimateMode && estimateCreated) &&
                  !(isCustomerMode && bookingRequested) && (
                    <ConfirmStep
                      {...confirmProps}
                      staffRows={confirmStaffRows}
                    />
                  )}
              </>
            )}
          </div>

          {showCancelConfirm ? (
            <DiscardPanel
              title={
                editMode
                  ? t("discardChangesTitle")
                  : t("discardTitle").replace(
                      "{what}",
                      isEstimateMode ? t("estimate") : t("booking"),
                    )
              }
              help={editMode ? t("discardHelp") : t("discardAllHelp")}
              keepLabel={t("continueEditing")}
              discardLabel={
                editMode
                  ? t("discardChanges")
                  : t("discardWhat").replace(
                      "{what}",
                      isEstimateMode ? t("estimateBare") : t("bookingBare"),
                    )
              }
              onKeep={() => setShowCancelConfirm(false)}
              onDiscard={() => {
                setShowCancelConfirm(false);
                rememberUnfinished();
                resetForm();
                onOpenChange(false);
              }}
            />
          ) : isEstimateMode && estimateCreated ? null : (
            <WizardFooter
              notices={
                isDone ? null : (
                  <>
                    {!hoursConfigured && (
                      <div className="flex items-start gap-2 px-4 pt-4">
                        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-warning text-sm font-semibold">
                            {t("noHoursTitle")}
                          </p>
                          <p className="text-warning text-[13.5px]">
                            {t("noHoursBody")}
                          </p>
                        </div>
                      </div>
                    )}
                    {calculatePrice.rateGap && (
                      <div className="flex items-start gap-2 px-4 pt-4">
                        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-warning text-sm font-semibold">
                            {t("noRateTitle")}
                          </p>
                          <p className="text-warning text-[13.5px]">
                            {rateGapMessage(calculatePrice.rateGap, t)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )
              }
              showPrevious={!isDone}
              previousDisabled={!canGoBack}
              onPrevious={handlePrevious}
              previousLabel={t("previous")}
              backLabel={t("wizBack")}
              estimate={footerEstimate}
              estimateLabel={t("wizEstimate")}
              showCancel={!isDone}
              onCancel={requestClose}
              cancelLabel={t("cancel")}
              nextLabel={nextLabel}
              onNext={onFooterNext}
              nextDisabled={nextDisabled}
              busy={atLastStep && (submitting || estimateBusy)}
            />
          )}
        </div>
      </WizardDialog>
      {creatingClient ? (
        <CreateClientModal
          open
          onOpenChange={(next) => {
            // Cancelled: the booking comes back exactly as it was.
            if (!next) setCreatingClient(false);
          }}
          facilityName={facilityName}
          onSave={(newClient) =>
            createClient.mutate(newClient, {
              onSuccess: ({ client, failedPets }) => {
                // The booking comes back for the client just made, every
                // one of their pets chosen.
                setAddedClients((prev) => [...prev, client]);
                setSelectedClientId(client.id);
                setSelectedPetIds(client.pets.map((pet) => pet.id));
                setSearchQuery("");
                setCreatingClient(false);
                if (failedPets.length > 0) {
                  toast.warning(
                    fillWords(t("wizClientPetsNotSaved"), {
                      name: client.name,
                      pets: failedPets.join(", "),
                    }),
                  );
                } else {
                  toast.success(
                    fillWords(t("wizNewClientSaved"), { name: client.name }),
                  );
                }
              },
              onError: (error) => {
                toast.error(t("wizClientNotSaved"), {
                  description:
                    error instanceof Error ? error.message : undefined,
                });
              },
            })
          }
        />
      ) : null}
    </>
  );
}
