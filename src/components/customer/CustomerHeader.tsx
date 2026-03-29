"use client";

import { useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { FacilitySwitcher } from "./FacilitySwitcher";
import { QuickBookButton } from "./QuickBookButton";
import { ContactFacilityButton } from "./ContactFacilityButton";
import { CustomerNotifications } from "./CustomerNotifications";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Settings,
  MessageSquare,
  Dog,
  FileText,
  CreditCard,
  Building2,
  Shield,
} from "lucide-react";
import { useTransition } from "react";
import { setUserRole } from "@/lib/role-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function CustomerHeader() {
  const { selectedFacility } = useCustomerFacility();
  const [isPending, startTransition] = useTransition();

  const switchToFacility = () => {
    startTransition(() => {
      setUserRole("facility_admin");
      window.location.href = "/facility/dashboard";
    });
  };

  const switchToAdmin = () => {
    startTransition(() => {
      setUserRole("super_admin");
      window.location.href = "/dashboard";
    });
  };

  // Apply facility colors via CSS variables
  useEffect(() => {
    if (selectedFacility?.primaryColor) {
      document.documentElement.style.setProperty(
        "--primary",
        selectedFacility.primaryColor,
      );
      // Calculate appropriate foreground color (white or black based on brightness)
      const rgb = parseInt(selectedFacility.primaryColor.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      document.documentElement.style.setProperty(
        "--primary-foreground",
        brightness > 128 ? "#000000" : "#ffffff",
      );
    }
    if (selectedFacility?.secondaryColor) {
      document.documentElement.style.setProperty(
        "--secondary",
        selectedFacility.secondaryColor,
      );
      const rgb = parseInt(selectedFacility.secondaryColor.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      document.documentElement.style.setProperty(
        "--secondary-foreground",
        brightness > 128 ? "#000000" : "#ffffff",
      );
    }
  }, [selectedFacility]);

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors md:hidden" />
        {/* Facility Logo and Name */}
        <Link href="/customer/dashboard" className="flex items-center gap-3">
          {selectedFacility?.logo ? (
            <Image
              src={selectedFacility.logo}
              alt={selectedFacility.name}
              width={32}
              height={32}
              className="h-8 w-auto"
            />
          ) : (
            <Image
              src="/yipyy-transparent.png"
              alt="Yipyy"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
          )}
          <div className="hidden sm:block">
            <div className="text-sm font-semibold">
              {selectedFacility?.name ?? "Yipyy"}
            </div>
            <div className="text-muted-foreground text-xs">Customer Portal</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Book Button */}
        <QuickBookButton />

        {/* Notifications Center */}
        <CustomerNotifications />

        {/* Contact Facility Button */}
        <ContactFacilityButton />

        {/* Facility Switcher */}
        <FacilitySwitcher />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="size-5" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Customer Account</p>
              <p className="text-muted-foreground truncate text-xs">
                {/* TODO: Get from auth context */}
                customer@example.com
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/customer/dashboard" className="cursor-pointer">
                <User className="mr-2 size-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/messages" className="cursor-pointer">
                <MessageSquare className="mr-2 size-4" />
                Messages
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/report-cards" className="cursor-pointer">
                <FileText className="mr-2 size-4" />
                Report Cards
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/billing" className="cursor-pointer">
                <CreditCard className="mr-2 size-4" />
                Billing & Payments
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/pets" className="cursor-pointer">
                <Dog className="mr-2 size-4" />
                My Pets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/settings" className="cursor-pointer">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={switchToFacility}
              disabled={isPending}
              className="cursor-pointer"
            >
              <Building2 className="mr-2 size-4" />
              Switch to Facility
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                startTransition(() => {
                  window.location.href = "/customer/dashboard";
                });
              }}
              disabled={isPending}
              className="cursor-pointer"
            >
              <User className="mr-2 size-4" />
              Switch to Customer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={switchToAdmin}
              disabled={isPending}
              className="cursor-pointer"
            >
              <Shield className="mr-2 size-4" />
              Switch to Admin
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // TODO: Implement logout
                window.location.href = "/customer/auth/login";
              }}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
