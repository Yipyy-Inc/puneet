"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SlidersHorizontal,
  X,
  User,
  PawPrint,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientFilters } from "@/hooks/use-client-filters";

// ========================================
// Section Header
// ========================================

function SectionHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-3">
      <Icon className="text-muted-foreground size-3.5" />
      <span className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
        {label}
      </span>
      {!!count && count > 0 && (
        <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full text-[9px] font-medium">
          {count}
        </span>
      )}
    </div>
  );
}

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
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px]">{label}</span>
      <div className="border-border/60 flex rounded-md border bg-transparent p-0.5">
        {(["yes", "no", "any"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-sm px-3 py-1 text-[11px] font-medium tracking-wide transition-all",
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

// ========================================
// Checkbox Group
// ========================================

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
            selected.includes(opt.value) ? "bg-muted/60" : "hover:bg-muted/40",
          )}
        >
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={() => onToggle(opt.value)}
          />
          <span className="text-[13px]">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

// ========================================
// Preset Pill Group (Last Visit)
// ========================================

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { value: number | null; label: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide transition-all",
            value === opt.value
              ? "bg-foreground text-background border-transparent"
              : "border-border/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
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
        className="flex w-[360px] flex-col gap-0 p-0 sm:w-[400px]"
      >
        {/* Fixed Header */}
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
              <SlidersHorizontal className="size-4" />
              Filters
            </SheetTitle>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  Reset
                </button>
              )}
              {activeCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-foreground/20 font-mono text-[10px]"
                >
                  {activeCount}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Client Info */}
          <SectionHeader icon={User} label="Client" />
          <div className="space-y-1 pb-5">
            <CheckboxGroup
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              selected={filters.status}
              onToggle={(v) => toggleArrayItem("status", v)}
            />
            <TriToggle
              label="Has address on file"
              value={filters.hasAddress}
              onChange={(v) => setFilter("hasAddress", v)}
            />
            <TriToggle
              label="Emergency contact"
              value={filters.hasEmergencyContact}
              onChange={(v) => setFilter("hasEmergencyContact", v)}
            />
          </div>

          <Separator className="mb-4" />

          {/* Pets */}
          <SectionHeader icon={PawPrint} label="Pets" />
          <div className="space-y-1 pb-5">
            <TriToggle
              label="Has registered pets"
              value={filters.hasPets}
              onChange={(v) => setFilter("hasPets", v)}
            />
            <div className="pt-1">
              <p className="text-muted-foreground pb-1.5 text-[11px] font-medium tracking-widest uppercase">
                Type
              </p>
              <CheckboxGroup
                options={[
                  { value: "Dog", label: "Dog" },
                  { value: "Cat", label: "Cat" },
                  { value: "Other", label: "Other" },
                ]}
                selected={filters.petTypes}
                onToggle={(v) => toggleArrayItem("petTypes", v)}
              />
            </div>
            <TriToggle
              label="Known allergies"
              value={filters.hasAllergies}
              onChange={(v) => setFilter("hasAllergies", v)}
            />
            <TriToggle
              label="Special needs"
              value={filters.hasSpecialNeeds}
              onChange={(v) => setFilter("hasSpecialNeeds", v)}
            />
          </div>

          <Separator className="mb-4" />

          {/* Services */}
          <SectionHeader icon={Calendar} label="Services" />
          <div className="space-y-1 pb-5">
            <CheckboxGroup
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
              label="Has active booking"
              value={filters.hasActiveBooking}
              onChange={(v) => setFilter("hasActiveBooking", v)}
            />
          </div>

          <Separator className="mb-4" />

          {/* Activity */}
          <SectionHeader icon={Clock} label="Activity" />
          <div className="pb-5">
            <p className="text-muted-foreground pb-2 text-[11px] font-medium tracking-widest uppercase">
              Last visit within
            </p>
            <PillGroup
              options={[
                { value: 7, label: "7 days" },
                { value: 30, label: "30 days" },
                { value: 90, label: "90 days" },
              ]}
              value={filters.lastVisitDays}
              onChange={(v) => setFilter("lastVisitDays", v)}
            />
          </div>
        </div>

        {/* Fixed Footer */}
        {activeCount > 0 && (
          <div className="border-t px-6 py-3">
            <Button
              className="w-full"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Show results
            </Button>
          </div>
        )}
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
      label: filters.services.join(", "),
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
        <span
          key={chip.label}
          className="border-border/60 text-foreground inline-flex items-center gap-1 rounded-full border bg-transparent px-2.5 py-0.5 text-[11px] font-medium"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="hover:bg-muted -mr-0.5 rounded-full p-0.5 transition-colors"
          >
            <X className="size-2.5" />
          </button>
        </span>
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
