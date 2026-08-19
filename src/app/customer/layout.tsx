import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getBrandingBySlug } from "@/lib/api/facility-branding";
import { canAccessCustomerPortal } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";
import { createServerClient } from "@/lib/supabase/server";
import { CustomerShell } from "./_shell";

// ============================================================================
// Customer portal.
//
// Now a Server Component so it can gate. The chrome moved to _shell.tsx, which
// still needs the pathname on the client.
//
// /customer/auth/* is exempt for the obvious reason: gating the login page
// makes signing in impossible.
//
// ── A SIGNED-IN STRANGER IS SENT TO /join (spec 002 phase 5) ──────────────
//
// `canAccessCustomerPortal` is "any session", deliberately — a pet owner has
// no membership by design. But on a FACILITY's own host, a session is not the
// same as being that facility's customer, and until now those were treated as
// one thing: somebody who signed up at pawradise.yipyy.com landed here with no
// `clients` row anywhere, on a dashboard scoped to a facility that had never
// heard of them.
//
// THE CHECK LIVES HERE RATHER THAN ON THE AUTH SCREENS because both Clerk
// flows finish at `/` — the email form navigates there after finalize(), and
// Google goes via /sso-callback. Threading a destination through both, plus
// the already-signed-in case and the invited-customer case, is four places to
// keep in agreement. The gate is one, and it is the one every path passes
// through.
//
// On the apex there is no facility to be a stranger at, so this does nothing —
// which is every existing customer today.
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

  const slug = (await headers()).get("x-facility-slug");
  if (slug) {
    // A slug is all a non-customer has: `facilities_read` refuses them, so
    // there is no id to look up. `my_client_at` answers about the caller only.
    const supabase = await createServerClient();
    const { data: clientId } = await supabase.rpc("my_client_at", {
      p_facility_slug: slug,
    });
    // /join is outside /customer, so this cannot loop.
    if (!clientId) redirect("/join");
  }

  // ── THE PORTAL NAMES THE BUSINESS WHOSE DOOR THEY CAME THROUGH ──────────
  //
  // The same read /sign-in, /sign-up and /join have always done. Those three
  // were correctly branded while everything INSIDE the portal said "Paws &
  // Play Daycare" to everybody — the shell's provider defaulted to the first
  // entry in src/data/facilities.ts. Found by walking CUJ-20 on 2026-08-19.
  //
  // Resolved here rather than in the shell because the answer is a function of
  // the hostname, which the server has and the client would have to be told.
  // `null` on the apex is the honest answer, not a failure.
  const branding = slug ? await getBrandingBySlug(slug) : null;

  return (
    <CustomerShell
      branding={
        branding && {
          name: branding.name,
          slug: branding.slug,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          accentColor: branding.accentColor,
        }
      }
    >
      {children}
    </CustomerShell>
  );
}
