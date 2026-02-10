"use client";

import { useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { FacilitySwitcher } from "./FacilitySwitcher";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, MessageSquare, Dog, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export function CustomerHeader() {
  const { selectedFacility } = useCustomerFacility();

  // Apply facility colors via CSS variables
  useEffect(() => {
    if (selectedFacility?.primaryColor) {
      document.documentElement.style.setProperty(
        "--primary",
        selectedFacility.primaryColor
      );
      // Calculate appropriate foreground color (white or black based on brightness)
      const rgb = parseInt(selectedFacility.primaryColor.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      document.documentElement.style.setProperty(
        "--primary-foreground",
        brightness > 128 ? "#000000" : "#ffffff"
      );
    }
    if (selectedFacility?.secondaryColor) {
      document.documentElement.style.setProperty(
        "--secondary",
        selectedFacility.secondaryColor
      );
      const rgb = parseInt(selectedFacility.secondaryColor.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      document.documentElement.style.setProperty(
        "--secondary-foreground",
        brightness > 128 ? "#000000" : "#ffffff"
      );
    }
  }, [selectedFacility]);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Facility Logo and Name */}
        <Link href="/customer/dashboard" className="flex items-center gap-3">
          {selectedFacility?.logo ? (
            <img
              src={selectedFacility.logo}
              alt={selectedFacility.name}
              className="h-8 w-auto"
            />
          ) : (
            <img
              src="/yipyy-transparent.png"
              alt="Yipyy"
              className="h-8 w-auto"
            />
          )}
          <div className="hidden sm:block">
            <div className="font-semibold text-sm">
              {selectedFacility?.name ?? "Yipyy"}
            </div>
            <div className="text-xs text-muted-foreground">Customer Portal</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Messages Button */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customer/messages">
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">Messages</span>
          </Link>
        </Button>

        {/* Facility Switcher */}
        <FacilitySwitcher />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">Customer Account</p>
              <p className="text-xs text-muted-foreground truncate">
                {/* TODO: Get from auth context */}
                customer@example.com
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/customer/dashboard" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/messages" className="cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Messages
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/report-cards" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Report Cards
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/pets" className="cursor-pointer">
                <Dog className="mr-2 h-4 w-4" />
                My Pets
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/customer/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // TODO: Implement logout
                window.location.href = "/customer/auth/login";
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
