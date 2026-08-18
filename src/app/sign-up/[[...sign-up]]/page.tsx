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
    // The browser tab is part of the branding too. A facility whose page says
    // their name under Yipyy's paw icon is still half somebody else's site.
    // Only when they HAVE a mark -- the root layout's icon stays the fallback,
    // because a missing favicon is worse than a generic one.
    ...(branding?.logoUrl ? { icons: { icon: branding.logoUrl } } : {}),
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

  // ── NO FACILITY IN THE HOSTNAME: THERE IS NOTHING TO SIGN UP FOR ─────────
  //
  // A Yipyy login only means something at a business. Somebody who registers
  // on the apex gets a credential that opens nothing: every portal gate wants a
  // membership, RLS returns no rows without one, and they are routed
  // / -> /customer/dashboard -> /join -> "no facility here". Two people did
  // exactly that and both hold accounts that can see nothing.
  //
  // Nobody legitimate arrives here either. Checked, not assumed: the facility
  // OWNER and STAFF invitations build their link from the facility's own host
  // (lib/public-origin.ts, which exists specifically to stop those emails
  // pointing at the wrong door), and a PLATFORM admin is invited to
  // /setup/<token>, not here. So this form had no user with a reason to use it.
  //
  // It says where to go rather than 404ing: somebody reading this is a pet
  // owner who guessed the address, and "not found" answers a question they did
  // not ask.
  //
  // WHAT THIS DOES NOT CLOSE, said plainly: OAuth does not distinguish signing
  // in from signing up (see OAuthButton), so "Continue with Google" on the apex
  // SIGN-IN screen still mints an account for a new address. That screen has to
  // keep it -- it is how the platform admins actually sign in. This removes the
  // dead end and the obvious path, not every path, and it does not need to be a
  // hard gate: a credential on its own grants nothing.
  if (!branding) {
    return (
      <AuthCard
        signedOut
        title={t("signUp.noFacilityTitle")}
        description={t("signUp.noFacilityDescription")}
        footer={
          <p className="text-muted-foreground text-center text-sm">
            <Link
              href="/sign-in"
              className="text-primary font-medium hover:underline"
            >
              {t("signUp.noFacilitySignIn")}
            </Link>
          </p>
        }
      >
        <p className="text-muted-foreground text-sm">
          {t("signUp.noFacilityBody")}
        </p>
      </AuthCard>
    );
  }

  // Past the guard above, so there IS a facility. The old third arm for "no
  // branding" is gone rather than left unreachable -- a dead branch reads as a
  // case somebody still has to think about.
  const description = branding.allowCustomerSignup
    ? t("signUp.descriptionJoin", { name: branding.name })
    : t("signUp.descriptionNoSelfSignup", { name: branding.name });

  return (
    <AuthCard
      signedOut
      title={t("signUp.title")}
      description={description}
      brand={<FacilityAuthBrand branding={branding} />}
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
      <EmailSignUpForm facilityName={branding.name} />

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
