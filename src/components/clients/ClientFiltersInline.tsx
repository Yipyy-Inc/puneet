"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientFilters } from "@/hooks/use-client-filters";

// ========================================
// Shared filter sub-components
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
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      <div className="space-y-1">
        {(["any", "yes", "no"] as const).map((v) => (
          <label
            key={v}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
              value === v ? "bg-muted/60" : "hover:bg-muted/40",
            )}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-full border",
                value === v
                  ? "border-foreground bg-foreground"
                  : "border-border",
              )}
            >
              {value === v && (
                <span className="bg-background size-1.5 rounded-full" />
              )}
            </span>
            {v === "any" ? "Any" : v === "yes" ? "Yes" : "No"}
          </label>
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
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      <div className="space-y-1">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
              selected.includes(opt.value)
                ? "bg-muted/60"
                : "hover:bg-muted/40",
            )}
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
              className="size-3.5"
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
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
              value === opt.value
                ? "bg-foreground text-background border-transparent"
                : "border-border/60 text-muted-foreground hover:text-foreground",
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
// Inline Filter Panel — 10 Categories
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
  const [tab, setTab] = useState("account");

  return (
    <Card>
      <CardContent className="py-3">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto">
            <TabsList className="w-auto">
              <TabsTrigger value="account" className="text-xs">
                Account
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-xs">
                Profile
              </TabsTrigger>
              <TabsTrigger value="household" className="text-xs">
                Household
              </TabsTrigger>
              <TabsTrigger value="pets" className="text-xs">
                Pets
              </TabsTrigger>
              <TabsTrigger value="health" className="text-xs">
                Health
              </TabsTrigger>
              <TabsTrigger value="services" className="text-xs">
                Services
              </TabsTrigger>
              <TabsTrigger value="financial" className="text-xs">
                Financial
              </TabsTrigger>
              <TabsTrigger value="forms" className="text-xs">
                Forms
              </TabsTrigger>
              <TabsTrigger value="comms" className="text-xs">
                Comms
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Account Status */}
          <TabsContent value="account" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <CheckGroup
                label="Account Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "new", label: "New Client" },
                  { value: "archived", label: "Archived" },
                  { value: "blacklisted", label: "Blacklisted" },
                ]}
                selected={filters.status}
                onToggle={(v) => toggleArrayItem("status", v)}
              />
            </div>
          </TabsContent>

          {/* 2. Client Profile */}
          <TabsContent value="profile" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <TriRadio
                label="Email on file"
                value={filters.hasAddress}
                onChange={(v) => setFilter("hasAddress", v)}
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
            </div>
          </TabsContent>

          {/* 3. Household */}
          <TabsContent value="household" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <TriRadio
                label="Has pets"
                value={filters.hasPets}
                onChange={(v) => setFilter("hasPets", v)}
              />
            </div>
          </TabsContent>

          {/* 4. Pets */}
          <TabsContent value="pets" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <CheckGroup
                label="Pet Type"
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
          </TabsContent>

          {/* 5. Vaccinations & Health */}
          <TabsContent value="health" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
          </TabsContent>

          {/* 6. Services & Bookings */}
          <TabsContent value="services" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <CheckGroup
                label="Service Used"
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
                label="Has active booking"
                value={filters.hasActiveBooking}
                onChange={(v) => setFilter("hasActiveBooking", v)}
              />
            </div>
          </TabsContent>

          {/* 7. Financial */}
          <TabsContent value="financial" className="mt-3">
            <p className="text-muted-foreground text-xs">
              Financial filters will be available when payment data is
              connected.
            </p>
          </TabsContent>

          {/* 8. Forms & Compliance */}
          <TabsContent value="forms" className="mt-3">
            <p className="text-muted-foreground text-xs">
              Form compliance filters will be available when form submission
              tracking is connected.
            </p>
          </TabsContent>

          {/* 9. Communication */}
          <TabsContent value="comms" className="mt-3">
            <p className="text-muted-foreground text-xs">
              Communication filters will be available when messaging data is
              connected.
            </p>
          </TabsContent>

          {/* 10. Activity & Engagement */}
          <TabsContent value="activity" className="mt-3">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <PresetPills
                label="Last Visit"
                options={[
                  { value: 7, label: "7 days" },
                  { value: 30, label: "30 days" },
                  { value: 90, label: "90 days" },
                ]}
                value={filters.lastVisitDays}
                onChange={(v) => setFilter("lastVisitDays", v)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
