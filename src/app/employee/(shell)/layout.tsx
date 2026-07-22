import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { EmployeeRbacBoundary } from "@/components/employee/EmployeeRbacBoundary";
import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";
import { LocationContextProviderWrapper } from "@/components/providers/LocationContextProviderWrapper";
import { BookingModalProviderWrapper } from "@/components/providers/BookingModalProviderWrapper";
import { LoyaltyProgramProvider } from "@/hooks/use-loyalty-program";
import { CallAvailabilityProvider } from "@/hooks/use-call-availability";
import { CallTagsProvider } from "@/hooks/use-call-tags";
import { ReputationProvider } from "@/hooks/use-reputation";
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar";
import { EmployeeHeader } from "@/components/employee/EmployeeHeader";
import { WriteUpAckBanner } from "@/components/employee/WriteUpAckBanner";
import { EmployeeBottomNav } from "@/components/employee/EmployeeBottomNav";

export default async function EmployeeShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const staffId = cookieStore.get("employee_staff_id")?.value;

  if (!staffId) {
    redirect("/employee/select");
  }

  return (
    // The signed-in employee is the acting RBAC viewer — every /employee screen
    // resolves permissions for THIS staff member (F0.2 / spec 8C), not the owner
    // default. Downstream screens read it via usePermission / useCan /
    // useEffectivePermissions / useFacilityViewer.
    <EmployeeRbacBoundary staffId={staffId}>
      {/* Section 5A: the employee portal renders the SAME admin module
          components (grooming, bookings, clients), so it must supply the same
          provider stack the facility layout does — otherwise those shared
          components throw (e.g. useLoyaltyEngine needs LoyaltyProgramProvider). */}
      <LocationContextProviderWrapper>
        <SettingsProviderWrapper>
          <LoyaltyProgramProvider>
            <BookingModalProviderWrapper>
              <CallAvailabilityProvider>
                <CallTagsProvider>
                  <ReputationProvider>
                    <SidebarProvider>
                      <EmployeeSidebar staffId={staffId} />
                      <SidebarInset className="flex min-h-screen flex-col">
                        <WriteUpAckBanner staffId={staffId} />
                        <EmployeeHeader staffId={staffId} />
                        {/* pb clears the fixed mobile bottom-nav (I1). */}
                        <main className="flex-1 overflow-x-hidden pb-16 md:pb-0">
                          {children}
                        </main>
                        <footer className="text-muted-foreground flex items-center justify-center border-t px-4 py-3 pb-20 text-xs md:pb-3">
                          © 2026 Yipyy · Employee Portal
                        </footer>
                      </SidebarInset>
                      <EmployeeBottomNav staffId={staffId} />
                    </SidebarProvider>
                  </ReputationProvider>
                </CallTagsProvider>
              </CallAvailabilityProvider>
            </BookingModalProviderWrapper>
          </LoyaltyProgramProvider>
        </SettingsProviderWrapper>
      </LocationContextProviderWrapper>
    </EmployeeRbacBoundary>
  );
}
