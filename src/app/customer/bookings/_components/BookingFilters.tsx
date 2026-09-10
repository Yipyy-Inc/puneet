"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { serviceTypeLabel } from "@/lib/i18n/labels";

export type ServiceFilter =
  | "all"
  | "boarding"
  | "daycare"
  | "grooming"
  | "training";

// The service names come from `messages.serviceTypes`, by the same id the
// filter matches on — so a label can never drift from what it filters.
const SERVICE_OPTIONS: ServiceFilter[] = [
  "all",
  "boarding",
  "daycare",
  "grooming",
  "training",
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
  const { t, locale } = useCustomerText("bookings");
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative w-full md:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={t("searchPlaceholder")}
          className="pl-9"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SERVICE_OPTIONS.map((option) => {
          const active = serviceFilter === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onServiceFilterChange(option)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              {option === "all"
                ? t("filterAll")
                : serviceTypeLabel(locale, option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
