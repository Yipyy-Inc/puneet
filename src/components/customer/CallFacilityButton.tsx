"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";

export function CallFacilityButton() {
  const { selectedFacility } = useCustomerFacility();
  const hydrated = useHydrated();

  const phone = selectedFacility?.contact?.phone;

  if (!hydrated || !phone) return null;

  return (
    <Button variant="outline" size="icon" asChild>
      <a href={`tel:${phone}`}>
        <Phone className="size-4" />
        <span className="sr-only">Call facility</span>
      </a>
    </Button>
  );
}
