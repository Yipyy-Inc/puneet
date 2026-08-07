import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { FacilityAuthBrand } from "@/components/auth/FacilityAuthBrand";
import { getBrandingBySlug } from "@/lib/api/facility-branding";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

import { JoinFacilityForm } from "./join-facility-form";

// ============================================================================
// Becoming a customer of the facility whose door you came through.
//
// Spec 002 phase 5 built every WRITE for this — register_client,
// link_client_record, allow_customer_signup — and nothing called them. A pet
// owner could create a Clerk account at pawradise.yipyy.com and end up signed
// in with no `clients` row anywhere: a stranger holding a valid session.
//
// ── WHY A SCREEN AND NOT A SILENT AUTO-JOIN ───────────────────────────────
//
// Registering somebody the instant they sign in would put people on a
// business's client list because they opened a link. The facility's client
// list is their book of customers, not a visitor log, and joining is an act
// somebody performs.
//
// It also has to collect a NAME. Clerk has one only if they typed it, and
// register_client falls back to the local part of their email address —
// "j.smith" is what the facility's front desk would then see.
//
// ── THE THREE STATES, IN THIS ORDER ───────────────────────────────────────
//
//   already a client here  -> straight to the portal, nothing to ask
//   the facility takes registrations -> the form
//   it does not            -> say so, and still offer to look, because
//                             register_client CLAIMS a record the facility
//                             already made even when signup is closed. Being
//                             entered by the front desk IS an invitation.
//
// ── NO FACILITY IN THE HOSTNAME ───────────────────────────────────────────
//
// On the apex there is nothing to join. That is not an error and must not read
// as one — it is somebody who reached /join at yipyy.com, and the honest answer
// is that facilities live at their own addresses.
// ============================================================================

export async function generateMetadata(): Promise<Metadata> {
  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;
  return { title: branding ? `Join ${branding.name}` : "Join — Yipyy" };
}

export default async function JoinPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/sign-in?next=%2Fjoin");

  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;

  if (!slug || !branding) {
    return (
      <AuthCard
        title="No facility here"
        description="Each business on Yipyy has its own web address."
      >
        <p className="text-muted-foreground text-sm">
          Open the address your groomer, daycare or boarding kennel gave you —
          it looks like <strong>theirname.yipyy.com</strong> — and you can join
          them from there.
        </p>
      </AuthCard>
    );
  }

  // Already a customer here? Then there is nothing to ask, and asking anyway
  // would invite somebody to join a business they are already with.
  //
  // A READ, deliberately: `link_client_record` would also answer this and it
  // WRITES, which has no business running while a page renders. The claim
  // happens on the form's POST, where a side effect belongs.
  const supabase = await createServerClient();
  const [{ data: existing }, { data: profile }] = await Promise.all([
    supabase.rpc("my_client_at", { p_facility_slug: slug }),
    // `profiles_read` admits your own row, so this is the caller reading
    // themselves. Only to pre-fill the name field — the address the record is
    // created under comes off the profile inside register_client, never from
    // this page.
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (existing) redirect("/customer/dashboard");

  return (
    <AuthCard
      title={`Join ${branding.name}`}
      description={
        branding.allowCustomerSignup
          ? "A few details, and you can book and see your pets' visits."
          : `${branding.name} adds customers themselves.`
      }
      brand={<FacilityAuthBrand branding={branding} />}
    >
      <JoinFacilityForm
        facilityName={branding.name}
        open={branding.allowCustomerSignup}
        suggestedName={profile?.full_name ?? ""}
      />
    </AuthCard>
  );
}
