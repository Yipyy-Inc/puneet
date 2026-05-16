"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import {
  Scissors,
  Clock,
  CheckCircle2,
  Flame,
  Sparkles,
  Lock,
  Sparkle,
  Building2,
  Truck,
  MapPin,
  AlertCircle,
  Users,
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/use-settings";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { useGroomingScheduling } from "@/hooks/use-grooming-scheduling";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { groomingPackages } from "@/data/grooming";
import { GROOMING_ADD_ONS as ADD_ONS } from "@/data/grooming-add-ons";
import { defaultServiceAddOns } from "@/data/service-addons";
import { SERVICE_ACCENTS } from "../constants";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DensityCalendar } from "@/components/facility/grooming/density-calendar";
import { SlotGrid } from "@/components/facility/grooming/slot-grid";
import { MobileRouteMapPreview } from "@/components/facility/grooming/mobile-route-map-preview";
import {
  groomingQueries,
  resolveEffectivePricing,
  resolveAutoAddOns,
  getLastGroomerForPet,
  stylistMeetsSkillRequirement,
} from "@/lib/api/grooming";
import {
  computeDayDensity,
  computeSlotGrid,
  getAppointmentsForStylistOnDate,
  getStylistWorkWindow,
  appointmentAddressSeed,
  type DayDensity,
} from "@/lib/grooming-scheduling";
import { pseudoCoord } from "@/lib/route-planning";
import { isStationEligibleForPetSize } from "@/components/rooms/GroomingStationsClient";
import { checkPostalCodeOnDay } from "@/lib/service-areas";
import { GroomingWaitlistDialog } from "./GroomingWaitlistDialog";
import { cn } from "@/lib/utils";
import { getPetSize, petsMatchEligibleSizes } from "@/lib/pet-size";
import type { Pet } from "@/types/pet";
import type { Client } from "@/types/client";
import type { AppointmentStage } from "@/types/grooming";
import type { GroomingStationPetSize } from "@/types/rooms";
import type { ServiceAddOn } from "@/types/facility";

const formatDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

interface GroomingDetailsProps {
  currentSubStep: number;
  serviceType: string;
  setServiceType: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  checkInTime: string;
  setCheckInTime: (value: string) => void;
  checkOutTime: string;
  setCheckOutTime: (value: string) => void;
  /** Selected pets — when present and the facility's
   *  `onlyShowApplicableServices` toggle is on, packages whose
   *  `eligiblePetSizes` doesn't overlap with the pets' sizes are hidden. */
  selectedPets?: Pet[];
  applyEligibilityFilter?: boolean;
  /** Add-on selection for the grooming sub-step. Per-pet rows in the
   *  parent — for grooming we apply the same set to every selected pet. */
  extraServices?: Array<{
    serviceId: string;
    quantity: number;
    petId: number;
  }>;
  setExtraServices?: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  /** Mobile/Salon mode for the schedule sub-step. Drives the segmented
   *  control, calendar coverage filter, and arrival-window vs exact-time
   *  picker. */
  isMobile: boolean;
  setIsMobile: (next: boolean) => void;
  selectedClient?: Client;
  /** Primary groomer (stylist) id. Required to compute the slot grid + density. */
  stylistId: string;
  setStylistId: (id: string) => void;
  /** Secondary co-groomers working alongside the primary stylist. */
  additionalStylistIds: string[];
  setAdditionalStylistIds: (ids: string[]) => void;
  /** Assigned grooming station — filtered by pet size. */
  stationId: string;
  setStationId: (id: string) => void;
  /** Split-service stages — when set, the booking is rendered as multiple
   *  sequential blocks (e.g. bath → dry → cut) each owned by a different stylist. */
  stages: AppointmentStage[];
  setStages: (stages: AppointmentStage[]) => void;
  /** Manual price/duration override. Wins over the resolver-computed value. */
  manualPrice: number | undefined;
  setManualPrice: (price: number | undefined) => void;
  manualDuration: number | undefined;
  setManualDuration: (mins: number | undefined) => void;
  /** When true, the manual price is persisted as the pet's per-service rate
   *  on submit so future bookings pre-fill with it. */
  savePriceToPet: boolean;
  setSavePriceToPet: (next: boolean) => void;
  /** Full list of selected grooming-specific add-on ids (GROOMING_ADD_ONS). */
  selectedGroomingAddOnIds: string[];
  setSelectedGroomingAddOnIds: (ids: string[]) => void;
  /** Subset of selectedGroomingAddOnIds that came from the package's
   *  default-rules (vs explicitly chosen by staff). Tracked so the rule
   *  engine can swap out only the auto picks when the package or pet changes. */
  autoAttachedAddOnIds: string[];
  setAutoAttachedAddOnIds: (ids: string[]) => void;
}

export function GroomingDetails({
  currentSubStep,
  serviceType,
  setServiceType,
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  selectedPets,
  applyEligibilityFilter,
  extraServices,
  setExtraServices,
  isMobile,
  setIsMobile,
  selectedClient,
  stylistId,
  setStylistId,
  additionalStylistIds,
  setAdditionalStylistIds,
  stationId,
  setStationId,
  stages,
  setStages,
  manualPrice,
  setManualPrice,
  manualDuration,
  setManualDuration,
  savePriceToPet,
  setSavePriceToPet,
  selectedGroomingAddOnIds,
  setSelectedGroomingAddOnIds,
  autoAttachedAddOnIds,
  setAutoAttachedAddOnIds,
}: GroomingDetailsProps) {
  if (currentSubStep === 0) {
    return (
      <GroomingService
        selectedPackageId={serviceType}
        onSelectPackage={setServiceType}
        selectedPets={selectedPets ?? []}
        applyEligibilityFilter={applyEligibilityFilter}
        stylistId={stylistId}
        setStylistId={setStylistId}
        additionalStylistIds={additionalStylistIds}
        setAdditionalStylistIds={setAdditionalStylistIds}
        stationId={stationId}
        setStationId={setStationId}
        stages={stages}
        setStages={setStages}
        manualPrice={manualPrice}
        setManualPrice={setManualPrice}
        manualDuration={manualDuration}
        setManualDuration={setManualDuration}
        savePriceToPet={savePriceToPet}
        setSavePriceToPet={setSavePriceToPet}
      />
    );
  }
  if (currentSubStep === 1) {
    return (
      <GroomingAddOns
        selectedPets={selectedPets ?? []}
        extraServices={extraServices ?? []}
        setExtraServices={setExtraServices ?? (() => {})}
        packageId={serviceType}
        selectedGroomingAddOnIds={selectedGroomingAddOnIds}
        setSelectedGroomingAddOnIds={setSelectedGroomingAddOnIds}
        autoAttachedAddOnIds={autoAttachedAddOnIds}
        setAutoAttachedAddOnIds={setAutoAttachedAddOnIds}
      />
    );
  }
  return (
    <GroomingSchedule
      startDate={startDate}
      setStartDate={setStartDate}
      checkInTime={checkInTime}
      setCheckInTime={setCheckInTime}
      checkOutTime={checkOutTime}
      setCheckOutTime={setCheckOutTime}
      isMobile={isMobile}
      setIsMobile={setIsMobile}
      selectedClient={selectedClient}
      selectedPets={selectedPets ?? []}
      packageId={serviceType}
      stylistId={stylistId}
      manualDuration={manualDuration}
    />
  );
}

// ─── Step 0: Service (package + stylist + station + extras) ─────────────────
function GroomingService({
  selectedPackageId,
  onSelectPackage,
  selectedPets,
  applyEligibilityFilter,
  stylistId,
  setStylistId,
  additionalStylistIds,
  setAdditionalStylistIds,
  stationId,
  setStationId,
  stages,
  setStages,
  manualPrice,
  setManualPrice,
  manualDuration,
  setManualDuration,
  savePriceToPet,
  setSavePriceToPet,
}: {
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
  selectedPets: Pet[];
  applyEligibilityFilter?: boolean;
  stylistId: string;
  setStylistId: (id: string) => void;
  additionalStylistIds: string[];
  setAdditionalStylistIds: (ids: string[]) => void;
  stationId: string;
  setStationId: (id: string) => void;
  stages: AppointmentStage[];
  setStages: (stages: AppointmentStage[]) => void;
  manualPrice: number | undefined;
  setManualPrice: (price: number | undefined) => void;
  manualDuration: number | undefined;
  setManualDuration: (mins: number | undefined) => void;
  savePriceToPet: boolean;
  setSavePriceToPet: (next: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <GroomingPackagePicker
        selectedPackageId={selectedPackageId}
        onSelect={onSelectPackage}
        selectedPets={selectedPets}
        applyEligibilityFilter={applyEligibilityFilter}
      />

      {/* The stylist + station + stages + pricing UIs are only meaningful
          once a package is chosen. Until then, show a one-liner so users know
          there's more configuration available after picking a service. */}
      {selectedPackageId ? (
        <>
          <GroomingStylistPicker
            selectedPackageId={selectedPackageId}
            selectedPets={selectedPets}
            stylistId={stylistId}
            setStylistId={setStylistId}
            additionalStylistIds={additionalStylistIds}
            setAdditionalStylistIds={setAdditionalStylistIds}
          />

          <GroomingStationPicker
            selectedPets={selectedPets}
            stationId={stationId}
            setStationId={setStationId}
          />

          <GroomingStagesEditor
            selectedPackageId={selectedPackageId}
            primaryStylistId={stylistId}
            stages={stages}
            setStages={setStages}
          />

          <GroomingPriceOverride
            selectedPackageId={selectedPackageId}
            selectedPets={selectedPets}
            stylistId={stylistId}
            manualPrice={manualPrice}
            setManualPrice={setManualPrice}
            manualDuration={manualDuration}
            setManualDuration={setManualDuration}
            savePriceToPet={savePriceToPet}
            setSavePriceToPet={setSavePriceToPet}
          />
        </>
      ) : (
        <p className="text-muted-foreground text-xs italic">
          Pick a service above to assign a groomer, station, and pricing.
        </p>
      )}
    </div>
  );
}

// ─── Step 0a: Package picker ─────────────────────────────────────────────────
function GroomingPackagePicker({
  selectedPackageId,
  onSelect,
  selectedPets,
  applyEligibilityFilter,
}: {
  selectedPackageId: string;
  onSelect: (id: string) => void;
  selectedPets?: Pet[];
  applyEligibilityFilter?: boolean;
}) {
  const accent = SERVICE_ACCENTS.grooming;
  // Only show active packages. The catalog card shows the starting price —
  // the price for the smallest pet size — because the final price depends
  // on the pet (size / breed / coat / stylist), which is resolved later.
  // When the facility opts in via `onlyShowApplicableServices`, also hide
  // packages whose `eligiblePetSizes` doesn't overlap with the client's pets.
  const packages = groomingPackages.filter((p) => {
    if (!p.isActive) return false;
    if (applyEligibilityFilter && selectedPets && selectedPets.length > 0) {
      return petsMatchEligibleSizes(selectedPets, p.eligiblePetSizes);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accent.bg,
          )}
        >
          <Scissors className={cn("size-5", accent.icon)} />
        </div>
        <div>
          <h3 className="font-semibold">Choose your grooming</h3>
          <p className="text-muted-foreground text-sm">
            Final price depends on your pet&rsquo;s size and coat. Starting
            prices shown are for small dogs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {packages.map((pkg) => {
          const active = selectedPackageId === pkg.id;
          const startingPrice = pkg.sizePricing.small;
          const includesPreview = pkg.includes.slice(0, 3);
          const extraCount = Math.max(0, pkg.includes.length - 3);
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => onSelect(pkg.id)}
              aria-pressed={active}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition",
                active
                  ? cn("ring-2", accent.ring, accent.border, "shadow-md")
                  : "hover:shadow-sm",
              )}
            >
              {/* Image / icon banner */}
              <div
                className={cn(
                  "relative h-32 w-full overflow-hidden",
                  pkg.imageUrl ? "" : cn(accent.bg, "flex items-center justify-center"),
                )}
              >
                {pkg.imageUrl ? (
                  <Image
                    src={pkg.imageUrl}
                    alt={pkg.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <Scissors className={cn("size-10", accent.icon)} />
                )}
                {pkg.isPopular && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                    <Flame className="size-3" />
                    Popular
                  </span>
                )}
                {active && (
                  <span
                    className={cn(
                      "absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full text-white shadow-sm",
                      accent.stepBg,
                    )}
                  >
                    <CheckCircle2 className="size-4" />
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm/tight font-semibold">
                    {pkg.name}
                  </h4>
                  <div className="text-right">
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      From
                    </p>
                    <p className={cn("text-base font-bold", accent.price)}>
                      ${startingPrice}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {pkg.description}
                </p>
                <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Clock className="size-3" />
                  {pkg.duration} min
                  {pkg.requiresEvaluation && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Sparkles className="size-3" />
                        Evaluation required
                      </span>
                    </>
                  )}
                </div>
                {includesPreview.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[11px]">
                    {includesPreview.map((line) => (
                      <li
                        key={line}
                        className="text-muted-foreground flex items-center gap-1"
                      >
                        <CheckCircle2
                          className={cn("size-3 shrink-0", accent.icon)}
                        />
                        <span className="truncate">{line}</span>
                      </li>
                    ))}
                    {extraCount > 0 && (
                      <li className="text-muted-foreground/80 text-[10px]">
                        +{extraCount} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 0b: Stylist picker (with eligibility + co-groomers) ────────────────
function GroomingStylistPicker({
  selectedPackageId,
  selectedPets,
  stylistId,
  setStylistId,
  additionalStylistIds,
  setAdditionalStylistIds,
}: {
  selectedPackageId: string;
  selectedPets: Pet[];
  stylistId: string;
  setStylistId: (id: string) => void;
  additionalStylistIds: string[];
  setAdditionalStylistIds: (ids: string[]) => void;
}) {
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );

  const activeStylists = useMemo(
    () => stylistsData.filter((s) => s.status === "active"),
    [stylistsData],
  );
  const selectedPackage = groomingPackages.find(
    (p) => p.id === selectedPackageId,
  );

  // Mirror NewAppointmentDialog's three-layer filter: package assignment >
  // stylist qualifications > package skill-level gate.
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

  // Order: last groomer for the first pet → preferred (no preference store
  // wired in the wizard) → alphabetical.
  const primaryPetId = selectedPets[0]?.id;
  const lastGroomerIdForPet = useMemo(() => {
    if (primaryPetId === undefined) return undefined;
    return getLastGroomerForPet(primaryPetId, allAppointments);
  }, [primaryPetId, allAppointments]);

  const orderedStylists = useMemo(() => {
    if (eligibleStylists.length === 0) return eligibleStylists;
    const byId = new Map(eligibleStylists.map((s) => [s.id, s]));
    const ordered: typeof eligibleStylists = [];
    const seen = new Set<string>();
    if (lastGroomerIdForPet && byId.has(lastGroomerIdForPet)) {
      ordered.push(byId.get(lastGroomerIdForPet)!);
      seen.add(lastGroomerIdForPet);
    }
    const rest = eligibleStylists
      .filter((s) => !seen.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...ordered, ...rest];
  }, [eligibleStylists, lastGroomerIdForPet]);

  // Auto-suggest: if no stylist yet, or the chosen one is no longer eligible,
  // jump to the top of the ordered list.
  useEffect(() => {
    if (orderedStylists.length === 0) return;
    if (stylistId) {
      const stillEligible = orderedStylists.some((s) => s.id === stylistId);
      if (!stillEligible) setStylistId(orderedStylists[0].id);
      return;
    }
    setStylistId(orderedStylists[0].id);
  }, [orderedStylists, stylistId, setStylistId]);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">
            Groomer <span className="text-destructive">*</span>
          </Label>
          {selectedPackage?.requiredSkillLevel && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Requires {selectedPackage.requiredSkillLevel}+ skill level
            </p>
          )}
        </div>
        <Users className="size-4 text-muted-foreground" />
      </div>
      <Select value={stylistId} onValueChange={setStylistId}>
        <SelectTrigger className="mt-2">
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

      {/* Additional groomers — chips so multiple can be toggled without
          opening a second dropdown. */}
      <div className="mt-3 rounded-md border bg-muted/30 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Users className="size-3" />
            Additional groomers
          </Label>
          <span className="text-[10px] text-muted-foreground">
            {additionalStylistIds.length} selected
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {eligibleStylists
            .filter((s) => s.id !== stylistId)
            .map((s) => {
              const on = additionalStylistIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setAdditionalStylistIds(
                      on
                        ? additionalStylistIds.filter((x) => x !== s.id)
                        : [...additionalStylistIds, s.id],
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
          For big-dog jobs or shadowing — payroll credits everyone selected.
        </p>
      </div>
    </div>
  );
}

// ─── Step 0c: Station picker (filtered by pet size) ──────────────────────────
function GroomingStationPicker({
  selectedPets,
  stationId,
  setStationId,
}: {
  selectedPets: Pet[];
  stationId: string;
  setStationId: (id: string) => void;
}) {
  const { stations } = useGroomingStations();

  // The wizard supports multi-pet selection — pick the largest pet so the
  // station has to accommodate the biggest body in the booking.
  const largestPetSize = useMemo<GroomingStationPetSize | undefined>(() => {
    if (selectedPets.length === 0) return undefined;
    const order: GroomingStationPetSize[] = [
      "small",
      "medium",
      "large",
      "giant",
    ];
    let max: GroomingStationPetSize = "small";
    for (const p of selectedPets) {
      const s = getPetSize(p) as GroomingStationPetSize;
      if (order.indexOf(s) > order.indexOf(max)) max = s;
    }
    return max;
  }, [selectedPets]);

  const eligibleStations = useMemo(() => {
    if (!largestPetSize) return [];
    return stations.filter(
      (s) =>
        s.active &&
        s.status !== "out-of-service" &&
        isStationEligibleForPetSize(s, largestPetSize),
    );
  }, [stations, largestPetSize]);

  // Clear the chosen station if it stops fitting after a pet swap.
  useEffect(() => {
    if (!stationId) return;
    const stillEligible = eligibleStations.some((s) => s.id === stationId);
    if (!stillEligible) setStationId("");
  }, [stationId, eligibleStations, setStationId]);

  if (!largestPetSize) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">Station</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Tables/tubs that fit {largestPetSize} dogs.
          </p>
        </div>
        <Building2 className="size-4 text-muted-foreground" />
      </div>
      <Select
        value={stationId || "__none__"}
        onValueChange={(v) => setStationId(v === "__none__" ? "" : v)}
      >
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Auto-assign at check-in" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground italic">
              Auto-assign at check-in
            </span>
          </SelectItem>
          {eligibleStations.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No eligible stations for this pet size.
            </div>
          ) : (
            eligibleStations.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex w-full items-center justify-between gap-3">
                  <span>{s.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {s.type}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Step 0d: Split-service stages editor ────────────────────────────────────
function GroomingStagesEditor({
  selectedPackageId,
  primaryStylistId,
  stages,
  setStages,
}: {
  selectedPackageId: string;
  primaryStylistId: string;
  stages: AppointmentStage[];
  setStages: (stages: AppointmentStage[]) => void;
}) {
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const selectedPackage = groomingPackages.find(
    (p) => p.id === selectedPackageId,
  );
  const baseDuration = selectedPackage?.duration ?? 60;

  function stylistName(id: string): string {
    return stylistsData.find((s) => s.id === id)?.name ?? "";
  }

  function addStage() {
    // Start the new stage right after the previous one (or 09:00) so the
    // editor produces a contiguous schedule by default.
    const lastEnd =
      stages.length > 0
        ? stages[stages.length - 1].endTime
        : "09:00";
    const [h, m] = lastEnd.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = Math.min(startMins + Math.floor(baseDuration / 2), 23 * 60);
    const fmt = (mm: number) =>
      `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
    const sid =
      primaryStylistId ||
      (stylistsData.find((s) => s.status === "active")?.id ?? "");
    setStages([
      ...stages,
      {
        id: `stage-${Date.now()}-${stages.length + 1}`,
        label:
          stages.length === 0
            ? "Bath"
            : stages.length === 1
              ? "Dry"
              : `Stage ${stages.length + 1}`,
        stylistId: sid,
        stylistName: stylistName(sid),
        startTime: fmt(startMins),
        endTime: fmt(endMins),
      },
    ]);
  }

  function updateStage(idx: number, patch: Partial<AppointmentStage>) {
    setStages(
      stages.map((s, i) => {
        if (i !== idx) return s;
        const next = { ...s, ...patch };
        if (patch.stylistId !== undefined) {
          next.stylistName = stylistName(patch.stylistId);
        }
        return next;
      }),
    );
  }

  function removeStage(idx: number) {
    setStages(stages.filter((_, i) => i !== idx));
  }

  return (
    <div className="rounded-2xl border border-violet-200/70 bg-violet-50/30 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            Split into sequential stages
          </Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Optional. Chain stages across multiple groomers — e.g., bath by
            Sarah, then cut by Marcus.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={addStage}
        >
          <Plus className="mr-1 size-3" />
          Add stage
        </Button>
      </div>

      {stages.length === 0 ? (
        <p className="mt-2 text-[11px] italic text-muted-foreground">
          One continuous block by default. Add a stage to split.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              className="grid grid-cols-12 items-end gap-2 rounded-lg border bg-card p-2.5"
            >
              <div className="col-span-3">
                <Label className="text-[10px]">Label</Label>
                <Input
                  value={stage.label}
                  onChange={(e) =>
                    updateStage(idx, { label: e.target.value })
                  }
                  className="mt-0.5 h-8 text-xs"
                />
              </div>
              <div className="col-span-4">
                <Label className="text-[10px]">Groomer</Label>
                <Select
                  value={stage.stylistId}
                  onValueChange={(v) => updateStage(idx, { stylistId: v })}
                >
                  <SelectTrigger className="mt-0.5 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stylistsData
                      .filter((s) => s.status === "active")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Start</Label>
                <Input
                  type="time"
                  value={stage.startTime}
                  onChange={(e) =>
                    updateStage(idx, { startTime: e.target.value })
                  }
                  className="mt-0.5 h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">End</Label>
                <Input
                  type="time"
                  value={stage.endTime}
                  onChange={(e) =>
                    updateStage(idx, { endTime: e.target.value })
                  }
                  className="mt-0.5 h-8 text-xs"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive/70 hover:text-destructive"
                  onClick={() => removeStage(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 0e: Manual price / duration override (save-to-pet) ─────────────────
function GroomingPriceOverride({
  selectedPackageId,
  selectedPets,
  stylistId,
  manualPrice,
  setManualPrice,
  manualDuration,
  setManualDuration,
  savePriceToPet,
  setSavePriceToPet,
}: {
  selectedPackageId: string;
  selectedPets: Pet[];
  stylistId: string;
  manualPrice: number | undefined;
  setManualPrice: (price: number | undefined) => void;
  manualDuration: number | undefined;
  setManualDuration: (mins: number | undefined) => void;
  savePriceToPet: boolean;
  setSavePriceToPet: (next: boolean) => void;
}) {
  const { data: allPetPricing = [] } = useQuery(
    groomingQueries.allPetServicePricing(),
  );
  const selectedPackage = groomingPackages.find(
    (p) => p.id === selectedPackageId,
  );
  const primaryPet = selectedPets[0];

  const resolved = useMemo(() => {
    if (!selectedPackage || !primaryPet) return null;
    return resolveEffectivePricing({
      petId: primaryPet.id,
      petSize: getPetSize(primaryPet),
      petBreed: primaryPet.breed || undefined,
      stylistId: stylistId || undefined,
      package: selectedPackage,
      petPricingOverrides: allPetPricing,
    });
  }, [selectedPackage, primaryPet, stylistId, allPetPricing]);

  if (!resolved || !primaryPet) return null;

  const finalPrice = manualPrice ?? resolved.price;
  const finalDuration = manualDuration ?? resolved.durationMin;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">Pricing & duration</Label>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Resolved from {primaryPet.name} / {getPetSize(primaryPet)} /{" "}
            {selectedPackage!.name}. Edit to override.
          </p>
        </div>
        <DollarSign className="size-4 text-muted-foreground" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px] flex items-center gap-1">
            Price <span className="text-muted-foreground">($)</span>
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={finalPrice}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) {
                setManualPrice(undefined);
              } else if (n === resolved.price) {
                setManualPrice(undefined);
              } else {
                setManualPrice(n);
              }
            }}
            className="mt-1 text-sm"
          />
          {manualPrice !== undefined && manualPrice !== resolved.price && (
            <p className="text-[10px] text-amber-700 mt-1">
              Override · resolved was ${resolved.price.toFixed(2)}
            </p>
          )}
        </div>
        <div>
          <Label className="text-[11px] flex items-center gap-1">
            Duration <span className="text-muted-foreground">(min)</span>
          </Label>
          <Input
            type="number"
            min={5}
            step="5"
            value={finalDuration}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) {
                setManualDuration(undefined);
              } else if (n === resolved.durationMin) {
                setManualDuration(undefined);
              } else {
                setManualDuration(n);
              }
            }}
            className="mt-1 text-sm"
          />
          {manualDuration !== undefined &&
            manualDuration !== resolved.durationMin && (
              <p className="text-[10px] text-amber-700 mt-1">
                Override · resolved was {resolved.durationMin} min
              </p>
            )}
        </div>
      </div>

      {/* Save-to-pet — only enabled when the user actually changed something,
          and the pet has a real id (drafted clients get negative ids). */}
      <label
        className={cn(
          "mt-3 flex items-center gap-2 text-[11px]",
          (manualPrice === undefined && manualDuration === undefined) ||
            primaryPet.id < 0
            ? "opacity-50"
            : "",
        )}
      >
        <Checkbox
          checked={savePriceToPet}
          disabled={
            (manualPrice === undefined && manualDuration === undefined) ||
            primaryPet.id < 0
          }
          onCheckedChange={(v) => setSavePriceToPet(!!v)}
        />
        <span>
          Save this price/duration as {primaryPet.name}&rsquo;s rate for{" "}
          {selectedPackage!.name}
        </span>
      </label>
    </div>
  );
}

// ─── Step 2: Schedule (density calendar + slot grid + mobile route) ────────
function GroomingSchedule({
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  isMobile,
  setIsMobile,
  selectedClient,
  selectedPets,
  packageId,
  stylistId,
  manualDuration,
}: {
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  isMobile: boolean;
  setIsMobile: (next: boolean) => void;
  selectedClient?: Client;
  selectedPets: Pet[];
  packageId: string;
  /** Primary stylist id — required to compute per-groomer slot availability. */
  stylistId: string;
  /** Manual duration override (minutes) — flows into slot sizing. */
  manualDuration: number | undefined;
}) {
  const { hours, rules, serviceDateBlocks, scheduleTimeOverrides, holidays } =
    useSettings();
  const mobile = useMobileGrooming();
  const accent = SERVICE_ACCENTS.grooming;
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Smart-scheduling settings drive slot granularity + recommended-buffer dots.
  const {
    smartSchedulingEnabled,
    slotGranularityMin,
    defaultBufferMin,
  } = useGroomingScheduling();

  const { data: allAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const { data: availability = [] } = useQuery(
    groomingQueries.allStylistAvailability(),
  );
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());

  // The route preview tints the van pin with the assigned groomer's color
  // so multi-van routes don't blur together. Fall back to the brand pink.
  const vanColorForStylist =
    stylistsData.find((s) => s.id === stylistId)?.calendarColor ?? "#ec4899";

  const selectedPkg = groomingPackages.find((p) => p.id === packageId);
  const serviceDurationForSlots =
    manualDuration ?? selectedPkg?.duration ?? 0;

  // Density dot for each calendar day — null = closed / off-day.
  const getDensityForDate = useCallback(
    (dateStr: string): DayDensity | null => {
      if (!stylistId || serviceDurationForSlots <= 0) return null;
      const d = new Date(dateStr + "T00:00:00");
      if (Number.isNaN(d.getTime())) return null;
      const workWindow = getStylistWorkWindow(
        stylistId,
        d.getDay(),
        availability,
      );
      return computeDayDensity({
        stylistId,
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
      stylistId,
      serviceDurationForSlots,
      availability,
      allAppointments,
      slotGranularityMin,
      smartSchedulingEnabled,
      defaultBufferMin,
    ],
  );

  // Synthetic address seed — keeps the new stop deterministic so it lines up
  // between this preview and the route planner page.
  const primaryPet = selectedPets[0];
  const newAddressSeed = useMemo(() => {
    const postal = (
      (selectedClient as { postalCode?: string } | undefined)?.postalCode ?? ""
    ).trim();
    if (primaryPet && selectedClient) {
      return `${primaryPet.name}-${selectedClient.name}-${selectedClient.id}`;
    }
    return postal;
  }, [primaryPet, selectedClient]);

  // Slot grid for the chosen stylist + date.
  const slotGrid = useMemo(() => {
    if (!stylistId || !startDate || serviceDurationForSlots <= 0) return [];
    const d = new Date(startDate + "T00:00:00");
    if (Number.isNaN(d.getTime())) return [];
    const workWindow = getStylistWorkWindow(
      stylistId,
      d.getDay(),
      availability,
    );
    if (!workWindow) return [];
    return computeSlotGrid({
      stylistId,
      dateStr: startDate,
      serviceDurationMin: serviceDurationForSlots,
      slotGranularityMin,
      workWindow,
      existingAppointments: allAppointments,
      smartSchedulingEnabled,
      bufferMin: defaultBufferMin,
      mobile: isMobile
        ? { newAddressSeed, facilityBaseSeed: "facility-home-base" }
        : undefined,
    });
  }, [
    stylistId,
    startDate,
    isMobile,
    serviceDurationForSlots,
    availability,
    allAppointments,
    slotGranularityMin,
    smartSchedulingEnabled,
    defaultBufferMin,
    newAddressSeed,
  ]);

  // Mobile route preview — show the day's stops + the tentative new one.
  const routePreviewData = useMemo(() => {
    if (!isMobile || !stylistId || !startDate) return null;
    const confirmed = getAppointmentsForStylistOnDate(
      stylistId,
      startDate,
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
          petName: primaryPet?.name ?? "New appointment",
        }
      : undefined;
    return { stops, tentativeStop };
  }, [
    isMobile,
    stylistId,
    startDate,
    primaryPet,
    allAppointments,
    newAddressSeed,
  ]);

  // Pick a sensible default min-date for the calendar — today, in local tz.
  const todayIso = useMemo(() => {
    const t = new Date();
    return formatDateString(t);
  }, []);

  // Client postal code (used by coverage checks). For mobile bookings without
  // a stored postal code, the segmented control is still shown but coverage
  // can't filter — staff will follow up.
  const postalCode = (selectedClient as { postalCode?: string } | undefined)
    ?.postalCode;

  // For mobile mode, walk the next 60 days and mark any date whose dow has
  // no service-area coverage (or whose postal code isn't in the active
  // areas) as disabled. This delivers the "areas covered are highlighted /
  // uncovered grayed out" UX described in the spec.
  const { coverageDisabledDates, coverageDisabledMessages } = useMemo(() => {
    if (!isMobile) {
      return {
        coverageDisabledDates: [] as Date[],
        coverageDisabledMessages: {} as Record<string, string>,
      };
    }
    const disabled: Date[] = [];
    const messages: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      const ds = formatDateString(d);
      if (postalCode) {
        const r = checkPostalCodeOnDay(
          mobile.serviceAreas,
          postalCode,
          dow,
        );
        if (r.status === "not-covered") {
          disabled.push(d);
          messages[ds] = "Outside your service area on this day.";
        }
      } else {
        // No postal code on file — only block days where there's no active
        // mobile area at all.
        const anyActive = mobile.serviceAreas.some(
          (a) => a.active && a.daysOfWeek.includes(dow),
        );
        if (!anyActive) {
          disabled.push(d);
          messages[ds] = "No mobile coverage on this day.";
        }
      }
    }
    return {
      coverageDisabledDates: disabled,
      coverageDisabledMessages: messages,
    };
  }, [isMobile, postalCode, mobile.serviceAreas]);

  const scheduleOverrides = React.useMemo(
    () =>
      scheduleTimeOverrides.filter(
        (o) => !o.services?.length || o.services.includes("grooming"),
      ),
    [scheduleTimeOverrides],
  );

  const { blockedDates, blockedMessages } = React.useMemo(() => {
    const blocks = serviceDateBlocks.filter(
      (b) => b.closed && b.services.includes("grooming"),
    );
    const dates = blocks.map((b) => {
      const [y, m, d] = b.date.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
    const messages: Record<string, string> = {};
    blocks.forEach(
      (b) => b.closureMessage && (messages[b.date] = b.closureMessage),
    );
    return { blockedDates: dates, blockedMessages: messages };
  }, [serviceDateBlocks]);

  const selectedDates = React.useMemo(() => {
    if (!startDate) return [];
    const [y, m, d] = startDate.split("-").map(Number);
    return [new Date(y, m - 1, d)];
  }, [startDate]);

  const [dateTimes, setDateTimes] = React.useState<
    Array<{ date: string; checkInTime: string; checkOutTime: string }>
  >(
    startDate && checkInTime
      ? [{ date: startDate, checkInTime, checkOutTime }]
      : [],
  );

  // Arrival windows generated from facility hours + configured window size.
  // Each window starts on the hour or half-hour and runs `windowMinutes`.
  const arrivalWindows = useMemo(() => {
    if (!isMobile || !startDate) return [];
    const dow = new Date(startDate + "T00:00:00").getDay();
    const dayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dow] as keyof typeof hours;
    const dayHours = hours[dayKey];
    if (!dayHours || !dayHours.isOpen) return [];
    const win = mobile.arrivalWindowMinutes;
    const [openH, openM] = dayHours.openTime.split(":").map(Number);
    const [closeH, closeM] = dayHours.closeTime.split(":").map(Number);
    const startMins = openH * 60 + openM;
    const endMins = closeH * 60 + closeM;
    const list: Array<{ start: string; end: string }> = [];
    for (let m = startMins; m + win <= endMins; m += win) {
      const fmt = (mm: number) =>
        `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
      list.push({ start: fmt(m), end: fmt(m + win) });
    }
    return list;
  }, [isMobile, startDate, hours, mobile.arrivalWindowMinutes]);

  // Show the waitlist CTA whenever a date is selected — covers both "no
  // slots configured" and "preferred time is gone" scenarios. The CTA is
  // always-visible-but-secondary so it never blocks the happy path.
  const showWaitlist = !!startDate;

  // Decide which sections render. When mobile is on but the facility has no
  // mobile config (no vans), fall back to salon-only and warn.
  const facilityHasMobile = mobile.enabled && mobile.vans.length > 0;

  const finalBlockedDates = [...blockedDates, ...coverageDisabledDates];
  const finalBlockedMessages = { ...blockedMessages, ...coverageDisabledMessages };

  const packageDuration = serviceDurationForSlots || selectedPkg?.duration || 60;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accent.bg,
          )}
        >
          <Scissors className={cn("size-5", accent.icon)} />
        </div>
        <div>
          <h3 className="font-semibold">Schedule grooming</h3>
          <p className="text-muted-foreground text-sm">
            {isMobile
              ? "We&rsquo;ll send a van to your address."
              : "Pick the date and time that works for you."}
          </p>
        </div>
      </div>

      {/* Mobile / Salon segmented control — only when facility has vans */}
      {facilityHasMobile && (
        <div className="rounded-xl border bg-card p-1">
          <div role="tablist" className="grid grid-cols-2 gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={!isMobile}
              onClick={() => setIsMobile(false)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                !isMobile
                  ? cn(accent.btnBg, "text-white shadow-sm")
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Building2 className="size-4" />
              Salon
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isMobile}
              onClick={() => setIsMobile(true)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                isMobile
                  ? cn(accent.btnBg, "text-white shadow-sm")
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Truck className="size-4" />
              Mobile
            </button>
          </div>
        </div>
      )}

      {isMobile && !postalCode && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-900">
            We don&rsquo;t have a postal code on file — staff will confirm
            coverage after submission.
          </p>
        </div>
      )}

      {isMobile && postalCode && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-600" />
          <p className="text-xs text-sky-900">
            Showing dates the van covers your area ({postalCode}). Other
            dates are dimmed.
          </p>
        </div>
      )}

      {/* SALON mode — density-aware calendar paired with the per-groomer
          slot grid. Both depend on a chosen stylist (assigned upstream in
          the Service step). Without one, fall back to the legacy calendar
          so the user can still pick a date. */}
      {!isMobile && stylistId ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="overflow-hidden rounded-xl border bg-card p-2 shadow-sm">
            <DensityCalendar
              value={startDate}
              onChange={(next) => {
                setStartDate(next);
                if (!next) {
                  setCheckInTime("");
                  setCheckOutTime("");
                }
              }}
              getDensityForDate={getDensityForDate}
              minDate={todayIso}
            />
            <div className="mt-2 flex items-center gap-3 px-1 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                Plenty
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-amber-500" />
                Limited
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-red-500" />
                Waitlist
              </span>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {startDate
                  ? new Date(startDate + "T00:00:00").toLocaleDateString(
                      "en-CA",
                      { weekday: "long", month: "short", day: "numeric" },
                    )
                  : "Pick a date"}
              </p>
              <span className="text-[10px] text-muted-foreground">
                {packageDuration} min slots
              </span>
            </div>
            {startDate ? (
              <SlotGrid
                slots={slotGrid}
                selectedStartTime={checkInTime}
                smartSchedulingEnabled={smartSchedulingEnabled}
                onSelect={(startTime) => {
                  setCheckInTime(startTime);
                  // Derive end from package/manual duration so the booking
                  // schema's check-out reflects the actual slot length.
                  const [h, m] = startTime.split(":").map(Number);
                  const endMins = h * 60 + m + packageDuration;
                  const fmt = (mm: number) =>
                    `${String(Math.floor(mm / 60) % 24).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
                  setCheckOutTime(fmt(endMins));
                }}
              />
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                Pick a day on the calendar to see open times.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <DateSelectionCalendar
            mode="single"
            selectedDates={selectedDates}
            onSelectionChange={(dates) => {
              if (dates.length > 0) {
                setStartDate(formatDateString(dates[0]));
              } else {
                setStartDate("");
                setCheckInTime("");
                setCheckOutTime("");
              }
            }}
            showTimeSelection={!isMobile}
            dateTimes={dateTimes}
            onDateTimesChange={(times) => {
              setDateTimes(times);
              if (times.length > 0) {
                setCheckInTime(times[0].checkInTime);
                setCheckOutTime(times[0].checkOutTime);
              }
            }}
            facilityHours={hours}
            scheduleTimeOverrides={scheduleOverrides}
            bookingRules={{
              minimumAdvanceBooking: rules.minimumAdvanceBooking,
              maximumAdvanceBooking: rules.maximumAdvanceBooking,
            }}
            disabledDates={finalBlockedDates}
            disabledDateMessages={finalBlockedMessages}
            holidays={holidays}
          />
        </div>
      )}

      {/* Mobile route preview — drops the new stop onto the groomer's day so
          staff can sanity-check drive time before committing. */}
      {isMobile && routePreviewData && (
        <MobileRouteMapPreview
          vanColor={vanColorForStylist}
          stops={routePreviewData.stops}
          tentativeStop={routePreviewData.tentativeStop}
          caption={`Route preview for ${startDate}${
            checkInTime ? ` · arriving ${checkInTime}` : ""
          }`}
        />
      )}

      {/* Mobile: arrival-window picker. Salon: time selection is baked into
          the calendar above via showTimeSelection. */}
      {isMobile && startDate && arrivalWindows.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Choose an arrival window
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {arrivalWindows.map((w) => {
              const active = checkInTime === w.start;
              return (
                <button
                  key={w.start}
                  type="button"
                  onClick={() => {
                    setCheckInTime(w.start);
                    // Estimate end of service from the window end + package
                    // duration so the appointment lands roughly correctly.
                    const [eh, em] = w.end.split(":").map(Number);
                    const endMins = eh * 60 + em + packageDuration;
                    const fmt = (mm: number) =>
                      `${String(Math.floor(mm / 60) % 24).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
                    setCheckOutTime(fmt(endMins));
                  }}
                  className={cn(
                    "rounded-xl border bg-card px-3 py-2 text-left transition",
                    active
                      ? cn(accent.border, "ring-2", accent.ring)
                      : "hover:bg-muted",
                  )}
                >
                  <p className="text-xs font-semibold">
                    {formatClockLabel(w.start)} – {formatClockLabel(w.end)}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    Arrival window
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground text-[10px]">
            Exact time depends on the van&rsquo;s route — we&rsquo;ll text
            you when we&rsquo;re ~15 min away.
          </p>
        </div>
      )}

      {/* Always-visible secondary CTA so customers can opt into a waitlist
          when no time works for them. */}
      {showWaitlist && (
        <div className="flex items-center justify-between rounded-xl border border-dashed bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Can&rsquo;t find a time?
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[11px]"
            onClick={() => setWaitlistOpen(true)}
          >
            Join the Waitlist
          </Button>
        </div>
      )}

      <GroomingWaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        selectedClient={selectedClient}
        selectedPets={selectedPets}
        packageId={packageId}
        isMobile={isMobile}
        postalCode={postalCode}
      />
    </div>
  );
}

function formatClockLabel(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Step 1: Add-ons (auto-attach + per-pet toggles) ────────────────────────
function GroomingAddOns({
  selectedPets,
  extraServices,
  setExtraServices,
  packageId,
  selectedGroomingAddOnIds,
  setSelectedGroomingAddOnIds,
  autoAttachedAddOnIds,
  setAutoAttachedAddOnIds,
}: {
  selectedPets: Pet[];
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    s: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  packageId: string;
  selectedGroomingAddOnIds: string[];
  setSelectedGroomingAddOnIds: (ids: string[]) => void;
  autoAttachedAddOnIds: string[];
  setAutoAttachedAddOnIds: (ids: string[]) => void;
}) {
  const accent = SERVICE_ACCENTS.grooming;
  const selectedPackage = groomingPackages.find((p) => p.id === packageId);
  const primaryPet = selectedPets[0];

  // Re-evaluate the package's default-add-on rules against the primary pet.
  // Auto-attached ids are owned by the rule engine: only previously auto-
  // attached entries are swapped out — manual selections survive.
  useEffect(() => {
    if (!selectedPackage) {
      if (autoAttachedAddOnIds.length > 0) {
        setSelectedGroomingAddOnIds(
          selectedGroomingAddOnIds.filter(
            (id) => !autoAttachedAddOnIds.includes(id),
          ),
        );
        setAutoAttachedAddOnIds([]);
      }
      return;
    }
    const matches = primaryPet
      ? resolveAutoAddOns(selectedPackage, {
          petSize: getPetSize(primaryPet),
          petWeight: primaryPet.weight,
          coatType: primaryPet.coatType as
            | import("@/types/grooming").CoatType
            | undefined,
          breed: primaryPet.breed || undefined,
        })
      : [];
    const sameSet =
      matches.length === autoAttachedAddOnIds.length &&
      matches.every((id) => autoAttachedAddOnIds.includes(id));
    if (sameSet) return;
    const withoutOldAutos = selectedGroomingAddOnIds.filter(
      (id) => !autoAttachedAddOnIds.includes(id),
    );
    const merged = new Set(withoutOldAutos);
    for (const id of matches) merged.add(id);
    setSelectedGroomingAddOnIds(Array.from(merged));
    setAutoAttachedAddOnIds(matches);
  }, [
    selectedPackage,
    primaryPet,
    autoAttachedAddOnIds,
    selectedGroomingAddOnIds,
    setSelectedGroomingAddOnIds,
    setAutoAttachedAddOnIds,
  ]);

  function toggleGroomingAddOn(id: string) {
    if (selectedGroomingAddOnIds.includes(id)) {
      setSelectedGroomingAddOnIds(
        selectedGroomingAddOnIds.filter((x) => x !== id),
      );
    } else {
      setSelectedGroomingAddOnIds([...selectedGroomingAddOnIds, id]);
    }
    // Once user touches it, it's no longer "auto" — keep it pinned to their
    // explicit choice so the rule effect won't re-add or re-remove it.
    if (autoAttachedAddOnIds.includes(id)) {
      setAutoAttachedAddOnIds(autoAttachedAddOnIds.filter((x) => x !== id));
    }
  }

  // Grooming-package add-ons: pull straight from the GROOMING_ADD_ONS catalog
  // (these are tied to package rules, separate from facility-wide ServiceAddOns).
  const groomingAddOnCatalog = ADD_ONS;
  const groomingAddOnSubtotal = selectedGroomingAddOnIds.reduce((sum, id) => {
    const ao = groomingAddOnCatalog.find((a) => a.id === id);
    return sum + (ao?.price ?? 0);
  }, 0);
  // Source the catalog from localStorage (facility may have customized) with
  // fallback to the seed list — same pattern boarding/daycare use.
  const catalog = React.useMemo<ServiceAddOn[]>(() => {
    if (typeof window === "undefined") return defaultServiceAddOns;
    try {
      const stored = localStorage.getItem("settings-service-addons");
      if (stored) return JSON.parse(stored) as ServiceAddOn[];
    } catch {
      /* ignore */
    }
    return defaultServiceAddOns;
  }, []);
  // Available add-ons for this service. Hidden when inactive or when the
  // pet-type filter excludes the only selected pet species.
  const available: ServiceAddOn[] = catalog.filter(
    (a) =>
      a.isActive &&
      (a.applicableServices?.includes("grooming") ||
        (a.applicableServices?.length ?? 0) === 0),
  );

  // For each pet, do we have this add-on in extraServices?
  const hasFor = (addonId: string, petId: number) =>
    extraServices.some(
      (es) => es.serviceId === addonId && es.petId === petId,
    );

  const toggle = (addon: ServiceAddOn, petId: number, on: boolean) => {
    if (addon.isRequired) return; // Locked — required add-ons can't be removed.
    if (on) {
      setExtraServices([
        ...extraServices,
        { serviceId: addon.id, quantity: 1, petId },
      ]);
    } else {
      setExtraServices(
        extraServices.filter(
          (es) => !(es.serviceId === addon.id && es.petId === petId),
        ),
      );
    }
  };

  // Running subtotal across all selected pets and toggled add-ons. Reflects
  // the same flat per-unit price model the BookingModal price calc uses for
  // grooming add-ons (no size modifiers applied here — that's a final-price
  // step on the facility side).
  const subtotal = extraServices.reduce((sum, es) => {
    const addon = available.find((a) => a.id === es.serviceId);
    if (!addon) return sum;
    return sum + addon.price * es.quantity;
  }, 0);

  if (selectedPets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Select a pet first to see available add-ons.
      </div>
    );
  }
  if (available.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No add-ons are configured for grooming. You&rsquo;re all set —
        continue to schedule.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accent.bg,
          )}
        >
          <Sparkle className={cn("size-5", accent.icon)} />
        </div>
        <div>
          <h3 className="font-semibold">Optional add-ons</h3>
          <p className="text-muted-foreground text-sm">
            Toggle the extras you&rsquo;d like. Required items are included
            automatically.
          </p>
        </div>
      </div>

      {/* Package-driven grooming add-ons (auto-attached + manual). Rendered
          when a package is chosen — these come from GROOMING_ADD_ONS and the
          package's defaultAddOnRules. */}
      {selectedPackage && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            For this {selectedPackage.name}
          </p>
          <div className="space-y-1.5">
            {groomingAddOnCatalog.map((ao) => {
              const checked = selectedGroomingAddOnIds.includes(ao.id);
              const isAuto = autoAttachedAddOnIds.includes(ao.id);
              return (
                <div
                  key={ao.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5",
                    checked && accent.border,
                    isAuto && "bg-pink-50/40 dark:bg-pink-950/10",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{ao.name}</p>
                      {isAuto && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                          <Sparkles className="size-2.5" />
                          Auto-attached
                        </span>
                      )}
                    </div>
                    {ao.duration > 0 && (
                      <p className="text-muted-foreground line-clamp-1 text-[11px]">
                        +{ao.duration} min
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn("text-xs font-semibold", accent.price)}>
                      +${ao.price}
                    </span>
                    <Switch
                      checked={checked}
                      onCheckedChange={() => toggleGroomingAddOn(ao.id)}
                      aria-label={`${ao.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {groomingAddOnSubtotal > 0 && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-2">
              <span className="text-xs font-medium">
                Package add-ons subtotal
              </span>
              <span className="text-sm font-bold tabular-nums">
                ${groomingAddOnSubtotal.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {selectedPackage && available.length > 0 && <Separator />}

      <div className="space-y-3">
        {selectedPets.map((pet) => (
          <div key={pet.id} className="space-y-2">
            {selectedPets.length > 1 && (
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                For {pet.name}
              </p>
            )}
            <div className="space-y-1.5">
              {available.map((addon) => {
                const checked = addon.isRequired || hasFor(addon.id, pet.id);
                return (
                  <div
                    key={`${pet.id}-${addon.id}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5",
                      checked && !addon.isRequired && accent.border,
                      addon.isRequired &&
                        "border-emerald-300 bg-emerald-50/50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">
                          {addon.name}
                        </p>
                        {addon.isRequired && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                            <Lock className="size-2.5" />
                            Required
                          </span>
                        )}
                        {addon.isDefault && !addon.isRequired && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700">
                            Default
                          </span>
                        )}
                      </div>
                      {addon.description && (
                        <p className="text-muted-foreground line-clamp-1 text-[11px]">
                          {addon.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={cn("text-xs font-semibold", accent.price)}>
                        +${addon.price}
                      </span>
                      <Switch
                        checked={checked}
                        disabled={addon.isRequired}
                        onCheckedChange={(v) => toggle(addon, pet.id, v)}
                        aria-label={`${addon.name} for ${pet.name}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-2.5">
        <span className="text-sm font-medium">Add-ons subtotal</span>
        <span className="text-base font-bold tabular-nums">
          ${subtotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
