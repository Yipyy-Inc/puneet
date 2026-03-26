"use client";

import { useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FacilitySwitcher() {
  const { selectedFacility, availableFacilities, setSelectedFacility } =
    useCustomerFacility();
  const [isOpen, setIsOpen] = useState(false);

  if (availableFacilities.length <= 1) {
    return null; // Don't show switcher if only one facility
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-muted-foreground/20 hover:bg-accent gap-2"
        >
          <Building2 className="size-4" />
          <span className="max-w-[200px] truncate">
            {selectedFacility?.name ?? "Select Facility"}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        {availableFacilities.map((facility) => (
          <DropdownMenuItem
            key={facility.id}
            onClick={() => {
              setSelectedFacility(facility.id);
              setIsOpen(false);
            }}
            className={cn(
              "flex cursor-pointer items-center justify-between",
              selectedFacility?.id === facility.id && "bg-accent",
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Building2 className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate">{facility.name}</span>
            </div>
            {selectedFacility?.id === facility.id && (
              <Check className="text-primary size-4 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
