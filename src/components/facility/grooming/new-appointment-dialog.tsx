"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGroomingScheduling } from "@/hooks/use-grooming-scheduling";
import {
  computeDayDensity,
  computeSlotGrid,
  getAppointmentsForStylistOnDate,
  getStylistWorkWindow,
  appointmentAddressSeed,
  type DayDensity,
} from "@/lib/grooming-scheduling";
import { pseudoCoord } from "@/lib/route-planning";
import { DensityCalendar } from "./density-calendar";
import { SlotGrid } from "./slot-grid";
import { MobileRouteMapPreview } from "./mobile-route-map-preview";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  groomingQueries,
  resolveEffectivePricing,
  resolveAutoAddOns,
  isPackageEligibleForPet,
  getLastGroomingPackageForPet,
  getLastGroomerForPet,
  stylistMeetsSkillRequirement,
  type EffectivePricing,
} from "@/lib/api/grooming";
import { saveCustomPetPricingOverride } from "@/lib/grooming-pet-pricing-store";
import { clientQueries } from "@/lib/api/client";
import {
  ClientPetPicker,
  type ClientPetPickerValue,
} from "./client-pet-picker";
import { cn } from "@/lib/utils";
import { DollarSign, Plus, Scissors, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { isStationEligibleForPetSize } from "@/components/rooms/GroomingStationsClient";
import type { GroomingStationPetSize } from "@/types/rooms";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import {
  checkPostalCodeOnDay,
  formatDaysOfWeek,
  checkCoverageForStaffOnDate,
  computeBookingTotals,
  findZipTaxRate,
} from "@/lib/service-areas";
import {
  Truck,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Calendar as CalendarIcon,
  PawPrint,
  Users,
  Trash2,
} from "lucide-react";
import type { AdditionalPet, AppointmentStage } from "@/types/grooming";
import type { PetSize } from "@/types/base";
import { GROOMING_ADD_ONS as ADD_ONS } from "@/data/grooming-add-ons";

// ─── Form state ───────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  /** Existing client id (when the picker matched a known client). */
  clientId: undefined as number | undefined,
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  /** Pet id (when prefilled from a past appointment or the client profile).
   *  Required for pet-specific pricing lookup; undefined for fresh entries. */
  petId: undefined as number | undefined,
  petName: "",
  petBreed: "",
  petSize: "",
  coatType: "",
  /** Pet age in months — drives age-group pricing on the selected service. */
  petAgeMonths: undefined as number | undefined,
  packageId: "",
  stylistId: "",
  stationId: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  specialInstructions: "",
  notes: "",
  // Mobile grooming
  isMobile: false,
  clientAddress: "",
  clientPostalCode: "",
  coverageOverride: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h3>
  );
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultStartTime?: string;
  defaultStylistId?: string;
  /**
   * When set, the dialog opens pre-filled with this appointment's client +
   * pet + service + add-ons. Used by Book Again on a past appointment so
   * staff just pick the new date/time.
   */
  prefillFrom?: import("@/types/grooming").GroomingAppointment;
  /**
   * When set, the dialog opens pre-filled with a client's contact info and
   * (optionally) a specific pet from that client's roster. Used by the
   * client-profile entry point — staff still pick the service, groomer,
   * and date/time.
   */
  prefillClient?: {
    /** Existing client id — drops the picker straight into "selected" mode. */
    clientId?: number;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    pet?: {
      id: number;
      name: string;
      breed: string;
      size: string;
      coatType: string;
      /** Pet age in months (used by age-group pricing). */
      ageMonths?: number;
    };
  };
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultStartTime,
  defaultStylistId,
  prefillFrom,
  prefillClient,
}: NewAppointmentDialogProps) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, date: defaultDate ?? "" });
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  // Manual price/duration overrides for Step 2 — set when staff edits the
  // inline Price or Duration input. Cleared whenever the pet/package combo
  // changes so a fresh resolved price shows for the new combo.
  const [manualPriceOverride, setManualPriceOverride] = useState<
    number | undefined
  >(undefined);
  const [manualDurationOverride, setManualDurationOverride] = useState<
    number | undefined
  >(undefined);
  // When true, the manual price/duration is written back to the pet on
  // submit so future bookings for the same pet/package pre-fill with it.
  const [savePriceToPet, setSavePriceToPet] = useState(false);
  const queryClient = useQueryClient();
  // Ids the system auto-attached from the package's default-add-on rules.
  // Tracked separately so we know which add-ons to clear when the package
  // changes (manual selections survive package switches).
  const [autoAttachedIds, setAutoAttachedIds] = useState<string[]>([]);
  const [additionalPets, setAdditionalPets] = useState<AdditionalPet[]>([]);
  const [additionalStylistIds, setAdditionalStylistIds] = useState<string[]>([]);
  // Split-service stages — when empty, the appointment runs as one block.
  const [stages, setStages] = useState<AppointmentStage[]>([]);

  // Loaded eagerly so the seed effect can map prefillFrom (Book Again) to a
  // known client via phone match — keeps the picker in "selected" mode instead
  // of dropping the user into the new-client form with prefilled drafts.
  const { data: clients = [] } = useQuery(clientQueries.all());

  // Re-seed the form each time the dialog opens so quick-book picks up the
  // groomer column and time slot that was clicked.
  useEffect(() => {
    if (!open) return;
    const startTime = defaultStartTime ?? DEFAULT_FORM.startTime;
    if (prefillFrom) {
      // Book Again — carry over client, pet, service, add-ons. Date defaults
      // to today unless the caller passed an explicit date (the typical
      // workflow is "rebook this regular for next week" so today is the
      // starting point staff change). Groomer + slot stay overridable.
      const bookAgainDate =
        defaultDate ?? new Date().toISOString().split("T")[0];
      // Try to recover the client id from the phone number so the picker
      // opens in "selected" mode and the pet gallery shows other pets in
      // the same household.
      const normPhone = (prefillFrom.ownerPhone ?? "").replace(/\D/g, "");
      const matchedClient =
        normPhone.length > 0
          ? clients.find(
              (c) => (c.phone ?? "").replace(/\D/g, "") === normPhone,
            )
          : undefined;
      setForm({
        ...DEFAULT_FORM,
        clientId: matchedClient?.id,
        ownerName: prefillFrom.ownerName,
        ownerPhone: prefillFrom.ownerPhone,
        ownerEmail: prefillFrom.ownerEmail,
        petId: prefillFrom.petId,
        petName: prefillFrom.petName,
        petBreed: prefillFrom.petBreed,
        petSize: prefillFrom.petSize,
        coatType: prefillFrom.coatType,
        packageId: prefillFrom.packageId,
        stylistId: defaultStylistId ?? prefillFrom.stylistId,
        date: bookAgainDate,
        startTime,
        endTime: addMinutesToTime(startTime, 60),
        specialInstructions: prefillFrom.specialInstructions,
      });
      // Add-on ids are stored on the appointment as names; resolve via the
      // catalogue so the checkbox state hydrates correctly.
      const resolved: string[] = [];
      for (const name of prefillFrom.addOns) {
        const ao = ADD_ONS.find((a) => a.name === name);
        if (ao) resolved.push(ao.id);
      }
      setSelectedAddOns(resolved);
    } else if (prefillClient) {
      // Client-profile entry — owner contact + optionally a specific pet.
      // Service / groomer / date / time remain for staff to pick.
      setForm({
        ...DEFAULT_FORM,
        clientId: prefillClient.clientId,
        ownerName: prefillClient.ownerName,
        ownerPhone: prefillClient.ownerPhone,
        ownerEmail: prefillClient.ownerEmail,
        petId: prefillClient.pet?.id,
        petName: prefillClient.pet?.name ?? "",
        petBreed: prefillClient.pet?.breed ?? "",
        petSize: prefillClient.pet?.size ?? "",
        coatType: prefillClient.pet?.coatType ?? "",
        petAgeMonths: prefillClient.pet?.ageMonths,
        date: defaultDate ?? "",
        startTime,
        endTime: addMinutesToTime(startTime, 60),
        stylistId: defaultStylistId ?? "",
      });
      setSelectedAddOns([]);
    } else {
      setForm({
        ...DEFAULT_FORM,
        date: defaultDate ?? "",
        startTime,
        endTime: addMinutesToTime(startTime, 60),
        stylistId: defaultStylistId ?? "",
      });
      setSelectedAddOns([]);
    }
    setAdditionalPets([]);
    setAdditionalStylistIds([]);
    setStages([]);
    setAutoAttachedIds([]);
  }, [
    open,
    defaultDate,
    defaultStartTime,
    defaultStylistId,
    prefillFrom,
    prefillClient,
    clients,
  ]);

  const { data: packages = [] } = useQuery(groomingQueries.packages());
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const { data: allPetPricing = [] } = useQuery(
    groomingQueries.allPetServicePricing(),
  );
  // Pet history powers "last booked service" and "last groomer" suggestions
  // (Step 2 — items #3 and #9). Pet preferences power the preferred-groomer
  // suggestion.
  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const { data: petPreferences = [] } = useQuery(
    groomingQueries.petPreferences(),
  );
  const { data: availability = [] } = useQuery(
    groomingQueries.allStylistAvailability(),
  );
  const {
    smartSchedulingEnabled,
    slotGranularityMin,
    defaultBufferMin,
  } = useGroomingScheduling();
  const { stations } = useGroomingStations();
  const {
    enabled: mobileEnabled,
    serviceAreas,
    certainAreaEnabled,
    staffSchedules,
    travelZones,
    zipTaxRates,
  } = useMobileGrooming();

  // Map the selected grooming stylist to their underlying staff id so the
  // Certain Area for Certain Days schedule (keyed by staffId) can be looked up.
  const selectedStaffId = useMemo(() => {
    if (!form.stylistId) return undefined;
    return stylistsData.find((s) => s.id === form.stylistId)?.staffId;
  }, [stylistsData, form.stylistId]);

  // Coverage check — when Certain Area for Certain Days is on and a stylist
  // is selected, restrict coverage to that staff's scheduled area for the
  // date. Otherwise fall back to the legacy area-level day check.
  const coverageResult = useMemo(() => {
    if (!form.isMobile) return null;
    if (!form.clientPostalCode.trim()) return null;
    if (!form.date) return null;
    const d = new Date(form.date + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    return checkCoverageForStaffOnDate({
      postalCode: form.clientPostalCode,
      dateStr: form.date,
      staffId: selectedStaffId,
      certainAreaEnabled,
      schedules: staffSchedules,
      areas: serviceAreas,
    });
  }, [
    form.isMobile,
    form.clientPostalCode,
    form.date,
    serviceAreas,
    certainAreaEnabled,
    staffSchedules,
    selectedStaffId,
  ]);

  // Suggest the next date within 14 days that covers this postal code.
  // When CAfCD is on and a stylist is selected, the suggestion is for that
  // same stylist — otherwise it falls back to any covering area.
  const suggestedDate = useMemo(() => {
    if (!coverageResult || coverageResult.status !== "not-covered") return null;
    if (!form.clientPostalCode.trim() || !form.date) return null;
    const start = new Date(form.date + "T00:00:00");
    for (let i = 1; i <= 14; i++) {
      const probe = new Date(start);
      probe.setDate(probe.getDate() + i);
      const probeStr = probe.toISOString().split("T")[0];
      const r =
        certainAreaEnabled && selectedStaffId
          ? checkCoverageForStaffOnDate({
              postalCode: form.clientPostalCode,
              dateStr: probeStr,
              staffId: selectedStaffId,
              certainAreaEnabled,
              schedules: staffSchedules,
              areas: serviceAreas,
            })
          : checkPostalCodeOnDay(
              serviceAreas,
              form.clientPostalCode,
              probe.getDay(),
            );
      if (r.status === "covered") {
        return {
          dateStr: probeStr,
          areaName: r.area.name,
        };
      }
    }
    return null;
  }, [
    coverageResult,
    form.clientPostalCode,
    form.date,
    serviceAreas,
    certainAreaEnabled,
    selectedStaffId,
    staffSchedules,
  ]);

  const activeStylists = useMemo(
    () => stylistsData.filter((s) => s.status === "active"),
    [stylistsData],
  );

  const selectedPackage = packages.find((p) => p.id === form.packageId);

  // Clear any manual price/duration override when the pet/package combo
  // changes so the next combo starts from the resolver-computed defaults.
  useEffect(() => {
    setManualPriceOverride(undefined);
    setManualDurationOverride(undefined);
    setSavePriceToPet(false);
  }, [form.packageId, form.petId]);

  // ─── Step 2 derived data: eligibility, last booked, last groomer, preferred ─

  // Last completed grooming for this pet — used to float the same service to
  // the top of the dropdown and to suggest the same groomer.
  const lastBookedPackageIdForPet = useMemo(
    () =>
      form.petId !== undefined
        ? getLastGroomingPackageForPet(form.petId, allAppointments)
        : undefined,
    [form.petId, allAppointments],
  );
  const lastGroomerIdForPet = useMemo(
    () =>
      form.petId !== undefined
        ? getLastGroomerForPet(form.petId, allAppointments)
        : undefined,
    [form.petId, allAppointments],
  );
  const preferredStylistIdForPet = useMemo(() => {
    if (form.petId === undefined) return undefined;
    return petPreferences.find((p) => p.petId === form.petId)
      ?.preferredStylistId;
  }, [form.petId, petPreferences]);

  // Packages eligible for the current pet attributes (size / coat / breed).
  // When attributes are unset we don't filter — staff often picks the service
  // before fully describing the pet.
  const eligiblePackages = useMemo(() => {
    const active = packages.filter((p) => p.isActive);
    return active.filter((p) =>
      isPackageEligibleForPet(p, {
        petSize: form.petSize
          ? (form.petSize as PetSize)
          : undefined,
        coatType: form.coatType
          ? (form.coatType as import("@/types/grooming").CoatType)
          : undefined,
        breed: form.petBreed || undefined,
      }),
    );
  }, [packages, form.petSize, form.coatType, form.petBreed]);

  // Eligible packages with the pet's last-booked service surfaced to the top.
  const orderedPackages = useMemo(() => {
    if (!lastBookedPackageIdForPet) return eligiblePackages;
    const idx = eligiblePackages.findIndex(
      (p) => p.id === lastBookedPackageIdForPet,
    );
    if (idx <= 0) return eligiblePackages;
    const copy = eligiblePackages.slice();
    const [last] = copy.splice(idx, 1);
    copy.unshift(last);
    return copy;
  }, [eligiblePackages, lastBookedPackageIdForPet]);

  // The count we removed from the active list — used to show a hint when
  // some services are hidden because the pet doesn't match.
  const filteredOutCount =
    packages.filter((p) => p.isActive).length - eligiblePackages.length;

  // Default Add-Ons — when the service or pet attributes change, evaluate the
  // package's default-add-on rules against the pet and auto-attach matching
  // add-ons. Manual selections survive: only previously auto-attached ids are
  // swapped out, not user-chosen ones.
  useEffect(() => {
    if (!selectedPackage) {
      if (autoAttachedIds.length > 0) {
        setSelectedAddOns((prev) =>
          prev.filter((id) => !autoAttachedIds.includes(id)),
        );
        setAutoAttachedIds([]);
      }
      return;
    }
    const matches = resolveAutoAddOns(selectedPackage, {
      petSize: form.petSize ? (form.petSize as PetSize) : undefined,
      petWeight: prefillFrom?.petWeight,
      coatType: form.coatType
        ? (form.coatType as import("@/types/grooming").CoatType)
        : undefined,
      breed: form.petBreed || undefined,
    });
    // Skip when nothing changed — guards against the React Compiler complaining
    // about set-state in render and avoids redundant re-renders.
    const sameSet =
      matches.length === autoAttachedIds.length &&
      matches.every((id) => autoAttachedIds.includes(id));
    if (sameSet) return;

    setSelectedAddOns((prev) => {
      const withoutOldAutos = prev.filter(
        (id) => !autoAttachedIds.includes(id),
      );
      const merged = new Set(withoutOldAutos);
      for (const id of matches) merged.add(id);
      return Array.from(merged);
    });
    setAutoAttachedIds(matches);
  }, [
    selectedPackage,
    form.petSize,
    form.coatType,
    form.petBreed,
    prefillFrom?.petWeight,
    autoAttachedIds,
  ]);

  const addOnTotal = useMemo(
    () =>
      selectedAddOns.reduce((sum, id) => {
        const ao = ADD_ONS.find((a) => a.id === id);
        return sum + (ao?.price ?? 0);
      }, 0),
    [selectedAddOns],
  );

  // Filter stylists by package restrictions. Three-layer check:
  //   1. If the package pins an explicit `assignedStylistIds` list, that wins.
  //   2. Otherwise, fall back to the stylist's `qualifiedPackageIds` — if the
  //      stylist has any qualifications configured, they must include this
  //      package. Stylists with no qualifications listed are treated as
  //      qualified for everything (no restriction set).
  //   3. The package's `requiredSkillLevel` (when set) gates by capability,
  //      so a "Senior groom" only offers Senior/Master stylists.
  const eligibleStylists = useMemo(() => {
    if (!selectedPackage) return activeStylists;
    const { assignedStylistIds } = selectedPackage;
    const byAssignment =
      assignedStylistIds && assignedStylistIds.length > 0
        ? activeStylists.filter((s) => assignedStylistIds.includes(s.id))
        : activeStylists.filter((s) => {
            const q = s.qualifiedPackageIds;
            if (!q || q.length === 0) return true;
            return q.includes(selectedPackage.id);
          });
    return byAssignment.filter((s) =>
      stylistMeetsSkillRequirement(s, selectedPackage),
    );
  }, [activeStylists, selectedPackage]);

  // Stylists ordered by suggestion priority for this pet:
  //   1. Last groomer who worked with this pet (if still eligible).
  //   2. Pet's preferred stylist (if set and still eligible).
  //   3. Everyone else, sorted alphabetically.
  // The list still contains the same set as `eligibleStylists`; only the
  // order changes. Badges in the dropdown surface why an option ranks high.
  const orderedStylists = useMemo(() => {
    if (eligibleStylists.length === 0) return eligibleStylists;
    const byId = new Map(eligibleStylists.map((s) => [s.id, s]));
    const ordered: typeof eligibleStylists = [];
    const seen = new Set<string>();
    if (lastGroomerIdForPet && byId.has(lastGroomerIdForPet)) {
      ordered.push(byId.get(lastGroomerIdForPet)!);
      seen.add(lastGroomerIdForPet);
    }
    if (
      preferredStylistIdForPet &&
      byId.has(preferredStylistIdForPet) &&
      !seen.has(preferredStylistIdForPet)
    ) {
      ordered.push(byId.get(preferredStylistIdForPet)!);
      seen.add(preferredStylistIdForPet);
    }
    const rest = eligibleStylists
      .filter((s) => !seen.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...ordered, ...rest];
  }, [eligibleStylists, lastGroomerIdForPet, preferredStylistIdForPet]);

  // Stations eligible for the pet size — empty allowedPetSizes = multi-purpose,
  // so it matches every size. Out-of-service or inactive stations are excluded.
  const eligibleStations = useMemo(() => {
    if (!form.petSize) return [];
    const size = form.petSize as GroomingStationPetSize;
    return stations.filter(
      (s) =>
        s.active &&
        s.status !== "out-of-service" &&
        isStationEligibleForPetSize(s, size),
    );
  }, [stations, form.petSize]);

  // If the currently selected station no longer fits the pet size, clear it
  // so we never submit a Great Dane to a small-dog table.
  useEffect(() => {
    if (!form.stationId) return;
    const stillEligible = eligibleStations.some((s) => s.id === form.stationId);
    if (!stillEligible) {
      setForm((prev) => ({ ...prev, stationId: "" }));
    }
  }, [form.stationId, eligibleStations]);

  // ─── Step 3 derived data: density calendar + slot grid + map preview ─

  // Service duration used to size each slot block. The manual override
  // (Step 2) wins so a user-edited duration is reflected in the slot grid.
  const serviceDurationForSlots =
    manualDurationOverride ?? selectedPackage?.duration ?? 0;

  // Synthetic address seed for the new appointment, used to compute drive
  // times from prior stops. Matches the route planner's hashing scheme so
  // pins line up between this dialog and the route planner page.
  const newAddressSeed = useMemo(() => {
    if (form.petName && form.ownerName) {
      return `${form.petName}-${form.ownerName}-${form.ownerPhone}`;
    }
    return form.clientPostalCode || form.clientAddress || "";
  }, [
    form.petName,
    form.ownerName,
    form.ownerPhone,
    form.clientPostalCode,
    form.clientAddress,
  ]);

  // Density function the calendar uses to render the green/amber/red dot
  // for each day. Returns `null` for days the stylist doesn't work.
  const getDensityForDate = useCallback(
    (dateStr: string): DayDensity | null => {
      if (!form.stylistId || serviceDurationForSlots <= 0) return null;
      const d = new Date(dateStr + "T00:00:00");
      if (Number.isNaN(d.getTime())) return null;
      const workWindow = getStylistWorkWindow(
        form.stylistId,
        d.getDay(),
        availability,
      );
      return computeDayDensity({
        stylistId: form.stylistId,
        dateStr,
        workWindow,
        existingAppointments: allAppointments,
        serviceDurationMin: serviceDurationForSlots,
        slotGranularityMin,
        smartSchedulingEnabled,
        bufferMin: defaultBufferMin,
      });
    },
    [
      form.stylistId,
      serviceDurationForSlots,
      availability,
      allAppointments,
      slotGranularityMin,
      smartSchedulingEnabled,
      defaultBufferMin,
    ],
  );

  // Slot grid for the currently-selected date + groomer.
  const slotGrid = useMemo(() => {
    if (!form.stylistId || !form.date || serviceDurationForSlots <= 0)
      return [];
    const d = new Date(form.date + "T00:00:00");
    if (Number.isNaN(d.getTime())) return [];
    const workWindow = getStylistWorkWindow(
      form.stylistId,
      d.getDay(),
      availability,
    );
    if (!workWindow) return [];
    return computeSlotGrid({
      stylistId: form.stylistId,
      dateStr: form.date,
      serviceDurationMin: serviceDurationForSlots,
      slotGranularityMin,
      workWindow,
      existingAppointments: allAppointments,
      smartSchedulingEnabled,
      bufferMin: defaultBufferMin,
      mobile: form.isMobile
        ? {
            newAddressSeed,
            facilityBaseSeed: "facility-home-base",
          }
        : undefined,
    });
  }, [
    form.stylistId,
    form.date,
    form.isMobile,
    serviceDurationForSlots,
    availability,
    allAppointments,
    slotGranularityMin,
    smartSchedulingEnabled,
    defaultBufferMin,
    newAddressSeed,
  ]);

  // Route preview data — the stylist's confirmed stops on the chosen date,
  // plus the tentative new stop hashed from `newAddressSeed`.
  const routePreviewData = useMemo(() => {
    if (!form.isMobile || !form.stylistId || !form.date) return null;
    const confirmed = getAppointmentsForStylistOnDate(
      form.stylistId,
      form.date,
      allAppointments,
    );
    const stops = confirmed.map((a, idx) => ({
      coord: pseudoCoord(appointmentAddressSeed(a)),
      label: idx + 1,
      petName: a.petName,
    }));
    const tentativeStop = newAddressSeed
      ? {
          coord: pseudoCoord(newAddressSeed),
          label: stops.length + 1,
          petName: form.petName || "New appointment",
        }
      : undefined;
    return { stops, tentativeStop };
  }, [
    form.isMobile,
    form.stylistId,
    form.date,
    form.petName,
    allAppointments,
    newAddressSeed,
  ]);

  // Auto-suggest a groomer once a service is picked (Step 2 — item #9).
  //   - Empty stylist → pick the top of orderedStylists (last → preferred →
  //     first available).
  //   - Currently-picked stylist no longer eligible (skill gate / package
  //     restriction changed) → swap to the top of the list.
  // No-op once the user has explicitly chosen an eligible groomer.
  useEffect(() => {
    if (!selectedPackage) return;
    if (orderedStylists.length === 0) return;
    if (form.stylistId) {
      const stillEligible = orderedStylists.some(
        (s) => s.id === form.stylistId,
      );
      if (!stillEligible) {
        setForm((prev) => ({ ...prev, stylistId: orderedStylists[0].id }));
      }
      return;
    }
    setForm((prev) => ({ ...prev, stylistId: orderedStylists[0].id }));
  }, [selectedPackage, orderedStylists, form.stylistId]);

  function update<K extends keyof typeof DEFAULT_FORM>(
    field: K,
    value: (typeof DEFAULT_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
    // Once the user explicitly toggles an auto-attached add-on, treat it as
    // a manual selection so the auto-attach effect doesn't re-add it when
    // the pet attributes change.
    setAutoAttachedIds((prev) => prev.filter((a) => a !== id));
  }

  function handleClose() {
    setForm({ ...DEFAULT_FORM, date: defaultDate ?? "" });
    setSelectedAddOns([]);
    setAutoAttachedIds([]);
    setManualPriceOverride(undefined);
    setManualDurationOverride(undefined);
    setSavePriceToPet(false);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (
      !form.ownerName ||
      !form.petName ||
      !form.petSize ||
      !form.packageId ||
      !form.stylistId ||
      !form.date
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.isMobile) {
      if (!form.clientAddress.trim() || !form.clientPostalCode.trim()) {
        toast.error("Address and postal code are required for mobile visits");
        return;
      }
      if (
        coverageResult?.status === "not-covered" &&
        !form.coverageOverride
      ) {
        toast.error(
          "Address is outside the service area for this date. Check the override box to book anyway.",
        );
        return;
      }
    }
    // Validate any added pets have a name + service
    const incompletePet = additionalPets.find(
      (p) => !p.petName.trim() || !p.packageId,
    );
    if (incompletePet) {
      toast.error(
        "Each additional pet needs a name and a service selected",
      );
      return;
    }
    // Persist the manual price/duration as a saved override on this pet so
    // future bookings of the same pet+package start from this number. Only
    // fires when staff explicitly opted in and there's a known pet to attach
    // it to (drafted-only pets get a negative id from the picker — skip
    // those since they can't be looked up next time).
    if (
      savePriceToPet &&
      form.petId !== undefined &&
      form.petId > 0 &&
      form.packageId
    ) {
      const finalPrice = manualPriceOverride;
      const finalDuration = manualDurationOverride;
      if (finalPrice !== undefined || finalDuration !== undefined) {
        saveCustomPetPricingOverride({
          petId: form.petId,
          packageId: form.packageId,
          customPrice: finalPrice,
          customDurationMin: finalDuration,
          note: `Saved from booking on ${form.date || "today"}.`,
          createdBy: "facility-staff",
        });
        // Invalidate so the next read (next dialog open) sees the new row.
        void queryClient.invalidateQueries({
          queryKey: ["pet-service-pricing"],
        });
      }
    }

    const petCount = 1 + additionalPets.length;
    const staffCount = 1 + additionalStylistIds.length;
    const labelParts: string[] = [];
    if (petCount > 1) labelParts.push(`${petCount} pets`);
    if (staffCount > 1) labelParts.push(`${staffCount} groomers`);
    const suffix = labelParts.length > 0 ? ` · ${labelParts.join(" · ")}` : "";
    toast.success(`Appointment booked for ${form.petName}${suffix}`);
    handleClose();
  }

  const showAddOns = !!selectedPackage;

  // Per-pet line items for the invoice. The primary pet anchors the booking;
  // each additional pet uses its own package + size pricing.
  //
  // Price resolution honors the priority order: pet-custom > stylist-specific
  // > service default. See {@link resolveEffectivePricing}.
  type PetLine = {
    petName: string;
    packageName: string;
    petSize: string;
    durationMin: number;
    price: number;
    pricing: EffectivePricing;
  };
  const petLines: PetLine[] = useMemo(() => {
    const lines: PetLine[] = [];
    if (selectedPackage && form.petName && form.petSize) {
      const pricing = resolveEffectivePricing({
        petId: form.petId,
        petSize: form.petSize as PetSize,
        petBreed: form.petBreed || undefined,
        petCoatType: form.coatType
          ? (form.coatType as import("@/types/grooming").CoatType)
          : undefined,
        petAgeMonths: form.petAgeMonths,
        stylistId: form.stylistId || undefined,
        package: selectedPackage,
        petPricingOverrides: allPetPricing,
      });
      // Manual overrides win over the resolver — staff has the final say.
      const finalPrice = manualPriceOverride ?? pricing.price;
      const finalDuration = manualDurationOverride ?? pricing.durationMin;
      lines.push({
        petName: form.petName,
        packageName: selectedPackage.name,
        petSize: form.petSize,
        durationMin: finalDuration,
        price: finalPrice,
        pricing,
      });
    }
    for (const ap of additionalPets) {
      const pkg = packages.find((pk) => pk.id === ap.packageId);
      if (!pkg || !ap.petName.trim()) continue;
      const pricing = resolveEffectivePricing({
        petSize: ap.petSize as PetSize,
        stylistId: form.stylistId || undefined,
        package: pkg,
        petPricingOverrides: allPetPricing,
      });
      lines.push({
        petName: ap.petName,
        packageName: pkg.name,
        petSize: ap.petSize,
        durationMin: pricing.durationMin,
        price: pricing.price,
        pricing,
      });
    }
    return lines;
  }, [
    selectedPackage,
    form.petId,
    form.petName,
    form.petSize,
    form.petBreed,
    form.coatType,
    form.petAgeMonths,
    form.stylistId,
    additionalPets,
    packages,
    allPetPricing,
    manualPriceOverride,
    manualDurationOverride,
  ]);

  const lineItemsSubtotal = petLines.reduce((s, l) => s + l.price, 0);
  const grandTotal = lineItemsSubtotal + addOnTotal;
  const totalDurationMin = petLines.reduce(
    (s, l) => s + l.durationMin,
    0,
  );
  const showPriceSummary = petLines.length > 0;

  // Facility base postal — used to compute the travel zone for mobile.
  // Real impl would read this from the facility config; the demo uses a
  // downtown Montréal anchor so the H-prefix zones get exercised.
  const FACILITY_BASE_POSTAL = "H2X 1Z4";

  // Manual tax override — when staff need to apply a rate the system
  // doesn't have on file. null = use the auto-resolved ZIP tax. The state
  // lives outside the form blob so it doesn't survive a reopen.
  const [taxOverrideEnabled, setTaxOverrideEnabled] = useState(false);
  const [taxOverridePercent, setTaxOverridePercent] = useState<string>("");

  const totalsBreakdown = useMemo(
    () =>
      computeBookingTotals({
        serviceSubtotal: lineItemsSubtotal,
        addOnTotal,
        isMobile: form.isMobile,
        basePostalCode: FACILITY_BASE_POSTAL,
        clientPostalCode: form.clientPostalCode || undefined,
        zones: travelZones,
        zipTaxRates,
        manualTaxRatePercent:
          taxOverrideEnabled && taxOverridePercent.trim() !== ""
            ? Number(taxOverridePercent)
            : undefined,
      }),
    [
      lineItemsSubtotal,
      addOnTotal,
      form.isMobile,
      form.clientPostalCode,
      travelZones,
      zipTaxRates,
      taxOverrideEnabled,
      taxOverridePercent,
    ],
  );

  // When the user hasn't explicitly overridden, surface what tax we'd apply
  // so they can confirm before saving.
  const autoTaxPreview = useMemo(
    () =>
      form.clientPostalCode
        ? findZipTaxRate(zipTaxRates, form.clientPostalCode)
        : null,
    [zipTaxRates, form.clientPostalCode],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scissors className="size-4 text-pink-500" />
            New Grooming Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-1">
          <ClientPetPicker
            value={{
              clientId: form.clientId,
              ownerName: form.ownerName,
              ownerPhone: form.ownerPhone,
              ownerEmail: form.ownerEmail,
              petId: form.petId,
              petName: form.petName,
              petBreed: form.petBreed,
              petSize: form.petSize,
              coatType: form.coatType,
              petAgeMonths: form.petAgeMonths,
            }}
            onChange={(next: ClientPetPickerValue) => {
              setForm((prev) => ({
                ...prev,
                clientId: next.clientId,
                ownerName: next.ownerName,
                ownerPhone: next.ownerPhone,
                ownerEmail: next.ownerEmail,
                petId: next.petId,
                petName: next.petName,
                petBreed: next.petBreed,
                petSize: next.petSize,
                coatType: next.coatType,
                petAgeMonths: next.petAgeMonths,
              }));
            }}
          />

          <Separator />

          {/* ── Additional Pets (same household) ── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <SectionHeading>
                Additional Pets{" "}
                <span className="text-muted-foreground font-normal normal-case">
                  · same household
                </span>
              </SectionHeading>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() =>
                  setAdditionalPets((prev) => [
                    ...prev,
                    {
                      petName: "",
                      petBreed: "",
                      petSize: "small",
                      packageId: "",
                      packageName: "",
                    },
                  ])
                }
              >
                <PawPrint className="mr-1 size-3.5" />
                Add Pet
              </Button>
            </div>
            {additionalPets.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">
                Single-pet booking. Add another pet to bundle them under the
                same arrival.
              </p>
            ) : (
              <div className="space-y-2">
                {additionalPets.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-end gap-2 rounded-lg border bg-muted/30 p-2.5"
                  >
                    <div className="col-span-4">
                      <Label className="text-[10px]">Pet name</Label>
                      <Input
                        value={p.petName}
                        onChange={(e) =>
                          setAdditionalPets((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, petName: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="e.g. Coco"
                        className="mt-0.5 h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[10px]">Size</Label>
                      <Select
                        value={p.petSize}
                        onValueChange={(v) =>
                          setAdditionalPets((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, petSize: v as PetSize }
                                : x,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="mt-0.5 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="giant">Giant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-[10px]">Service</Label>
                      <Select
                        value={p.packageId}
                        onValueChange={(v) => {
                          const pkg = packages.find((pk) => pk.id === v);
                          setAdditionalPets((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    packageId: v,
                                    packageName: pkg?.name ?? "",
                                  }
                                : x,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger className="mt-0.5 h-8 text-xs">
                          <SelectValue placeholder="Service" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages
                            .filter((pk) => pk.isActive)
                            .map((pk) => (
                              <SelectItem
                                key={pk.id}
                                value={pk.id}
                                className="text-xs"
                              >
                                {pk.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-destructive/70 hover:text-destructive"
                        onClick={() =>
                          setAdditionalPets((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* ── Service ── */}
          <section>
            <SectionHeading>Service</SectionHeading>
            <div>
              <Label className="text-xs">
                Service <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.packageId}
                onValueChange={(v) => {
                  update("packageId", v);
                  // Only clear the groomer if they're not eligible for the new
                  // package (preserves quick-book pre-fill when compatible).
                  const next = packages.find((p) => p.id === v);
                  const restricted =
                    next?.assignedStylistIds &&
                    next.assignedStylistIds.length > 0;
                  if (
                    restricted &&
                    form.stylistId &&
                    !next!.assignedStylistIds!.includes(form.stylistId)
                  ) {
                    update("stylistId", "");
                  }
                  setSelectedAddOns([]);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {orderedPackages.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No services match this pet&apos;s attributes. Adjust the
                      pet&apos;s size, coat, or breed to see options.
                    </div>
                  ) : (
                    orderedPackages.map((p) => {
                      const isLastBooked =
                        p.id === lastBookedPackageIdForPet;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center justify-between w-full gap-6">
                            <div className="flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {isLastBooked && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                  Last booked
                                </span>
                              )}
                              {p.requiredSkillLevel && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  {p.requiredSkillLevel}+
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {p.duration} min
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>

              {filteredOutCount > 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {filteredOutCount} service{filteredOutCount === 1 ? "" : "s"}{" "}
                  hidden — doesn&apos;t match this pet&apos;s size/coat/breed.
                </p>
              )}

              {/* Service description + what's included */}
              {selectedPackage && (
                <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs">
                  <p className="text-muted-foreground mb-1.5">
                    {selectedPackage.description}
                  </p>
                  {selectedPackage.includes && selectedPackage.includes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPackage.includes.map((inc: string) => (
                        <Badge
                          key={inc}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {inc}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Inline price + duration override (Step 2 — items #7 / #8).
                  Editable only when a package is picked AND we know enough
                  about the pet to compute a base price. */}
              {selectedPackage &&
                form.petSize &&
                petLines.length > 0 &&
                (() => {
                  const primary = petLines[0];
                  const sourceLabel = (() => {
                    switch (primary.pricing.source) {
                      case "pet-custom":
                        return "Saved price for this pet";
                      case "breed-override":
                        return "Breed price";
                      case "stylist-specific":
                        return "Stylist price";
                      default:
                        return "Resolved from size & coat";
                    }
                  })();
                  const priceEdited = manualPriceOverride !== undefined;
                  const durationEdited = manualDurationOverride !== undefined;
                  const anyEdited = priceEdited || durationEdited;
                  const canSaveToPet = form.petId !== undefined && anyEdited;
                  return (
                    <div className="mt-3 rounded-lg border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Price & duration
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          {anyEdited ? "Manual override" : sourceLabel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Price ($)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              manualPriceOverride !== undefined
                                ? manualPriceOverride
                                : primary.pricing.price
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw.trim() === "") {
                                setManualPriceOverride(undefined);
                              } else {
                                const n = Number(raw);
                                setManualPriceOverride(
                                  Number.isFinite(n) ? Math.max(0, n) : 0,
                                );
                              }
                            }}
                            className="mt-1 tabular-nums"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Duration (min)</Label>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            value={
                              manualDurationOverride !== undefined
                                ? manualDurationOverride
                                : primary.pricing.durationMin
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw.trim() === "") {
                                setManualDurationOverride(undefined);
                              } else {
                                const n = Number(raw);
                                setManualDurationOverride(
                                  Number.isFinite(n) ? Math.max(5, n) : 5,
                                );
                              }
                            }}
                            className="mt-1 tabular-nums"
                          />
                        </div>
                      </div>
                      {anyEdited && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualPriceOverride(undefined);
                            setManualDurationOverride(undefined);
                            setSavePriceToPet(false);
                          }}
                          className="mt-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Reset to {sourceLabel.toLowerCase()}
                        </button>
                      )}
                      {form.petId !== undefined && (
                        <label
                          className={cn(
                            "mt-2.5 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                            canSaveToPet
                              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
                              : "border-dashed opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={savePriceToPet}
                            onCheckedChange={(v) =>
                              setSavePriceToPet(canSaveToPet && !!v)
                            }
                            disabled={!canSaveToPet}
                          />
                          <span className="flex-1">
                            Save this price for{" "}
                            <strong>
                              {form.petName?.trim() || "this pet"}
                            </strong>{" "}
                            so future bookings start here.
                          </span>
                        </label>
                      )}
                    </div>
                  );
                })()}
            </div>

            {/* ── Add-ons — appear naturally after service selection ── */}
            {showAddOns && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="size-3.5 text-pink-500" />
                  <Label className="text-xs text-muted-foreground">
                    Want to add anything?{" "}
                    <span className="text-muted-foreground/60">Optional</span>
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ADD_ONS.map((ao) => {
                    const selected = selectedAddOns.includes(ao.id);
                    const isAuto = autoAttachedIds.includes(ao.id);
                    return (
                      <div
                        key={ao.id}
                        onClick={() => toggleAddOn(ao.id)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                          selected
                            ? isAuto
                              ? "border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/20"
                              : "border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-950/20"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleAddOn(ao.id)}
                          className="pointer-events-none flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight truncate">
                            {ao.name}
                            {isAuto && selected && (
                              <span
                                title="Auto-added by the service's default add-on rules — uncheck to remove."
                                className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
                              >
                                <Sparkles className="size-2" />
                                Auto
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            +${ao.price}
                            {ao.duration > 0 ? ` · ${ao.duration} min` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* ── Schedule ── */}
          <section>
            <SectionHeading>Schedule</SectionHeading>

            {/* Mobile grooming toggle — visible only when mobile is enabled
                in Settings. Switches the form into mobile mode (address +
                coverage check). */}
            {mobileEnabled && (
              <div className="mb-3 flex items-center justify-between rounded-lg border bg-sky-50/40 px-3 py-2 dark:bg-sky-950/20">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-sky-600" />
                  <div>
                    <p className="text-xs font-semibold">Mobile appointment</p>
                    <p className="text-muted-foreground text-[10px]">
                      Service happens at the client&apos;s address (van visit).
                    </p>
                  </div>
                </div>
                <Checkbox
                  checked={form.isMobile}
                  onCheckedChange={(v) => {
                    setForm((prev) => ({
                      ...prev,
                      isMobile: !!v,
                      // Reset override whenever the toggle changes so a stale
                      // override can't carry over to a different mode.
                      coverageOverride: false,
                    }));
                  }}
                />
              </div>
            )}

            {/* Address + service-area coverage panel */}
            {mobileEnabled && form.isMobile && (
              <div className="mb-3 space-y-3 rounded-lg border bg-card p-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Client Address</Label>
                    <Input
                      value={form.clientAddress}
                      onChange={(e) => update("clientAddress", e.target.value)}
                      placeholder="123 Main St, Montréal QC"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Postal / Zip</Label>
                    <Input
                      value={form.clientPostalCode}
                      onChange={(e) =>
                        update(
                          "clientPostalCode",
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="H2P 1A3"
                      className="mt-1 text-sm uppercase"
                    />
                  </div>
                </div>

                {/* Static map placeholder — drops in a real map widget later */}
                <div className="relative h-28 overflow-hidden rounded-md border bg-gradient-to-br from-sky-100/60 via-emerald-100/40 to-violet-100/40 dark:from-sky-950/30 dark:via-emerald-950/20 dark:to-violet-950/20">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="relative flex h-full flex-col items-center justify-center gap-1 text-center">
                    <MapPin className="size-5 text-sky-600" />
                    <p className="text-xs font-medium">
                      {form.clientAddress || "Address preview"}
                    </p>
                    {form.clientPostalCode && (
                      <p className="text-muted-foreground text-[10px] font-mono uppercase">
                        {form.clientPostalCode}
                      </p>
                    )}
                  </div>
                </div>

                {/* Coverage result */}
                {coverageResult && (
                  <>
                    {coverageResult.status === "covered" && (
                      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-semibold">
                            Covered by {coverageResult.area.name}
                          </p>
                          <p className="opacity-80">
                            Active{" "}
                            {formatDaysOfWeek(coverageResult.area.daysOfWeek)}.
                          </p>
                        </div>
                      </div>
                    )}
                    {coverageResult.status === "needs-review" && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <div>
                          <p className="font-semibold">Needs manual review</p>
                          <p className="opacity-80">
                            {coverageResult.reason}
                          </p>
                        </div>
                      </div>
                    )}
                    {coverageResult.status === "not-covered" && (
                      <div className="space-y-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          <div>
                            <p className="font-semibold">
                              Address isn&apos;t in a service area for this date
                            </p>
                            <p className="opacity-80">
                              No active mobile area on{" "}
                              {new Date(
                                form.date + "T00:00:00",
                              ).toLocaleDateString("en-CA", {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              covers this postal code.
                            </p>
                          </div>
                        </div>
                        {suggestedDate && (
                          <button
                            type="button"
                            onClick={() => {
                              update("date", suggestedDate.dateStr);
                            }}
                            className="ml-6 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                          >
                            <CalendarIcon className="size-3" />
                            Try{" "}
                            {new Date(
                              suggestedDate.dateStr + "T00:00:00",
                            ).toLocaleDateString("en-CA", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            ({suggestedDate.areaName})
                          </button>
                        )}
                        <label className="ml-6 flex cursor-pointer items-center gap-2 pt-1">
                          <Checkbox
                            checked={form.coverageOverride}
                            onCheckedChange={(v) =>
                              update("coverageOverride", !!v)
                            }
                          />
                          <span className="text-[11px]">
                            Override — book this address anyway (manual route)
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">
                  Groomer <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.stylistId}
                  onValueChange={(v) => update("stylistId", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Assign groomer" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderedStylists.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No groomers qualified for this service.
                      </div>
                    ) : (
                      orderedStylists.map((s) => {
                        const isLast = s.id === lastGroomerIdForPet;
                        const isPreferred = s.id === preferredStylistIdForPet;
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex w-full items-center justify-between gap-3">
                              <span>{s.name}</span>
                              <span className="flex items-center gap-1">
                                {isLast && (
                                  <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                    Last groomer
                                  </span>
                                )}
                                {isPreferred && !isLast && (
                                  <span className="rounded-full bg-sky-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                                    Preferred
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {s.capacity.skillLevel}
                                </span>
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {selectedPackage &&
                  selectedPackage.assignedStylistIds &&
                  selectedPackage.assignedStylistIds.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      This service requires a qualified groomer
                    </p>
                  )}
                {selectedPackage?.requiredSkillLevel && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Requires {selectedPackage.requiredSkillLevel}+ skill
                    level
                  </p>
                )}
                {/* Additional groomers working alongside the primary stylist */}
                <div className="mt-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Users className="size-3" />
                      Additional Groomers
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      {additionalStylistIds.length} selected
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {eligibleStylists
                      .filter((s) => s.id !== form.stylistId)
                      .map((s) => {
                        const on = additionalStylistIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setAdditionalStylistIds((prev) =>
                                prev.includes(s.id)
                                  ? prev.filter((x) => x !== s.id)
                                  : [...prev, s.id],
                              )
                            }
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                              on
                                ? "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-950/20"
                                : "hover:bg-muted/40",
                            )}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    For big-dog jobs or shadowing — payroll credits everyone
                    selected.
                  </p>

                  {/* Sequential stage editor — split the appointment across
                      multiple groomers in sequence (e.g., bath then cut). */}
                  <div className="mt-2 rounded-md border border-violet-200/70 bg-violet-50/30 px-2.5 py-1.5 dark:border-violet-900/40 dark:bg-violet-950/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        Split into Sequential Stages
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          // Each new stage starts at the previous stage's end
                          // (or the appointment start for the first one) and
                          // defaults to 30 min owned by the primary groomer.
                          const last = stages[stages.length - 1];
                          const startTime =
                            last?.endTime ?? form.startTime ?? "09:00";
                          const endTime = addMinutesToTime(startTime, 30);
                          const primaryName = activeStylists.find(
                            (s) => s.id === form.stylistId,
                          )?.name;
                          setStages((prev) => [
                            ...prev,
                            {
                              id: `stage-${Date.now()}-${prev.length}`,
                              label:
                                prev.length === 0
                                  ? "Bath"
                                  : prev.length === 1
                                    ? "Cut"
                                    : "Stage " + (prev.length + 1),
                              stylistId: form.stylistId,
                              stylistName: primaryName ?? "",
                              startTime,
                              endTime,
                            },
                          ]);
                        }}
                      >
                        + Stage
                      </Button>
                    </div>
                    {stages.length === 0 ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        e.g., one groomer does the bath then hands off to
                        another for the cut. A handoff notification fires
                        when each stage is marked complete.
                      </p>
                    ) : (
                      <ul className="mt-1.5 space-y-1.5">
                        {stages.map((st, i) => {
                          const updateStage = (
                            patch: Partial<AppointmentStage>,
                          ) =>
                            setStages((prev) =>
                              prev.map((s2, j) =>
                                j === i ? { ...s2, ...patch } : s2,
                              ),
                            );
                          return (
                            <li
                              key={st.id}
                              className="grid grid-cols-12 gap-1.5"
                            >
                              <Input
                                value={st.label}
                                onChange={(e) =>
                                  updateStage({ label: e.target.value })
                                }
                                placeholder="Stage"
                                className="col-span-3 h-7 text-[11px]"
                              />
                              <Select
                                value={st.stylistId}
                                onValueChange={(v) => {
                                  const name =
                                    activeStylists.find((s) => s.id === v)
                                      ?.name ?? "";
                                  updateStage({
                                    stylistId: v,
                                    stylistName: name,
                                  });
                                }}
                              >
                                <SelectTrigger className="col-span-4 h-7 text-[11px]">
                                  <SelectValue placeholder="Groomer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeStylists.map((s) => (
                                    <SelectItem
                                      key={s.id}
                                      value={s.id}
                                      className="text-xs"
                                    >
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={st.startTime}
                                onChange={(e) =>
                                  updateStage({ startTime: e.target.value })
                                }
                                placeholder="HH:MM"
                                className="col-span-2 h-7 text-[11px] tabular-nums"
                              />
                              <Input
                                value={st.endTime}
                                onChange={(e) =>
                                  updateStage({ endTime: e.target.value })
                                }
                                placeholder="HH:MM"
                                className="col-span-2 h-7 text-[11px] tabular-nums"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="col-span-1 h-7 px-1 text-destructive/70 hover:text-destructive"
                                onClick={() =>
                                  setStages((prev) =>
                                    prev.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {additionalStylistIds.length > 0 &&
                    (() => {
                      // Two groomers in parallel → ~30% faster; capped at 50%.
                      const groomerCount = 1 + additionalStylistIds.length;
                      const factor = Math.max(
                        0.5,
                        1 - 0.3 * (groomerCount - 1),
                      );
                      const currentDuration =
                        timeToMinutes(form.endTime) -
                        timeToMinutes(form.startTime);
                      if (currentDuration <= 0) return null;
                      const suggested = Math.max(
                        15,
                        Math.round((currentDuration * factor) / 5) * 5,
                      );
                      if (suggested >= currentDuration) return null;
                      const savings = currentDuration - suggested;
                      const newEnd = addMinutesToTime(
                        form.startTime,
                        suggested,
                      );
                      return (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5 text-[11px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                          <span>
                            With {groomerCount} groomers this could run{" "}
                            <strong>{suggested} min</strong>{" "}
                            <span className="text-emerald-700/80 dark:text-emerald-300/80">
                              ({savings} min saved)
                            </span>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 border-emerald-300 px-2 text-[10px]"
                            onClick={() => update("endTime", newEnd)}
                          >
                            Apply
                          </Button>
                        </div>
                      );
                    })()}
                </div>
              </div>
              <div>
                <Label className="text-xs">
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1">
                  <DensityCalendar
                    value={form.date}
                    onChange={(v) => update("date", v)}
                    getDensityForDate={getDensityForDate}
                  />
                </div>
                {!form.stylistId && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Pick a groomer first to see slot availability per day.
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-xs">
                  Station{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Select
                  value={form.stationId || "__none__"}
                  onValueChange={(v) =>
                    update("stationId", v === "__none__" ? "" : v)
                  }
                  disabled={!form.petSize}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue
                      placeholder={
                        form.petSize
                          ? "Assign at check-in or pick now"
                          : "Pick a pet size first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Assign at check-in
                    </SelectItem>
                    {eligibleStations.length === 0 && form.petSize ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No stations fit a {form.petSize} pet.
                      </div>
                    ) : (
                      eligibleStations.map((s) => {
                        const sizes =
                          !s.allowedPetSizes || s.allowedPetSizes.length === 0
                            ? "any size"
                            : s.allowedPetSizes.join(", ");
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex flex-col gap-0.5">
                              <span>{s.name}</span>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {sizes}
                                {s.maxWeightLbs
                                  ? ` · max ${s.maxWeightLbs} lbs`
                                  : ""}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {form.petSize && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Showing stations sized for {form.petSize} pets.
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs">
                    Appointment Time{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {selectedPackage && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {serviceDurationForSlots} min slots
                      {smartSchedulingEnabled && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-pink-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-pink-800 dark:bg-pink-950/40 dark:text-pink-200">
                          Smart on
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {!form.stylistId || !form.date || !selectedPackage ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                    {!selectedPackage
                      ? "Pick a service to see available time slots."
                      : !form.stylistId
                        ? "Pick a groomer to see available slots."
                        : "Pick a date to see available slots."}
                  </div>
                ) : (
                  <SlotGrid
                    slots={slotGrid}
                    selectedStartTime={form.startTime}
                    onSelect={(start) => {
                      update("startTime", start);
                      update(
                        "endTime",
                        addMinutesToTime(start, serviceDurationForSlots),
                      );
                    }}
                    smartSchedulingEnabled={smartSchedulingEnabled}
                    showDriveTime={form.isMobile}
                    emptyLabel={
                      slotGrid.length === 0
                        ? "Groomer doesn't work this day. Pick another date."
                        : "No slots available."
                    }
                  />
                )}
              </div>

              {/* Mobile-grooming route preview (Step 3 — items #5 / #6). */}
              {form.isMobile &&
                routePreviewData &&
                form.date &&
                form.stylistId && (
                  <div className="col-span-2">
                    <MobileRouteMapPreview
                      vanColor={
                        stylistsData.find((s) => s.id === form.stylistId)
                          ?.calendarColor ?? "#ec4899"
                      }
                      stops={routePreviewData.stops}
                      tentativeStop={routePreviewData.tentativeStop}
                      caption={`Route preview for ${form.date}${
                        form.startTime ? ` · arriving ${form.startTime}` : ""
                      }`}
                    />
                  </div>
                )}
            </div>
          </section>

          <Separator />

          {/* ── Notes ── */}
          <section>
            <SectionHeading>Notes</SectionHeading>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">
                  Special Instructions / Allergies
                </Label>
                <Textarea
                  placeholder="Allergies, sensitivities, handling notes…"
                  value={form.specialInstructions}
                  onChange={(e) =>
                    update("specialInstructions", e.target.value)
                  }
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Internal Notes</Label>
                <Textarea
                  placeholder="Staff-only notes (not visible to client)"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  className="mt-1 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          </section>

          {/* ── Invoice / price summary ── */}
          {showPriceSummary && (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Booking Summary
                </p>
                {totalDurationMin > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {totalDurationMin} min total
                  </span>
                )}
              </div>

              {/* Per-pet line items */}
              <ul className="divide-y divide-border/50">
                {petLines.map((l, i) => (
                  <li
                    key={`${l.petName}-${i}`}
                    className="py-1.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {l.petName}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px] capitalize">
                          {l.packageName} · {l.petSize} · {l.durationMin} min
                        </p>
                        {l.pricing.source === "pet-custom" && (
                          <span
                            title={l.pricing.note}
                            className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          >
                            <DollarSign className="size-2.5" />
                            Saved price for {l.petName}
                          </span>
                        )}
                        {l.pricing.source === "stylist-specific" && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-px text-[10px] font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                            <DollarSign className="size-2.5" />
                            Stylist pricing
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        ${l.price}
                      </span>
                    </div>
                    {l.pricing.ageAdjustment && (
                      <div className="mt-0.5 flex items-center justify-between gap-3 pl-3 text-[11px]">
                        <span
                          className={cn(
                            "italic",
                            l.pricing.ageAdjustment.delta < 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300",
                          )}
                        >
                          ↳ {l.pricing.ageAdjustment.label} adjustment
                          {l.pricing.ageAdjustment.mode === "percent" &&
                            ` (${l.pricing.ageAdjustment.amount >= 0 ? "+" : ""}${l.pricing.ageAdjustment.amount}%)`}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            l.pricing.ageAdjustment.delta < 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300",
                          )}
                        >
                          {l.pricing.ageAdjustment.delta >= 0 ? "+" : "−"}$
                          {Math.abs(l.pricing.ageAdjustment.delta).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
                {selectedAddOns.length > 0 && (
                  <li className="flex items-center justify-between gap-3 py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        Add-ons ({selectedAddOns.length})
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {selectedAddOns
                          .map(
                            (id) =>
                              ADD_ONS.find((a) => a.id === id)?.name ?? "",
                          )
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      ${addOnTotal}
                    </span>
                  </li>
                )}
              </ul>

              <Separator className="my-2" />

              {/* Zone surcharge — own invoice line per spec. */}
              {totalsBreakdown.zone && totalsBreakdown.zoneSurcharge > 0 && (
                <div className="flex items-center justify-between gap-3 py-1 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Travel surcharge
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        · {totalsBreakdown.zone.label}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    +${totalsBreakdown.zoneSurcharge.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Pre-tax subtotal — shown when there's anything tax-related to render. */}
              {(totalsBreakdown.zoneSurcharge > 0 ||
                totalsBreakdown.taxAmount > 0) && (
                <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    ${totalsBreakdown.preTaxSubtotal.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Tax line — labelled with the matched ZIP rule or override. */}
              {totalsBreakdown.taxSource !== "none" && (
                <div className="flex items-center justify-between gap-3 py-1 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Tax (
                      {(totalsBreakdown.taxRate * 100).toFixed(
                        totalsBreakdown.taxRate * 100 >= 10 ? 2 : 3,
                      )}
                      %)
                      <span className="text-muted-foreground ml-1.5 font-normal">
                        {totalsBreakdown.taxSource === "override"
                          ? "· manual override"
                          : totalsBreakdown.appliedRate
                            ? `· ${totalsBreakdown.appliedRate.label}`
                            : ""}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    +${totalsBreakdown.taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Tax override input — for ZIPs the system doesn't know about. */}
              <label className="mt-1 flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[11px]">
                <input
                  type="checkbox"
                  checked={taxOverrideEnabled}
                  onChange={(e) => {
                    setTaxOverrideEnabled(e.target.checked);
                    if (!e.target.checked) setTaxOverridePercent("");
                  }}
                />
                <span className="flex-1">
                  Manual tax rate
                  {autoTaxPreview && !taxOverrideEnabled && (
                    <span className="text-muted-foreground ml-1.5">
                      · auto: {autoTaxPreview.ratePercent}% (
                      {autoTaxPreview.label})
                    </span>
                  )}
                </span>
                {taxOverrideEnabled && (
                  <>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.001}
                      value={taxOverridePercent}
                      onChange={(e) => setTaxOverridePercent(e.target.value)}
                      placeholder="0.000"
                      className="h-6 w-20 text-[11px]"
                    />
                    <span className="text-muted-foreground">%</span>
                  </>
                )}
              </label>

              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Total
                  {petLines.length > 1 && (
                    <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                      · {petLines.length} pets
                    </span>
                  )}
                </p>
                <div className="flex items-baseline gap-0.5">
                  <DollarSign className="size-4 text-muted-foreground self-center" />
                  <span className="text-2xl font-bold tabular-nums">
                    {totalsBreakdown.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="size-4 mr-1.5" />
            Book Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
