import { redirect } from "next/navigation";
import { resolveEmployeeIdentity } from "@/lib/auth/employee-identity";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { EmployeeRbacBoundary } from "@/components/employee/EmployeeRbacBoundary";
import { PermissionsHydration } from "@/components/providers/PermissionsHydration";
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
import { RegisterOpenGate } from "@/components/employee/RegisterOpenGate";
import { RegisterCloseReminder } from "@/components/employee/RegisterCloseReminder";
import { RegisterCloseWatcher } from "@/components/employee/RegisterCloseWatcher";

export default async function EmployeeShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // WHO YOU ARE COMES FROM THE SESSION. The cookie only chooses when the
  // session cannot answer.
  //
  // This shell used to take its acting staff member from `employee_staff_id`
  // alone — a cookie written by /employee/select, which is a picker, not a
  // proof. That was survivable while permissions were computed client-side
  // from the same cookie: identity and authority were wrong together, so at
  // least they agreed.
  //
  // They stopped agreeing when permissions moved to the session
  // (PermissionsHydration). Picking a colleague then gave you THEIR name and
  // YOUR permissions — no privilege gained, but every action attributed to
  // someone who did not take it. Verified before writing this: signed in as
  // the owner, acting as a groomer with the till permission revoked, the
  // register gate appeared anyway, because the owner holds it.
  //
  // The rule lives in resolveEmployeeIdentity() because the pages INSIDE this
  // layout have to apply the same one — /employee and /employee/register each
  // used to re-read the cookie on their own and disagree with the shell around
  // them. See src/lib/auth/employee-identity.ts.
  const { staffId, mayPick } = await resolveEmployeeIdentity();

  if (!staffId) {
    // Nobody to seat. Which of the two reasons decides where they go: a signed-in
    // person with no staff record picks one, a signed-out one signs in. Sending
    // both to the picker made the destination depend on whether this layout or
    // the portal guard above it finished first.
    redirect(mayPick ? "/employee/select" : "/sign-in");
  }

  return (
    // Wherever FacilityRbacProvider is mounted, the server's permission map has
    // to be seeded alongside it. Mount one without the other and SSR resolves
    // from the legacy cascade while the client resolves from the database — a
    // hydration mismatch on every permission-gated control in this shell.
    <PermissionsHydration>
      {/* The signed-in employee is the acting RBAC viewer — every /employee
        screen resolves permissions for THIS staff member (F0.2 / spec 8C), not
        the owner default. Downstream screens read it via usePermission /
        useCan / useEffectivePermissions / useFacilityViewer. */}
      <EmployeeRbacBoundary staffId={staffId}>
        {/* Mandatory cash-count gate: for staff with register access, blocks the
          whole portal with the opening-count flow until today's drawer is open
          (facility-toggleable). Sits outside the heavy provider stack so it
          renders instantly and nothing else mounts while gated. */}
        <RegisterOpenGate staffId={staffId}>
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
                            {/* Past-closing "count & close" nudge (closing_time
                              mode) — supports opener ≠ closer. */}
                            <RegisterCloseWatcher staffId={staffId} />

                            {/* pb clears the fixed mobile bottom-nav (I1). */}
                            <main className="flex-1 overflow-x-hidden pb-16 md:pb-0">
                              {children}
                            </main>
                            <footer className="text-muted-foreground flex items-center justify-center border-t px-4 py-3 pb-20 text-xs md:pb-3">
                              © 2026 Yipyy · Employee Portal
                            </footer>
                          </SidebarInset>
                          <EmployeeBottomNav staffId={staffId} />
                          {/* Close reminder: pops the count-and-close flow when an
                          authorized employee clocks out / logs out with the
                          drawer still open. */}
                          <RegisterCloseReminder staffId={staffId} />
                        </SidebarProvider>
                      </ReputationProvider>
                    </CallTagsProvider>
                  </CallAvailabilityProvider>
                </BookingModalProviderWrapper>
              </LoyaltyProgramProvider>
            </SettingsProviderWrapper>
          </LocationContextProviderWrapper>
        </RegisterOpenGate>
      </EmployeeRbacBoundary>
    </PermissionsHydration>
  );
}
