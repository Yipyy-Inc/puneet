import { canAccessStaffPortal } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";
import { legacyStaffIdForEmail } from "@/lib/auth/legacy-identity";
import { LegacyIdentityBridge } from "@/components/auth/LegacyIdentityBridge";
import { StaffShell } from "./_shell";

// ============================================================================
// Staff portal. Previously ungated, beneath a login that never checked a
// password and offered one-click sign-in as any staff member.
// ============================================================================

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await guardPortal({
    portal: "staff",
    allow: canAccessStaffPortal,
    publicPrefixes: ["/staff/auth"],
  });

  return (
    <>
      <LegacyIdentityBridge
        staffId={await legacyStaffIdForEmail(viewer.email)}
      />
      <StaffShell>{children}</StaffShell>
    </>
  );
}
