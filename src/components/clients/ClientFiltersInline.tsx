"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientFilters } from "@/hooks/use-client-filters";

// ========================================
// Sub-components
// ========================================

function TriRadio({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "any" | "yes" | "no";
  onChange: (v: "any" | "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="border-border/50 inline-flex rounded-md border p-0.5">
        {(["any", "yes", "no"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-sm px-3 py-1 text-[11px] font-medium transition-all",
              value === v
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v === "any" ? "Any" : v === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all",
              selected.includes(opt.value)
                ? "border-foreground/30 bg-foreground/5 font-medium"
                : "border-border/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
              className="size-3"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function PresetPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: number | null; label: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition-all",
              value === opt.value
                ? "bg-foreground text-background border-transparent"
                : "border-border/50 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Category navigation
// ========================================

const CATEGORIES = [
  { id: "client", label: "Client & Account" },
  { id: "pets", label: "Pets & Health" },
  { id: "services", label: "Services & Bookings" },
  { id: "activity", label: "Activity" },
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
  if (filters.lastVisitDays !== null)
    chips.push({
      label: `Last ${filters.lastVisitDays}d`,
      onRemove: () => setFilter("lastVisitDays", null),
    });

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
// Main Inline Filter Panel
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
  const [activeCategory, setActiveCategory] = useState("client");

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Left: category nav */}
        <div className="bg-muted/30 border-r py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "block w-full px-4 py-2 text-left text-xs font-medium whitespace-nowrap transition-colors",
                activeCategory === cat.id
                  ? "bg-background text-foreground border-r-foreground border-r-2"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right: filter content */}
        <CardContent className="flex-1 py-4">
          {activeCategory === "client" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
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
              <TriRadio
                label="Address on file"
                value={filters.hasAddress}
                onChange={(v) => setFilter("hasAddress", v)}
              />
              <TriRadio
                label="Emergency contact"
                value={filters.hasEmergencyContact}
                onChange={(v) => setFilter("hasEmergencyContact", v)}
              />
              <TriRadio
                label="Has pets"
                value={filters.hasPets}
                onChange={(v) => setFilter("hasPets", v)}
              />
            </div>
          )}

          {activeCategory === "pets" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
              <CheckGroup
                label="Pet type"
                options={[
                  { value: "Dog", label: "Dog" },
                  { value: "Cat", label: "Cat" },
                  { value: "Other", label: "Other" },
                ]}
                selected={filters.petTypes}
                onToggle={(v) => toggleArrayItem("petTypes", v)}
              />
              <TriRadio
                label="Has allergies"
                value={filters.hasAllergies}
                onChange={(v) => setFilter("hasAllergies", v)}
              />
              <TriRadio
                label="Special needs"
                value={filters.hasSpecialNeeds}
                onChange={(v) => setFilter("hasSpecialNeeds", v)}
              />
            </div>
          )}

          {activeCategory === "services" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
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
              <TriRadio
                label="Active booking"
                value={filters.hasActiveBooking}
                onChange={(v) => setFilter("hasActiveBooking", v)}
              />
            </div>
          )}

          {activeCategory === "activity" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
              <PresetPills
                label="Last visit within"
                options={[
                  { value: 7, label: "7 days" },
                  { value: 30, label: "30 days" },
                  { value: 90, label: "90 days" },
                ]}
                value={filters.lastVisitDays}
                onChange={(v) => setFilter("lastVisitDays", v)}
              />
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
