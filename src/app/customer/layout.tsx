import { canAccessCustomerPortal } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";
import { CustomerShell } from "./_shell";

// ============================================================================
// Customer portal.
//
// Now a Server Component so it can gate. The chrome moved to _shell.tsx, which
// still needs the pathname on the client.
//
// /customer/auth/* is exempt for the obvious reason: gating the login page
// makes signing in impossible.
// ============================================================================

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPortal({
    allow: canAccessCustomerPortal,
    publicPrefixes: ["/customer/auth"],
  });

  return <CustomerShell>{children}</CustomerShell>;
}
