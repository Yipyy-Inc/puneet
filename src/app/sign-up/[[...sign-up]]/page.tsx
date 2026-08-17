import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { AuthCard } from "@/components/auth/AuthCard";
import { EmailSignUpForm } from "@/components/auth/EmailSignUpForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AppleSignInButton } from "@/components/auth/AppleSignInButton";
import { FacilityAuthBrand } from "@/components/auth/FacilityAuthBrand";
import { getBrandingBySlug } from "@/lib/api/facility-branding";

export async function generateMetadata(): Promise<Metadata> {
  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;
  const t = await getTranslations("auth.meta");
  return {
    title: branding ? t("signUpBranded", { name: branding.name }) : t("signUp"),
  };
}

// ============================================================================
// Sign-up. Counterpart to ../sign-in; see GoogleSignInButton for why neither
// screen renders a Clerk component.
//
// A new account exists in Clerk immediately, but its `profiles` row arrives via
// the sync webhook (src/app/api/webhooks/clerk/route.ts), which is
// asynchronous. So a brand-new user can land signed in with no memberships and
// be refused by every portal gate for a moment. That is expected: membership is
// a grant an admin makes, never a consequence of filling in a form.
//
// ── BRANDED BY HOSTNAME, LIKE SIGN-IN (spec 002 phase 3) ──────────────────
//
// This was the asymmetry: sign-in carried the facility's mark and sign-up did
// not, so a customer following "create an account" from Pawradise's own login
// page landed on a generic Yipyy card mid-signup. The one screen where somebody
// decides whether they trust a business.
//
// ── WHAT SIGNING UP HERE DOES AND DOES NOT DO ─────────────────────────────
//
// It creates a YIPYY ACCOUNT — a credential, one per person, shared across
// every facility they deal with. It does NOT make them a customer of this
// facility; that is a separate act with its own screen (/join), because it puts
// somebody on a business's client list.
//
// So the copy says which is which. A facility that does not take online
// registrations still needs a working sign-up page — its existing customers
// have to be able to create the credential they sign in with — but promising
// them they are joining would be false.
// ============================================================================

export default async function SignUpPage() {
  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;
  const t = await getTranslations("auth");

  const description = !branding
    ? t("signUp.description")
    : branding.allowCustomerSignup
      ? t("signUp.descriptionJoin", { name: branding.name })
      : t("signUp.descriptionNoSelfSignup", { name: branding.name });

  return (
    <AuthCard
      signedOut
      title={t("signUp.title")}
      description={description}
      brand={branding ? <FacilityAuthBrand branding={branding} /> : undefined}
      footer={
        <p className="text-muted-foreground text-center text-sm">
          {t("signUp.haveAccount")}{" "}
          <Link
            href="/sign-in"
            className="text-primary font-medium hover:underline"
          >
            {t("signUp.signInLink")}
          </Link>
        </p>
      }
    >
      <EmailSignUpForm />

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">{t("actions.or")}</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <GoogleSignInButton />
      <AppleSignInButton />
    </AuthCard>
  );
}
