"use client";

import { useSignOutEverywhere } from "@/lib/auth/sign-out-client";
import { useEffect, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { FacilitySwitcher } from "./FacilitySwitcher";
import { QuickBookButton } from "./QuickBookButton";
import { ContactFacilityButton } from "./ContactFacilityButton";
import { CallFacilityButton } from "./CallFacilityButton";
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
  Package,
  Calendar,
} from "lucide-react";
import { useTransition } from "react";
import { setUserRole } from "@/lib/role-utils";
import { EmployeePortalSwitcher } from "@/components/layout/EmployeePortalSwitcher";
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
import { useUiText } from "@/hooks/use-ui-text";
import { useQuery } from "@tanstack/react-query";
import { groomingQueries } from "@/lib/api/grooming";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { memberships } from "@/data/services-pricing";

export function CustomerHeader() {
  const signOutEverywhere = useSignOutEverywhere();
  const { selectedFacility } = useCustomerFacility();
  const { t } = useUiText();
  const [isPending, startTransition] = useTransition();

  // WHOSE CREDITS THESE ARE comes from the session. The membership half was a
  // module constant keyed to MOCK_CUSTOMER_ID = 15, so the header offered
  // Alice Johnson's 14 credits to every signed-in pet owner — on every page,
  // because this component is in the customer shell.
  //
  // The note that used to sit here said the constant was safe "because nothing
  // changes it at runtime". True of the number, and it missed that the PERSON
  // changes: a value computed once at import cannot belong to whoever is
  // signed in.
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  // Still a fixture — memberships have no backend yet — but keyed off the real
  // person, so it contributes nothing rather than somebody else's balance.
  const availableMembershipCredits = useMemo(
    () =>
      customerId == null
        ? 0
        : memberships
            .filter(
              (m) =>
                m.customerId === String(customerId) && m.status === "active",
            )
            .reduce((sum, m) => sum + Math.max(0, m.creditsRemaining), 0),
    [customerId],
  );

  // The pass count used to be computed at MODULE level, once, when the bundle
  // loaded — so redeeming a pass could not change it without a full reload.
  // It is a query now for the same reason it is derived in the database: the
  // number is a consequence of a ledger, and a snapshot of it goes stale.
  const { data: ownedPackages = [] } = useQuery({
    ...groomingQueries.customerPackagesForClient(customerId ?? -1),
    enabled: customerId != null,
  });
  const availableCredits =
    ownedPackages
      .filter((p) => p.status === "active")
      .reduce((sum, p) => sum + Math.max(0, p.passesTotal - p.passesUsed), 0) +
    availableMembershipCredits;

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
          <div className="hidden xl:block" suppressHydrationWarning>
            <div className="text-sm font-semibold" suppressHydrationWarning>
              {selectedFacility?.name ?? "Yipyy"}
            </div>
            <div className="text-muted-foreground text-xs">
              {t("Customer Portal")}
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Available credits pill — only shown when the customer has any */}
        {availableCredits > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 rounded-full xl:flex"
            asChild
          >
            <Link href="/customer/packages">
              <Package className="size-4" />
              <span>{availableCredits} credits available</span>
            </Link>
          </Button>
        )}

        {/* Quick Book Button */}
        <QuickBookButton />

        {/* Notifications Center */}
        <CustomerNotifications />

        {/* Call Facility Button */}
        <CallFacilityButton />

        {/* Contact Facility Button */}
        <ContactFacilityButton />

        {/* Facility Switcher */}
        <FacilitySwitcher />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="size-5" />
              <span className="sr-only">{t("User menu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{t("Customer Account")}</p>
              <p className="text-muted-foreground truncate text-xs">
                {/* TODO: Get from auth context */}
                customer@example.com
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/customer/dashboard" className="cursor-pointer">
                <User className="mr-2 size-4" />
                {t("Dashboard")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/messages" className="cursor-pointer">
                <MessageSquare className="mr-2 size-4" />
                {t("Messages")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/pets" className="cursor-pointer">
                <Dog className="mr-2 size-4" />
                {t("My Pets")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/bookings" className="cursor-pointer">
                <Calendar className="mr-2 size-4" />
                {t("My Bookings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/packages" className="cursor-pointer">
                <Package className="mr-2 size-4" />
                {t("Packages & Memberships")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/report-cards" className="cursor-pointer">
                <FileText className="mr-2 size-4" />
                {t("Report Cards")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/billing" className="cursor-pointer">
                <CreditCard className="mr-2 size-4" />
                {t("Billing & Payments")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/settings" className="cursor-pointer">
                <Settings className="mr-2 size-4" />
                {t("Settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={switchToFacility}
              disabled={isPending}
              className="cursor-pointer"
            >
              <Building2 className="mr-2 size-4" />
              {t("Switch to Facility")}
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
              {t("Switch to Customer")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={switchToAdmin}
              disabled={isPending}
              className="cursor-pointer"
            >
              <Shield className="mr-2 size-4" />
              {t("Switch to Admin")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EmployeePortalSwitcher standalone={false} />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void signOutEverywhere();
              }}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              {t("Log out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
