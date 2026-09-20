import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getBrandingBySlug } from "@/lib/api/facility-branding";
import { canAccessCustomerPortal } from "@/lib/auth/viewer";
import { nextQuery } from "@/lib/auth/safe-next";
import { guardPortal } from "@/lib/auth/portal-gate";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
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
    // /join is outside /customer, so this cannot loop. It carries the page
    // they asked for, so joining returns them to it — the estimate a link in
    // their email opened, rather than the dashboard.
    if (!clientId) {
      redirect(`/join${nextQuery((await headers()).get("x-pathname"))}`);
    }
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
  //
  // ── AND ON THE APEX, THE FACILITY THEY ARE A CLIENT OF ──────────────────
  //
  // `null` was called the honest answer here. It is not what the reader gets:
  // the shell's provider falls back to `src/data/facilities.ts[0]`, so every
  // customer who reached yipyy.com/customer rather than their facility's own
  // address was told they were at "Paws & Play Daycare" — a fixture business
  // that exists nowhere, in the sidebar, the header and the welcome line, over
  // their own real bookings. Exactly the defect CUJ-20 found in 2026-08, half
  // fixed: the hostname path was corrected and the apex path was not.
  //
  // The hostname is not the only thing that names a facility. A signed-in
  // customer's own client row does too, and it is the same answer — so it is
  // read the same way /api/clients/me reads it, under the caller's own RLS
  // (`clients_read` admits a customer only their own record), and turned into
  // branding through the same projection. First by `ref` for somebody who is a
  // client at two businesses: the apex cannot know which they mean, and their
  // oldest is a better guess than a fixture.
  //
  // Still `null` for a signed-in stranger with no client record anywhere. That
  // one is genuinely unanswerable, and it is the case /join exists for.
  let branding = slug ? await getBrandingBySlug(slug) : null;
  if (!slug) {
    const user = await getCurrentUser().catch(() => null);
    if (user) {
      const supabase = await createServerClient();
      const { data: mine } = await supabase
        .from("clients")
        .select("facilities!inner(slug)")
        .eq("profile_id", user.id)
        .order("ref")
        .limit(1)
        .maybeSingle();
      const own = (mine as { facilities?: { slug: string } } | null)?.facilities
        ?.slug;
      if (own) branding = await getBrandingBySlug(own);
    }
  }

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
