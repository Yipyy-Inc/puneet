"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Scissors, Dog, Home, GraduationCap, ChevronDown } from "lucide-react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { facilityConfig } from "@/data/facility-config";
import Link from "next/link";

export function QuickBookButton() {
  const { selectedFacility } = useCustomerFacility();
  const [open, setOpen] = useState(false);

  // Check which services are enabled
  const services = {
    grooming: facilityConfig.services.grooming?.enabled ?? false,
    daycare: facilityConfig.services.daycare?.enabled ?? false,
    boarding: facilityConfig.services.boarding?.enabled ?? false,
    training: true, // TODO: Check from facility config
  };

  const enabledServices = Object.entries(services)
    .filter(([_, enabled]) => enabled)
    .map(([service]) => service);

  if (enabledServices.length === 0) {
    return null;
  }

  const serviceLinks: Record<string, { href: string; icon: typeof Calendar; label: string }> = {
    grooming: {
      href: "/customer/bookings?service=grooming",
      icon: Scissors,
      label: "Grooming",
    },
    daycare: {
      href: "/customer/bookings?service=daycare",
      icon: Dog,
      label: "Daycare",
    },
    boarding: {
      href: "/customer/bookings?service=boarding",
      icon: Home,
      label: "Boarding",
    },
    training: {
      href: "/customer/training",
      icon: GraduationCap,
      label: "Training",
    },
  };

  // If only one service, show direct button
  if (enabledServices.length === 1) {
    const service = enabledServices[0];
    const serviceInfo = serviceLinks[service];
    if (!serviceInfo) return null;

    const Icon = serviceInfo.icon;
    return (
      <Button asChild className="gap-2">
        <Link href={serviceInfo.href}>
          <Icon className="h-4 w-4" />
          <span>Book {serviceInfo.label}</span>
        </Link>
      </Button>
    );
  }

  // Multiple services - show dropdown
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Calendar className="h-4 w-4" />
          <span>Book a Service</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {enabledServices.map((service) => {
          const serviceInfo = serviceLinks[service];
          if (!serviceInfo) return null;
          const Icon = serviceInfo.icon;
          return (
            <DropdownMenuItem key={service} asChild>
              <Link href={serviceInfo.href} className="cursor-pointer">
                <Icon className="mr-2 h-4 w-4" />
                {serviceInfo.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
