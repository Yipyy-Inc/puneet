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
  const { selectedFacility, availableFacilities, setSelectedFacility } = useCustomerFacility();
  const [isOpen, setIsOpen] = useState(false);

  if (availableFacilities.length <= 1) {
    return null; // Don't show switcher if only one facility
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-muted-foreground/20 hover:bg-accent"
        >
          <Building2 className="h-4 w-4" />
          <span className="max-w-[200px] truncate">
            {selectedFacility?.name ?? "Select Facility"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
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
              "flex items-center justify-between cursor-pointer",
              selectedFacility?.id === facility.id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{facility.name}</span>
            </div>
            {selectedFacility?.id === facility.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
