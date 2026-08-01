import { canAccessStaffPortal } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";
import { legacyStaffIdForEmail } from "@/lib/auth/legacy-identity";
import { LegacyIdentityBridge } from "@/components/auth/LegacyIdentityBridge";
import { GroomerShell } from "./_shell";

// ============================================================================
// Groomer portal. Previously ungated entirely — anyone who typed the URL was
// in, and the login page beneath it accepted any password.
// ============================================================================

export default async function GroomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await guardPortal({
    allow: canAccessStaffPortal,
    publicPrefixes: ["/groomer/auth"],
  });

  return (
    <>
      <LegacyIdentityBridge
        staffId={await legacyStaffIdForEmail(viewer.email)}
      />
      <GroomerShell>{children}</GroomerShell>
    </>
  );
}
