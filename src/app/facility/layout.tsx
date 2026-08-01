import { canAccessFacilityPortal, canManageCustomers } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";
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
  // One identity for the whole portal, from the signed JWT when there is a
  // session. The gate still answers with the old cookie rule until
  // AUTH_ENFORCED is switched on — see lib/auth/viewer.ts.
  const viewer = await guardPortal({
    portal: "facility",
    allow: canAccessFacilityPortal,
    whenWrongPortal: "/dashboard",
  });

  const canCreateCustomer = canManageCustomers(viewer);

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
                            canCreateCustomer={canCreateCustomer}
                          />
                          <MobileSearch
                            className="sm:hidden"
                            canCreateCustomer={canCreateCustomer}
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
