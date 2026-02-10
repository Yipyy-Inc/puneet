"use client";

import { usePathname } from "next/navigation";
import { CustomerFacilityProvider } from "@/hooks/use-customer-facility";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { CustomerHeader } from "@/components/customer/CustomerHeader";

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
        <div className="min-h-screen flex flex-col">
          {!isAuthRoute && <CustomerHeader />}
          <main className="flex-1">{children}</main>
        </div>
      </CustomerFacilityProvider>
    </SettingsProviderWrapper>
  );
}
