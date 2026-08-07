import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

import { AuthCard } from "@/components/auth/AuthCard";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { FacilityAuthBrand } from "@/components/auth/FacilityAuthBrand";
import { getBrandingBySlug } from "@/lib/api/facility-branding";

export async function generateMetadata(): Promise<Metadata> {
  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;
  return { title: branding ? `Sign in — ${branding.name}` : "Sign in — Yipyy" };
}

// ============================================================================
// The canonical sign-in, and the one every portal gate redirects to.
//
// Deliberately portal-neutral: it does not ask who you are. The token is read
// afterwards and routes accordingly (see landingPathForClaims). One person may
// be a groomer at one facility and an owner at another; asking them to pick a
// portal before signing in asks a question they should not have to answer.
//
// No Clerk component is rendered here — see GoogleSignInButton for why. The
// whole screen is Yipyy's markup; Clerk is the mechanism behind the button.
//
// ── BRANDED BY HOSTNAME (spec 002 phase 3) ────────────────────────────────
//
// `x-facility-slug` is stamped by proxy.ts from the Host header, so
// pawradise.yipyy.com shows Pawradise's name and logo. With no facility — the
// apex, www, localhost — this renders exactly what it always did, so the
// neutral card is the fallback rather than a special case.
//
// The read is anonymous ON PURPOSE (facility-branding.ts): nobody has signed in
// yet, and that is the whole point of the screen.
//
// The portal-neutral principle above is UNCHANGED by branding. Arriving at a
// facility's host does not scope the session to it — it paints the page. Which
// portal you land in is still decided by your token afterwards, and a customer
// of another facility who signs in here gets sent to their own.
//
// A Server Component; only the button carries a client boundary.
// ============================================================================

export default async function SignInPage() {
  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;

  return (
    <AuthCard
      title="Sign in"
      description={
        branding
          ? (branding.tagline ?? `Sign in to ${branding.name}.`)
          : "Use your Yipyy account — we'll take you to the right place."
      }
      brand={branding ? <FacilityAuthBrand branding={branding} /> : undefined}
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <EmailSignInForm />

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <GoogleSignInButton mode="sign-in" />
    </AuthCard>
  );
}
