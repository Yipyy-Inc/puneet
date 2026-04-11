"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { CustomerFacilityProvider } from "@/hooks/use-customer-facility";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { BookingModalProviderWrapper } from "@/components/providers/BookingModalProviderWrapper";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/customer/auth");

  return (
    <SettingsProviderWrapper>
      <CustomerFacilityProvider>
        <BookingModalProviderWrapper>
          {isAuthRoute ? (
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
            </div>
          ) : (
            <SidebarProvider>
              <>
                <CustomerSidebar />
                <SidebarInset className="flex min-h-screen flex-col">
                  <CustomerHeader />
                  <main className="flex-1 overflow-x-hidden">{children}</main>

                  {/* Floating chat bubble */}
                  {!pathname?.includes("/messages") && (
                    <Link
                      href="/customer/messages"
                      className="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-1 hover:bg-blue-600 hover:shadow-xl"
                    >
                      <MessageCircle className="size-6" />
                      <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        2
                      </span>
                    </Link>
                  )}
                </SidebarInset>
              </>
            </SidebarProvider>
          )}
        </BookingModalProviderWrapper>
      </CustomerFacilityProvider>
    </SettingsProviderWrapper>
  );
}
