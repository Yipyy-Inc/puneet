import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { AuthCard } from "@/components/auth/AuthCard";
import { FacilityAuthBrand } from "@/components/auth/FacilityAuthBrand";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getBrandingBySlug } from "@/lib/api/facility-branding";

// `generateMetadata` rather than a static object: the title follows the locale
// now, and a static export is evaluated before one is resolved.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta");
  return { title: t("reset") };
}

// ============================================================================
// Where the password-reset email lands.
//
// New with WorkOS (ADR 0004): Clerk emailed a code that was typed back into the
// sign-in form, so there was nothing to route to. WorkOS emails a link carrying
// a single-use token, and this is the page that token opens.
//
// BRANDED BY HOSTNAME like the other auth screens, because the link can perfectly
// well arrive on a facility's own host — a Pawradise customer who asked to reset
// their password should not land on a generic Yipyy page mid-flow.
//
// A Server Component: it reads the token from the query string and hands it to
// the client form, so the token never sits in a client bundle or a router cache
// beyond the single render.
// ============================================================================

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const slug = (await headers()).get("x-facility-slug");
  const branding = slug ? await getBrandingBySlug(slug) : null;
  const t = await getTranslations("auth.reset");

  const brand = branding ? (
    <FacilityAuthBrand branding={branding} />
  ) : undefined;

  // A missing token means the link was truncated, already used, or hand-typed.
  // Saying so beats rendering a form that can only fail on submit.
  if (!token) {
    return (
      <AuthCard
        signedOut
        title={t("badLinkTitle")}
        description={t("badLinkDescription")}
        brand={brand}
      >
        <p className="text-muted-foreground text-sm">{t("badLinkBody")}</p>
        <Link
          href="/sign-in"
          className="text-primary text-sm font-medium hover:underline"
        >
          {t("backToSignIn")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      signedOut
      title={t("title")}
      description={t("description")}
      brand={brand}
      footer={
        <p className="text-muted-foreground text-center text-sm">
          {t("remembered")}{" "}
          <Link
            href="/sign-in"
            className="text-primary font-medium hover:underline"
          >
            {t("signInLink")}
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
