import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FacilitySidebar } from "@/components/layout/facility-admin-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserProfileSheet } from "@/components/layout/UserProfileSheet";
import { FacilityHeader } from "@/components/layout/FacilityHeader";
import { BookingModalProviderWrapper } from "@/components/providers/BookingModalProviderWrapper";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { GlobalSearchNext } from "@/components/search/GlobalSearchNext";
import { TopBarIconsNext } from "@/components/layout/TopBarIconsNext";
import { BookingRequestsTopbarDropdown } from "@/components/facility/BookingRequestsTopbarDropdown";

export default async function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  // If user is not facility_admin, redirect to main dashboard
  // Allow access in development or if no role is set (defaults to facility_admin for testing)
  if (userRole && userRole !== "facility_admin") {
    redirect("/dashboard");
  }

  return (
    <SettingsProviderWrapper>
      <BookingModalProviderWrapper>
        <SidebarProvider>
          <FacilitySidebar />
          <SidebarInset className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-linear-to-r from-background to-muted/20 px-6 backdrop-blur-sm">
              <GlobalSearchNext
                className="max-w-[520px]"
                canCreateCustomer={userRole === "facility_admin"}
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <TopBarIconsNext />
                  <BookingRequestsTopbarDropdown />
                </div>
                <FacilityHeader />
                <UserProfileSheet showNotifications={false} />
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t px-4 py-3 text-xs text-muted-foreground flex items-center justify-center">
              © 2026 Yipyy. All rights reserved.
            </footer>
          </SidebarInset>
        </SidebarProvider>
      </BookingModalProviderWrapper>
    </SettingsProviderWrapper>
  );
}
