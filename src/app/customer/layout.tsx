"use client";

import { CustomerFacilityProvider } from "@/hooks/use-customer-facility";
import { CustomerHeader } from "@/components/customer/CustomerHeader";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerFacilityProvider>
      <div className="min-h-screen flex flex-col">
        <CustomerHeader />
        <main className="flex-1">{children}</main>
      </div>
    </CustomerFacilityProvider>
  );
}
