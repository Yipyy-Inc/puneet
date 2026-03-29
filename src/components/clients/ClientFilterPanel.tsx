"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import type { ClientFilters } from "@/hooks/use-client-filters";

// ========================================
// TriState Toggle (Yes / No / Any)
// ========================================

function TriToggle({
  value,
  onChange,
  label,
}: {
  value: "any" | "yes" | "no";
  onChange: (v: "any" | "yes" | "no") => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <div className="flex gap-0.5 rounded-md border p-0.5">
        {(["yes", "no", "any"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              value === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {v === "any" ? "Any" : v === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Checkbox Group
// ========================================

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2 py-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Preset Button Group (Last Visit)
// ========================================

function PresetButtons({
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
    <div className="space-y-2 py-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Button
            key={String(opt.value)}
            variant={value === opt.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(value === opt.value ? null : opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Filter Panel
// ========================================

interface ClientFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ClientFilters;
  setFilter: <K extends keyof ClientFilters>(
    key: K,
    value: ClientFilters[K],
  ) => void;
  toggleArrayItem: (
    key: "status" | "petTypes" | "services",
    item: string,
  ) => void;
  clearAll: () => void;
  activeCount: number;
}

export function ClientFilterPanel({
  open,
  onOpenChange,
  filters,
  setFilter,
  toggleArrayItem,
  clearAll,
  activeCount,
}: ClientFilterPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[340px] overflow-y-auto sm:w-[380px]"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Filter className="size-4" />
              Filters
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeCount}
                </Badge>
              )}
            </SheetTitle>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-auto text-xs"
                onClick={clearAll}
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <Accordion
          type="multiple"
          defaultValue={["client-info", "pets"]}
          className="w-full"
        >
          {/* Client Info */}
          <AccordionItem value="client-info">
            <AccordionTrigger className="text-sm font-medium">
              Client Info
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <CheckboxGroup
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                selected={filters.status}
                onToggle={(v) => toggleArrayItem("status", v)}
              />
              <TriToggle
                label="Has Address"
                value={filters.hasAddress}
                onChange={(v) => setFilter("hasAddress", v)}
              />
              <TriToggle
                label="Has Emergency Contact"
                value={filters.hasEmergencyContact}
                onChange={(v) => setFilter("hasEmergencyContact", v)}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Pets */}
          <AccordionItem value="pets">
            <AccordionTrigger className="text-sm font-medium">
              Pets
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <TriToggle
                label="Has Pets"
                value={filters.hasPets}
                onChange={(v) => setFilter("hasPets", v)}
              />
              <CheckboxGroup
                label="Pet Type"
                options={[
                  { value: "Dog", label: "Dog" },
                  { value: "Cat", label: "Cat" },
                  { value: "Other", label: "Other" },
                ]}
                selected={filters.petTypes}
                onToggle={(v) => toggleArrayItem("petTypes", v)}
              />
              <TriToggle
                label="Has Allergies"
                value={filters.hasAllergies}
                onChange={(v) => setFilter("hasAllergies", v)}
              />
              <TriToggle
                label="Has Special Needs"
                value={filters.hasSpecialNeeds}
                onChange={(v) => setFilter("hasSpecialNeeds", v)}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Services & Bookings */}
          <AccordionItem value="services">
            <AccordionTrigger className="text-sm font-medium">
              Services & Bookings
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <CheckboxGroup
                label="Has Used Service"
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
                label="Has Active Booking"
                value={filters.hasActiveBooking}
                onChange={(v) => setFilter("hasActiveBooking", v)}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Activity */}
          <AccordionItem value="activity">
            <AccordionTrigger className="text-sm font-medium">
              Activity
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <PresetButtons
                label="Last Visit"
                options={[
                  { value: 7, label: "7 days" },
                  { value: 30, label: "30 days" },
                  { value: 90, label: "90 days" },
                ]}
                value={filters.lastVisitDays}
                onChange={(v) => setFilter("lastVisitDays", v)}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </SheetContent>
    </Sheet>
  );
}

// ========================================
// Active filter chips
// ========================================

export function ActiveFilterChips({
  filters,
  setFilter,
  toggleArrayItem,
  clearAll,
  activeCount,
}: Omit<ClientFilterPanelProps, "open" | "onOpenChange">) {
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
      label: `Emergency Contact: ${filters.hasEmergencyContact}`,
      onRemove: () => setFilter("hasEmergencyContact", "any"),
    });
  if (filters.hasPets !== "any")
    chips.push({
      label: `Has Pets: ${filters.hasPets}`,
      onRemove: () => setFilter("hasPets", "any"),
    });
  if (filters.petTypes.length > 0)
    chips.push({
      label: `Pet: ${filters.petTypes.join(", ")}`,
      onRemove: () => setFilter("petTypes", []),
    });
  if (filters.hasAllergies !== "any")
    chips.push({
      label: `Allergies: ${filters.hasAllergies}`,
      onRemove: () => setFilter("hasAllergies", "any"),
    });
  if (filters.hasSpecialNeeds !== "any")
    chips.push({
      label: `Special Needs: ${filters.hasSpecialNeeds}`,
      onRemove: () => setFilter("hasSpecialNeeds", "any"),
    });
  if (filters.services.length > 0)
    chips.push({
      label: `Service: ${filters.services.join(", ")}`,
      onRemove: () => setFilter("services", []),
    });
  if (filters.hasActiveBooking !== "any")
    chips.push({
      label: `Active Booking: ${filters.hasActiveBooking}`,
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
            className="hover:bg-muted ml-0.5 rounded-full p-0.5"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <button
        onClick={clearAll}
        className="text-muted-foreground text-xs hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
