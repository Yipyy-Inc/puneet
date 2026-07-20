import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FacilitySidebar } from "@/components/layout/facility-admin-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BookingModalProviderWrapper } from "@/components/providers/BookingModalProviderWrapper";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { GlobalSearchNext } from "@/components/search/GlobalSearchNext";
import { MobileSearch } from "@/components/search/MobileSearch";
import { FacilityHeaderActions } from "@/components/layout/FacilityHeaderActions";
import { SupportCenter } from "@/components/layout/SupportCenter";
import { SupportFab } from "@/components/layout/SupportFab";
import { FacilityMobileBottomNav } from "@/components/layout/FacilityMobileBottomNav";
import { LocationContextProviderWrapper } from "@/components/providers/LocationContextProviderWrapper";
import { FacilityOnboardingBanner } from "@/components/facility/onboarding/facility-onboarding-banner";
import { ImpersonationBanner } from "@/components/facility/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/facility/announcement-banner";
import { LoyaltyProgramProvider } from "@/hooks/use-loyalty-program";
import { CallAvailabilityProvider } from "@/hooks/use-call-availability";
import { CallTagsProvider } from "@/hooks/use-call-tags";
import { ReputationProvider } from "@/hooks/use-reputation";

export default async function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  // Gate the facility portal to facility_admin. Super admins are also allowed
  // through so they can review facility/HQ features without switching roles.
  // No role set (undefined) defaults to facility_admin for testing.
  const allowedRoles = ["facility_admin", "super_admin"];
  if (userRole && !allowedRoles.includes(userRole)) {
    redirect("/dashboard");
  }

  return (
    <LocationContextProviderWrapper>
      <SettingsProviderWrapper>
        <LoyaltyProgramProvider>
          <BookingModalProviderWrapper>
            <CallAvailabilityProvider>
              <CallTagsProvider>
                <ReputationProvider>
                  <SidebarProvider className="min-h-[calc(100vh-64px)]">
                    <FacilitySidebar />
                    <SidebarInset className="flex min-h-[calc(100vh-64px)] min-w-0 flex-col overflow-x-clip">
                      <header className="from-background to-muted/20 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-linear-to-r px-4 backdrop-blur-sm sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors md:hidden" />
                          <GlobalSearchNext
                            className="hidden w-[460px] max-w-[480px] min-w-0 sm:flex"
                            canCreateCustomer={userRole === "facility_admin"}
                          />
                          <MobileSearch
                            className="sm:hidden"
                            canCreateCustomer={userRole === "facility_admin"}
                          />
                        </div>
                        <FacilityHeaderActions facilityId={11} />
                      </header>
                      <main className="min-w-0 flex-1 overflow-x-clip">
                        <ImpersonationBanner />
                        <AnnouncementBanner facilityId={11} />
                        <FacilityOnboardingBanner />
                        {children}
                      </main>
                      <FacilityMobileBottomNav />
                    </SidebarInset>
                    <SupportFab />
                    <SupportCenter />
                  </SidebarProvider>
                </ReputationProvider>
              </CallTagsProvider>
            </CallAvailabilityProvider>
          </BookingModalProviderWrapper>
        </LoyaltyProgramProvider>
      </SettingsProviderWrapper>
    </LocationContextProviderWrapper>
  );
}
