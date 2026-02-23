"use client";

import { usePathname } from "next/navigation";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { GroomerHeader } from "@/components/groomer/GroomerHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { GroomerSidebar } from "@/components/groomer/GroomerSidebar";

export default function GroomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/groomer/auth");

  return (
    <SettingsProviderWrapper>
      {isAuthRoute ? (
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">{children}</main>
        </div>
      ) : (
        <SidebarProvider>
          <>
            <GroomerSidebar />
            <SidebarInset className="flex flex-col min-h-screen">
              <GroomerHeader />
              <main className="flex-1 overflow-x-hidden">{children}</main>
            </SidebarInset>
          </>
        </SidebarProvider>
      )}
    </SettingsProviderWrapper>
  );
}
