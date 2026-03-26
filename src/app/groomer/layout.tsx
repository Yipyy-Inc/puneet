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
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      ) : (
        <SidebarProvider>
          <>
            <GroomerSidebar />
            <SidebarInset className="flex min-h-screen flex-col">
              <GroomerHeader />
              <main className="flex-1 overflow-x-hidden">{children}</main>
            </SidebarInset>
          </>
        </SidebarProvider>
      )}
    </SettingsProviderWrapper>
  );
}
