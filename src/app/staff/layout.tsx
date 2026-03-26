"use client";

import { usePathname } from "next/navigation";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { StaffSidebar } from "@/components/staff/StaffSidebar";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/staff/auth");

  return (
    <SettingsProviderWrapper>
      {isAuthRoute ? (
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      ) : (
        <SidebarProvider>
          <>
            <StaffSidebar />
            <SidebarInset className="flex min-h-screen flex-col">
              <StaffHeader />
              <main className="flex-1 overflow-x-hidden">{children}</main>
            </SidebarInset>
          </>
        </SidebarProvider>
      )}
    </SettingsProviderWrapper>
  );
}
