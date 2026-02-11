"use client";

import { usePathname } from "next/navigation";
import { CustomerFacilityProvider } from "@/hooks/use-customer-facility";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
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
        {isAuthRoute ? (
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
          </div>
        ) : (
          <SidebarProvider>
            <>
              <CustomerSidebar />
              <SidebarInset className="flex flex-col min-h-screen">
                <CustomerHeader />
                <main className="flex-1 overflow-x-hidden">{children}</main>
              </SidebarInset>
            </>
          </SidebarProvider>
        )}
      </CustomerFacilityProvider>
    </SettingsProviderWrapper>
  );
}

