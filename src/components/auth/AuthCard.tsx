import Image from "next/image";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

import { LanguageSwitcher } from "@/components/auth/LanguageSwitcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getEnabledLocales,
  loadLanguageSettingsFromCookies,
} from "@/lib/language-settings";

// ============================================================================
// The shell every auth screen sits in.
//
// Eight pages had eight copies of this markup, which is how the customer login
// and the groomer login drifted into using different padding, different icon
// offsets and different error styling for the same job. One shell, one set of
// spacing decisions.
//
// Restored when sign-in moved to Clerk: Clerk renders the credential UI, but
// the PAGE around it is still ours, so the brand, the wording and the spacing
// stay Yipyy's rather than a vendor's default screen.
//
// No "use client": this is presentational, so a Server Component page can use
// it directly and only the interactive widget inside pays for hydration.
//
// ── IT ALSO CARRIES THE LANGUAGE ──────────────────────────────────────────
//
// Two jobs live here rather than in each page because both are about the SHELL
// around the credential UI, and eight copies of this markup is exactly how the
// auth screens drifted apart the first time.
//
//   1. `NextIntlClientProvider`, scoped to the `auth` namespace ONLY. The
//      default provider hands the client every message in the catalogue; the
//      forms need about sixty strings, so passing the one namespace keeps ~19 kB
//      of facility, billing and reporting copy out of a page whose entire job is
//      a login box.
//
//   2. The language switcher, for people who have no session yet and therefore
//      no settings screen to change it on. `signedOut` gates it: /join runs
//      behind a session and its reader already has a language preference
//      elsewhere, so it opts out rather than showing a second control.
//
// A screen that has NOT been translated must not pass `signedOut` — a switcher
// over hardcoded English is a control that pretends to work.
// ============================================================================

export function AuthBrandLogo() {
  return (
    <Image
      src="/yipyy-transparent.png"
      alt="Yipyy"
      width={120}
      height={48}
      className="h-12 w-auto"
      // Above the fold on every auth screen, so it is the LCP element.
      priority
    />
  );
}

export async function AuthCard({
  title,
  description,
  brand,
  children,
  footer,
  signedOut = false,
}: {
  title: string;
  description?: React.ReactNode;
  /** Defaults to the Yipyy wordmark; portals with their own mark pass it in. */
  brand?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * This screen is reachable without a session, so offer the language choice
   * here. Only pass it from a screen whose copy actually comes from `messages`.
   */
  signedOut?: boolean;
}) {
  const [locale, messages, t, cookieStore] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("auth.language"),
    cookies(),
  ]);

  const settings = loadLanguageSettingsFromCookies(
    cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; "),
  );
  const locales = getEnabledLocales(settings);

  return (
    <div className="from-background via-muted/20 to-background flex min-h-screen flex-col items-center justify-center bg-linear-to-br p-4">
      <NextIntlClientProvider
        locale={locale}
        // The namespace, not the catalogue — see the note above.
        messages={{ auth: messages.auth }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-4 flex justify-center">
              {brand ?? <AuthBrandLogo />}
            </div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
            {footer}
          </CardContent>
        </Card>

        {/* Below the card, not inside it: the card is one task and this is not
            part of it. Hidden outright when the app offers a single locale —
            a switcher with one option is decoration. */}
        {signedOut && locales.length > 1 && (
          <LanguageSwitcher
            locales={locales}
            current={locale as (typeof locales)[number]}
            label={t("label")}
          />
        )}
      </NextIntlClientProvider>
    </div>
  );
}
