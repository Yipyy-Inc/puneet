"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ServiceFilter =
  | "all"
  | "boarding"
  | "daycare"
  | "grooming"
  | "training";

const SERVICE_OPTIONS: { value: ServiceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
];

interface BookingFiltersProps {
  searchQuery: string;
  onSearchChange: (next: string) => void;
  serviceFilter: ServiceFilter;
  onServiceFilterChange: (next: ServiceFilter) => void;
}

export function BookingFilters({
  searchQuery,
  onSearchChange,
  serviceFilter,
  onServiceFilterChange,
}: BookingFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative w-full md:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search by pet, service, or service type..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SERVICE_OPTIONS.map((option) => {
          const active = serviceFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onServiceFilterChange(option.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
