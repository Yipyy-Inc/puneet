"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientFilters } from "@/hooks/use-client-filters";
import {
  TriToggle,
  CheckGroup,
  TextFilter,
  RangeFilter,
  DayRangePreset,
} from "./filters/FilterInputs";

// ========================================
// Categories
// ========================================

const CATEGORIES = [
  { id: "account", label: "Account Status" },
  { id: "profile", label: "Client Profile" },
  { id: "household", label: "Household" },
  { id: "pets", label: "Pet Basics" },
  { id: "health", label: "Health & Safety" },
  { id: "bookings", label: "Booking Activity" },
  { id: "forms", label: "Forms & Compliance" },
  { id: "financial", label: "Financial" },
  { id: "risk", label: "Risk & Flags" },
  { id: "marketing", label: "Marketing" },
  { id: "location", label: "Location" },
  { id: "staff", label: "Staff Assignment" },
  { id: "funnel", label: "Booking Funnel" },
] as const;

// ========================================
// Active Filter Chips
// ========================================

export function ActiveFilterChips({
  filters,
  setFilter,
  clearAll,
  activeCount,
}: {
  filters: ClientFilters;
  setFilter: <K extends keyof ClientFilters>(k: K, v: ClientFilters[K]) => void;
  clearAll: () => void;
  activeCount: number;
}) {
  if (activeCount === 0) return null;

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.status.length > 0)
    chips.push({
      label: `Status: ${filters.status.join(", ")}`,
      onRemove: () => setFilter("status", []),
    });
  if (filters.hasAddress !== "any")
    chips.push({
      label: `Address: ${filters.hasAddress}`,
      onRemove: () => setFilter("hasAddress", "any"),
    });
  if (filters.hasEmergencyContact !== "any")
    chips.push({
      label: `Emergency: ${filters.hasEmergencyContact}`,
      onRemove: () => setFilter("hasEmergencyContact", "any"),
    });
  if (filters.hasPets !== "any")
    chips.push({
      label: `Pets: ${filters.hasPets}`,
      onRemove: () => setFilter("hasPets", "any"),
    });
  if (filters.petTypes.length > 0)
    chips.push({
      label: filters.petTypes.join(", "),
      onRemove: () => setFilter("petTypes", []),
    });
  if (filters.hasAllergies !== "any")
    chips.push({
      label: `Allergies: ${filters.hasAllergies}`,
      onRemove: () => setFilter("hasAllergies", "any"),
    });
  if (filters.hasSpecialNeeds !== "any")
    chips.push({
      label: `Special needs: ${filters.hasSpecialNeeds}`,
      onRemove: () => setFilter("hasSpecialNeeds", "any"),
    });
  if (filters.petName)
    chips.push({
      label: `Pet: "${filters.petName}"`,
      onRemove: () => setFilter("petName", ""),
    });
  if (filters.petBreed)
    chips.push({
      label: `Breed: "${filters.petBreed}"`,
      onRemove: () => setFilter("petBreed", ""),
    });
  if (filters.petWeightMin || filters.petWeightMax)
    chips.push({
      label: `Weight: ${filters.petWeightMin || "0"}-${filters.petWeightMax || "∞"} lbs`,
      onRemove: () => {
        setFilter("petWeightMin", "");
        setFilter("petWeightMax", "");
      },
    });
  if (filters.petAgeMin || filters.petAgeMax)
    chips.push({
      label: `Age: ${filters.petAgeMin || "0"}-${filters.petAgeMax || "∞"} yrs`,
      onRemove: () => {
        setFilter("petAgeMin", "");
        setFilter("petAgeMax", "");
      },
    });
  if (filters.petSex !== "any")
    chips.push({
      label: `Sex: ${filters.petSex}`,
      onRemove: () => setFilter("petSex", "any"),
    });
  if (filters.petSpayedNeutered !== "any")
    chips.push({
      label: `Spayed/neutered: ${filters.petSpayedNeutered}`,
      onRemove: () => setFilter("petSpayedNeutered", "any"),
    });
  if (filters.petCoatType.length > 0)
    chips.push({
      label: `Coat: ${filters.petCoatType.join(", ")}`,
      onRemove: () => setFilter("petCoatType", []),
    });
  if (filters.petColor)
    chips.push({
      label: `Color: "${filters.petColor}"`,
      onRemove: () => setFilter("petColor", ""),
    });
  if (filters.petEnergyLevel !== "any")
    chips.push({
      label: `Energy: ${filters.petEnergyLevel}`,
      onRemove: () => setFilter("petEnergyLevel", "any"),
    });
  if (filters.petStatus.length > 0)
    chips.push({
      label: `Pet status: ${filters.petStatus.join(", ")}`,
      onRemove: () => setFilter("petStatus", []),
    });
  if (filters.services.length > 0)
    chips.push({
      label: `Service: ${filters.services.join(", ")}`,
      onRemove: () => setFilter("services", []),
    });
  if (filters.hasActiveBooking !== "any")
    chips.push({
      label: `Active booking: ${filters.hasActiveBooking}`,
      onRemove: () => setFilter("hasActiveBooking", "any"),
    });
  if (filters.vaccineExpiryDays !== null) {
    const r = filters.vaccineExpiryDays;
    const lbl =
      r.preset != null
        ? `Vaccine: ${r.preset}d`
        : r.min != null && r.max != null
          ? `Vaccine: ${r.min}-${r.max} days`
          : r.min != null
            ? `Vaccine: >${r.min} days`
            : `Vaccine: <${r.max} days`;
    chips.push({
      label: lbl,
      onRemove: () => setFilter("vaccineExpiryDays", null),
    });
  }
  if (filters.lastVisitDays !== null) {
    const r = filters.lastVisitDays;
    const lbl =
      r.preset != null
        ? `No visit: ${r.preset}d`
        : r.min != null && r.max != null
          ? `No visit: ${r.min}-${r.max} days`
          : r.min != null
            ? `No visit: >${r.min} days`
            : `No visit: <${r.max} days`;
    chips.push({
      label: lbl,
      onRemove: () => setFilter("lastVisitDays", null),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge
          key={chip.label}
          variant="secondary"
          className="gap-1 rounded-full border border-sky-200 bg-sky-50/80 pr-1 text-xs font-medium text-sky-700"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="-mr-0.5 rounded-full p-0.5 text-sky-600 transition-colors hover:bg-sky-200/70 hover:text-sky-800"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <button
        onClick={clearAll}
        className="text-[11px] font-medium text-sky-700 transition-colors hover:text-sky-800 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

// ========================================
// Main Filter Panel
// ========================================

export function ClientFiltersInline({
  filters,
  setFilter,
  toggleArrayItem,
}: {
  filters: ClientFilters;
  setFilter: <K extends keyof ClientFilters>(k: K, v: ClientFilters[K]) => void;
  toggleArrayItem: (
    key: "status" | "petTypes" | "services" | "petCoatType" | "petStatus",
    item: string,
  ) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("account");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Build a flat, searchable index of every filter control
  const filterRegistry = useMemo(() => {
    const entries: {
      label: string;
      categoryId: string;
      categoryLabel: string;
      key: string;
      element: React.ReactNode;
    }[] = [];

    const add = (
      label: string,
      catId: string,
      catLabel: string,
      element: React.ReactNode,
    ) => {
      entries.push({
        label,
        categoryId: catId,
        categoryLabel: catLabel,
        key: `${catId}-${label}`,
        element,
      });
    };

    // Account Status
    add(
      "Status",
      "account",
      "Account Status",
      <CheckGroup
        label="Status"
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "new", label: "New" },
          { value: "archived", label: "Archived" },
          { value: "blacklisted", label: "Blacklisted" },
        ]}
        selected={filters.status}
        onToggle={(v) => toggleArrayItem("status", v)}
      />,
    );
    add(
      "Blocked from messaging",
      "account",
      "Account Status",
      <TriToggle
        label="Blocked from messaging"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Blocked from booking",
      "account",
      "Account Status",
      <TriToggle
        label="Blocked from booking"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Missing profile info",
      "account",
      "Account Status",
      <TriToggle
        label="Missing profile info"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Client Profile
    add(
      "Email on file",
      "profile",
      "Client Profile",
      <TriToggle
        label="Email on file"
        value={filters.hasAddress}
        onChange={(v) => setFilter("hasAddress", v)}
      />,
    );
    add(
      "Address on file",
      "profile",
      "Client Profile",
      <TriToggle
        label="Address on file"
        value={filters.hasAddress}
        onChange={(v) => setFilter("hasAddress", v)}
      />,
    );
    add(
      "Emergency contact",
      "profile",
      "Client Profile",
      <TriToggle
        label="Emergency contact"
        value={filters.hasEmergencyContact}
        onChange={(v) => setFilter("hasEmergencyContact", v)}
      />,
    );
    add(
      "Marketing consent",
      "profile",
      "Client Profile",
      <TriToggle
        label="Marketing consent"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "SMS consent",
      "profile",
      "Client Profile",
      <TriToggle
        label="SMS consent"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Household
    add(
      "Has pets",
      "household",
      "Household",
      <TriToggle
        label="Has pets"
        value={filters.hasPets}
        onChange={(v) => setFilter("hasPets", v)}
      />,
    );
    add(
      "Multiple active pets",
      "household",
      "Household",
      <TriToggle
        label="Multiple active pets"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Has inactive pets",
      "household",
      "Household",
      <TriToggle
        label="Has inactive pets"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Pet Basics
    add(
      "Pet name",
      "pets",
      "Pet Basics",
      <TextFilter
        label="Pet name"
        value={filters.petName}
        onChange={(v) => setFilter("petName", v)}
        placeholder="Search by pet name..."
      />,
    );
    add(
      "Species",
      "pets",
      "Pet Basics",
      <CheckGroup
        label="Species"
        options={[
          { value: "Dog", label: "Dog" },
          { value: "Cat", label: "Cat" },
          { value: "Other", label: "Other" },
        ]}
        selected={filters.petTypes}
        onToggle={(v) => toggleArrayItem("petTypes", v)}
      />,
    );
    add(
      "Breed",
      "pets",
      "Pet Basics",
      <TextFilter
        label="Breed"
        value={filters.petBreed}
        onChange={(v) => setFilter("petBreed", v)}
        placeholder="Search by breed..."
      />,
    );
    add(
      "Weight range",
      "pets",
      "Pet Basics",
      <RangeFilter
        label="Weight range (lbs)"
        minValue={filters.petWeightMin}
        maxValue={filters.petWeightMax}
        onMinChange={(v) => setFilter("petWeightMin", v)}
        onMaxChange={(v) => setFilter("petWeightMax", v)}
        minPlaceholder="Min"
        maxPlaceholder="Max"
      />,
    );
    add(
      "Age range",
      "pets",
      "Pet Basics",
      <RangeFilter
        label="Age range (years)"
        minValue={filters.petAgeMin}
        maxValue={filters.petAgeMax}
        onMinChange={(v) => setFilter("petAgeMin", v)}
        onMaxChange={(v) => setFilter("petAgeMax", v)}
        minPlaceholder="Min"
        maxPlaceholder="Max"
      />,
    );
    add(
      "Sex",
      "pets",
      "Pet Basics",
      <TriToggle
        label="Sex"
        value={
          filters.petSex === "any"
            ? "any"
            : filters.petSex === "male"
              ? "yes"
              : "no"
        }
        onChange={(v) =>
          setFilter(
            "petSex",
            v === "any" ? "any" : v === "yes" ? "male" : "female",
          )
        }
      />,
    );
    add(
      "Spayed / neutered",
      "pets",
      "Pet Basics",
      <TriToggle
        label="Spayed / neutered"
        value={filters.petSpayedNeutered}
        onChange={(v) => setFilter("petSpayedNeutered", v)}
      />,
    );
    add(
      "Coat type",
      "pets",
      "Pet Basics",
      <CheckGroup
        label="Coat type"
        options={[
          { value: "short", label: "Short" },
          { value: "medium", label: "Medium" },
          { value: "long", label: "Long" },
          { value: "wire", label: "Wire" },
          { value: "curly", label: "Curly" },
          { value: "hairless", label: "Hairless" },
        ]}
        selected={filters.petCoatType}
        onToggle={(v) => toggleArrayItem("petCoatType", v)}
      />,
    );
    add(
      "Color",
      "pets",
      "Pet Basics",
      <TextFilter
        label="Color"
        value={filters.petColor}
        onChange={(v) => setFilter("petColor", v)}
        placeholder="Search by color..."
      />,
    );
    add(
      "Energy level",
      "pets",
      "Pet Basics",
      <TriToggle
        label="Energy level"
        value={
          filters.petEnergyLevel === "any"
            ? "any"
            : filters.petEnergyLevel === "high"
              ? "yes"
              : "no"
        }
        onChange={(v) =>
          setFilter(
            "petEnergyLevel",
            v === "any" ? "any" : v === "yes" ? "high" : "low",
          )
        }
      />,
    );
    add(
      "Pet status",
      "pets",
      "Pet Basics",
      <CheckGroup
        label="Pet status"
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "deceased", label: "Deceased" },
        ]}
        selected={filters.petStatus}
        onToggle={(v) => toggleArrayItem("petStatus", v)}
      />,
    );
    add(
      "Has allergies",
      "pets",
      "Pet Basics",
      <TriToggle
        label="Has allergies"
        value={filters.hasAllergies}
        onChange={(v) => setFilter("hasAllergies", v)}
      />,
    );
    add(
      "Special needs",
      "pets",
      "Pet Basics",
      <TriToggle
        label="Special needs"
        value={filters.hasSpecialNeeds}
        onChange={(v) => setFilter("hasSpecialNeeds", v)}
      />,
    );
    add(
      "Birthday month",
      "pets",
      "Pet Basics",
      <TriToggle
        label="Birthday month"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Pet tags",
      "pets",
      "Pet Basics",
      <TriToggle label="Pet tags" value="any" onChange={() => {}} comingSoon />,
    );

    // Health & Safety
    add(
      "Has allergies",
      "health",
      "Health & Safety",
      <TriToggle
        label="Has allergies"
        value={filters.hasAllergies}
        onChange={(v) => setFilter("hasAllergies", v)}
      />,
    );
    add(
      "Special needs",
      "health",
      "Health & Safety",
      <TriToggle
        label="Special needs"
        value={filters.hasSpecialNeeds}
        onChange={(v) => setFilter("hasSpecialNeeds", v)}
      />,
    );
    add(
      "Medication required",
      "health",
      "Health & Safety",
      <TriToggle
        label="Medication required"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Senior pet",
      "health",
      "Health & Safety",
      <TriToggle
        label="Senior pet"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Vaccine expired",
      "health",
      "Health & Safety",
      <TriToggle
        label="Vaccine expired"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Vaccine expiring within",
      "health",
      "Health & Safety",
      <DayRangePreset
        label="Vaccine expiring within"
        presets={[
          { value: 7, label: "7d" },
          { value: 30, label: "30d" },
          { value: 60, label: "60d" },
          { value: 90, label: "90d" },
        ]}
        value={filters.vaccineExpiryDays}
        onChange={(v) => setFilter("vaccineExpiryDays", v)}
      />,
    );

    // Booking Activity
    add(
      "Service used",
      "bookings",
      "Booking Activity",
      <CheckGroup
        label="Service used"
        options={[
          { value: "daycare", label: "Daycare" },
          { value: "boarding", label: "Boarding" },
          { value: "grooming", label: "Grooming" },
          { value: "training", label: "Training" },
        ]}
        selected={filters.services}
        onToggle={(v) => toggleArrayItem("services", v)}
      />,
    );
    add(
      "Active booking",
      "bookings",
      "Booking Activity",
      <TriToggle
        label="Active booking"
        value={filters.hasActiveBooking}
        onChange={(v) => setFilter("hasActiveBooking", v)}
      />,
    );
    add(
      "No visit in",
      "bookings",
      "Booking Activity",
      <DayRangePreset
        label="No visit in"
        presets={[
          { value: 30, label: "30d" },
          { value: 60, label: "60d" },
          { value: 90, label: "90d" },
          { value: 180, label: "6mo" },
        ]}
        value={filters.lastVisitDays}
        onChange={(v) => setFilter("lastVisitDays", v)}
      />,
    );
    add(
      "Checked in today",
      "bookings",
      "Booking Activity",
      <TriToggle
        label="Checked in today"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Forms & Compliance
    add(
      "Intake form completed",
      "forms",
      "Forms & Compliance",
      <TriToggle
        label="Intake form completed"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Waiver signed",
      "forms",
      "Forms & Compliance",
      <TriToggle
        label="Waiver signed"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Evaluation completed",
      "forms",
      "Forms & Compliance",
      <TriToggle
        label="Evaluation completed"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Missing required docs",
      "forms",
      "Forms & Compliance",
      <TriToggle
        label="Missing required docs"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Express Check-in",
      "forms",
      "Forms & Compliance",
      <TriToggle
        label="Express Check-in"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Financial
    add(
      "Outstanding balance",
      "financial",
      "Financial",
      <TriToggle
        label="Outstanding balance"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Card on file",
      "financial",
      "Financial",
      <TriToggle
        label="Card on file"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Membership active",
      "financial",
      "Financial",
      <TriToggle
        label="Membership active"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Package active",
      "financial",
      "Financial",
      <TriToggle
        label="Package active"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Invoice overdue",
      "financial",
      "Financial",
      <TriToggle
        label="Invoice overdue"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Auto-pay enabled",
      "financial",
      "Financial",
      <TriToggle
        label="Auto-pay enabled"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Risk & Flags
    add(
      "Alert note present",
      "risk",
      "Risk & Flags",
      <TriToggle
        label="Alert note present"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "No-show history",
      "risk",
      "Risk & Flags",
      <TriToggle
        label="No-show history"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Cancellation history",
      "risk",
      "Risk & Flags",
      <TriToggle
        label="Cancellation history"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Complaint history",
      "risk",
      "Risk & Flags",
      <TriToggle
        label="Complaint history"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Requires manager approval",
      "risk",
      "Risk & Flags",
      <TriToggle
        label="Requires manager approval"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Special handling",
      "risk",
      "Risk & Flags",
      <TriToggle
        label="Special handling"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Marketing
    add(
      "VIP client",
      "marketing",
      "Marketing",
      <TriToggle
        label="VIP client"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Lapsed client",
      "marketing",
      "Marketing",
      <TriToggle
        label="Lapsed client"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Birthday this month",
      "marketing",
      "Marketing",
      <TriToggle
        label="Birthday this month"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Referral client",
      "marketing",
      "Marketing",
      <TriToggle
        label="Referral client"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Loyalty enrolled",
      "marketing",
      "Marketing",
      <TriToggle
        label="Loyalty enrolled"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "SMS subscriber",
      "marketing",
      "Marketing",
      <TriToggle
        label="SMS subscriber"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Location
    add(
      "City",
      "location",
      "Location",
      <TextFilter
        label="City"
        value=""
        onChange={() => {}}
        placeholder="Enter city..."
        comingSoon
      />,
    );
    add(
      "Postal / ZIP code",
      "location",
      "Location",
      <TextFilter
        label="Postal / ZIP code"
        value=""
        onChange={() => {}}
        placeholder="Enter code..."
        comingSoon
      />,
    );
    add(
      "Multi-location client",
      "location",
      "Location",
      <TriToggle
        label="Multi-location client"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Staff Assignment
    add(
      "Staff notes present",
      "staff",
      "Staff Assignment",
      <TriToggle
        label="Staff notes present"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Needs manager review",
      "staff",
      "Staff Assignment",
      <TriToggle
        label="Needs manager review"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Internal follow-up",
      "staff",
      "Staff Assignment",
      <TriToggle
        label="Internal follow-up"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    // Booking Funnel
    add(
      "Abandoned booking",
      "funnel",
      "Booking Funnel",
      <TriToggle
        label="Abandoned booking"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Never booked after signup",
      "funnel",
      "Booking Funnel",
      <TriToggle
        label="Never booked after signup"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "On waitlist",
      "funnel",
      "Booking Funnel",
      <TriToggle
        label="On waitlist"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Trial requested",
      "funnel",
      "Booking Funnel",
      <TriToggle
        label="Trial requested"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );
    add(
      "Online booking only",
      "funnel",
      "Booking Funnel",
      <TriToggle
        label="Online booking only"
        value="any"
        onChange={() => {}}
        comingSoon
      />,
    );

    return entries;
  }, [filters, setFilter, toggleArrayItem]);

  // Search results grouped by category
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    const matched = filterRegistry.filter((f) =>
      f.label.toLowerCase().includes(q),
    );
    const groups: {
      categoryId: string;
      categoryLabel: string;
      items: typeof matched;
    }[] = [];
    for (const entry of matched) {
      let group = groups.find((g) => g.categoryId === entry.categoryId);
      if (!group) {
        group = {
          categoryId: entry.categoryId,
          categoryLabel: entry.categoryLabel,
          items: [],
        };
        groups.push(group);
      }
      group.items.push(entry);
    }
    return groups;
  }, [isSearching, searchQuery, filterRegistry]);

  // Get entries for a specific category (used in tabbed view)
  const categoryEntries = useMemo(
    () => filterRegistry.filter((f) => f.categoryId === activeCategory),
    [filterRegistry, activeCategory],
  );

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-linear-to-br from-sky-50/70 via-white to-indigo-50/40 shadow-sm">
      {/* Search bar */}
      <div className="border-b border-slate-200/80 bg-white/75 px-3 py-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchQuery("");
            }}
            placeholder='Search filters... e.g. "vaccine", "balance", "VIP"'
            className="h-7 border-0 bg-transparent pl-7 text-xs text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
          />
          {isSearching && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 transition-colors hover:text-sky-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        /* Search results view */
        <CardContent className="max-h-[280px] overflow-y-auto py-3">
          {searchResults.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No filters matching &ldquo;{searchQuery}&rdquo;
            </p>
          ) : (
            <div className="space-y-4">
              {searchResults.map((group) => (
                <div key={group.categoryId}>
                  <p className="mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                    {group.categoryLabel}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((item) => (
                      <div key={item.key}>{item.element}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      ) : (
        /* Normal tabbed view */
        <div className="flex">
          {/* Left: category nav */}
          <div className="border-r border-slate-200/80 bg-slate-50/70 py-1">
            <div className="max-h-[280px] overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-[11px] font-medium whitespace-nowrap transition-colors",
                    activeCategory === cat.id
                      ? "border-r-2 border-r-sky-500 bg-white text-sky-700"
                      : "text-slate-600 hover:bg-sky-50/70 hover:text-slate-900",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: filter content from registry */}
          <CardContent className="max-h-[280px] flex-1 overflow-y-auto bg-white/80 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              {categoryEntries.map((entry) => (
                <div key={entry.key}>{entry.element}</div>
              ))}
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}
