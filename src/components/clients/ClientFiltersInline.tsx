"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientFilters } from "@/hooks/use-client-filters";
import {
  TriToggle,
  CheckGroup,
  TextFilter,
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
          className="gap-1 pr-1 text-xs font-normal"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="hover:bg-muted -mr-0.5 rounded-full p-0.5"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <button
        onClick={clearAll}
        className="text-muted-foreground text-[11px] hover:underline"
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
    key: "status" | "petTypes" | "services",
    item: string,
  ) => void;
}) {
  const [activeCategory, setActiveCategory] = useState("account");

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Left: category nav */}
        <div className="bg-muted/30 border-r py-1">
          <div className="max-h-[280px] overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-[11px] font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat.id
                    ? "bg-background text-foreground border-r-foreground border-r-2"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: filter content */}
        <CardContent className="max-h-[280px] flex-1 overflow-y-auto py-3">
          {/* 1. Account Status */}
          {activeCategory === "account" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
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
              />
              <TriToggle
                label="Blocked from messaging"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Blocked from booking"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Missing profile info"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 2. Client Profile */}
          {activeCategory === "profile" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Email on file"
                value={filters.hasAddress}
                onChange={(v) => setFilter("hasAddress", v)}
              />
              <TriToggle
                label="Address on file"
                value={filters.hasAddress}
                onChange={(v) => setFilter("hasAddress", v)}
              />
              <TriToggle
                label="Emergency contact"
                value={filters.hasEmergencyContact}
                onChange={(v) => setFilter("hasEmergencyContact", v)}
              />
              <TriToggle
                label="Marketing consent"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="SMS consent"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 3. Household */}
          {activeCategory === "household" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Has pets"
                value={filters.hasPets}
                onChange={(v) => setFilter("hasPets", v)}
              />
              <TriToggle
                label="Multiple active pets"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Has inactive pets"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 4. Pet Basics */}
          {activeCategory === "pets" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <CheckGroup
                label="Species"
                options={[
                  { value: "Dog", label: "Dog" },
                  { value: "Cat", label: "Cat" },
                  { value: "Other", label: "Other" },
                ]}
                selected={filters.petTypes}
                onToggle={(v) => toggleArrayItem("petTypes", v)}
              />
              <TriToggle
                label="Has allergies"
                value={filters.hasAllergies}
                onChange={(v) => setFilter("hasAllergies", v)}
              />
              <TriToggle
                label="Special needs"
                value={filters.hasSpecialNeeds}
                onChange={(v) => setFilter("hasSpecialNeeds", v)}
              />
              <TriToggle
                label="Spayed / neutered"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 5. Health & Safety */}
          {activeCategory === "health" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Has allergies"
                value={filters.hasAllergies}
                onChange={(v) => setFilter("hasAllergies", v)}
              />
              <TriToggle
                label="Special needs"
                value={filters.hasSpecialNeeds}
                onChange={(v) => setFilter("hasSpecialNeeds", v)}
              />
              <TriToggle
                label="Medication required"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Senior pet"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Vaccine expired"
                value="any"
                onChange={() => {}}
                comingSoon
              />
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
              />
            </div>
          )}

          {/* 6. Booking Activity */}
          {activeCategory === "bookings" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
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
              />
              <TriToggle
                label="Active booking"
                value={filters.hasActiveBooking}
                onChange={(v) => setFilter("hasActiveBooking", v)}
              />
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
              />
              <TriToggle
                label="Checked in today"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 7. Forms & Compliance */}
          {activeCategory === "forms" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Intake form completed"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Waiver signed"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Evaluation completed"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Missing required docs"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="YipyyGo check-in"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 8. Financial */}
          {activeCategory === "financial" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Outstanding balance"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Card on file"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Membership active"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Package active"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Invoice overdue"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Auto-pay enabled"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 9. Risk & Flags */}
          {activeCategory === "risk" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Alert note present"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="No-show history"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Cancellation history"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Complaint history"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Requires manager approval"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Special handling"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 10. Marketing */}
          {activeCategory === "marketing" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="VIP client"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Lapsed client"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Birthday this month"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Referral client"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Loyalty enrolled"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="SMS subscriber"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 11. Location */}
          {activeCategory === "location" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TextFilter
                label="City"
                value=""
                onChange={() => {}}
                placeholder="Enter city..."
                comingSoon
              />
              <TextFilter
                label="Postal / ZIP code"
                value=""
                onChange={() => {}}
                placeholder="Enter code..."
                comingSoon
              />
              <TriToggle
                label="Multi-location client"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 12. Staff Assignment */}
          {activeCategory === "staff" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Staff notes present"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Needs manager review"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Internal follow-up"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}

          {/* 13. Booking Funnel */}
          {activeCategory === "funnel" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 lg:grid-cols-4">
              <TriToggle
                label="Abandoned booking"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Never booked after signup"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="On waitlist"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Trial requested"
                value="any"
                onChange={() => {}}
                comingSoon
              />
              <TriToggle
                label="Online booking only"
                value="any"
                onChange={() => {}}
                comingSoon
              />
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
