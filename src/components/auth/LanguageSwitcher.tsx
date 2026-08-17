"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setClientLocaleCookie, type AppLocale } from "@/lib/language-settings";
import { cn } from "@/lib/utils";

// ============================================================================
// Choosing a language before you have an account.
//
// Every other language control in this app lives behind a session — facility
// settings, the customer profile — which left the one screen where somebody has
// no session yet with no way to read it in their own language. A French-speaking
// pet owner arriving at a Quebec facility's sign-in page had to sign in in
// English to find the setting that would have let them sign in in French.
//
// ── HOW THE CHOICE TRAVELS ────────────────────────────────────────────────
//
// `NEXT_LOCALE` is the cookie src/i18n/request.ts already reads, so this writes
// the same one every other locale decision in the app is made from rather than
// inventing a second channel. It survives sign-in, which is the point: the
// language you picked here is still the language you get afterwards.
//
// `router.refresh()` and NOT a navigation. The cookie is read on the SERVER, so
// something has to re-render — but a refresh refetches the RSC payload in place,
// which keeps whatever the person had already typed into the form and never asks
// the client router to navigate. (That last part is not incidental; a soft
// redirect through the client router is what crashed the front door on
// 2026-08-17 — see docs/quality/debt-map.md.)
//
// ── WHY THE OPTIONS ARE PASSED IN ─────────────────────────────────────────
//
// Which locales exist is an app setting (`APP_LANG_*` cookies, read by
// loadLanguageSettingsFromCookies), and the server has already resolved it by
// the time this renders. Passing the answer down avoids a client-side read that
// would disagree with the server on the first paint and flip after hydration.
// AuthCard renders nothing at all when only one locale is enabled, so this
// component never has to draw a control with a single choice.
// ============================================================================

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
};

export function LanguageSwitcher({
  locales,
  current,
  label,
}: {
  locales: AppLocale[];
  current: AppLocale;
  /** Translated, because it is the one word that has to make sense either way. */
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: AppLocale) {
    if (locale === current) return;
    setClientLocaleCookie(locale);
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="text-muted-foreground mt-6 flex items-center justify-center gap-2 text-xs"
      data-pending={pending ? "" : undefined}
    >
      <Languages className="size-3.5 shrink-0" aria-hidden="true" />
      {/* A radiogroup rather than a row of buttons: a screen reader should hear
          "English, selected, 1 of 2", not two unrelated controls. */}
      <div role="radiogroup" aria-label={label} className="flex items-center">
        {locales.map((locale, index) => (
          <span key={locale} className="flex items-center">
            {index > 0 && <span className="text-border px-1.5">|</span>}
            <button
              type="button"
              role="radio"
              aria-checked={locale === current}
              // `lang` so a screen reader pronounces "Français" in French
              // rather than reading it as English.
              lang={locale}
              disabled={pending}
              onClick={() => choose(locale)}
              className={cn(
                "rounded-sm px-1 transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                locale === current
                  ? "text-foreground font-medium"
                  : "hover:text-foreground",
                pending && "cursor-wait opacity-60",
              )}
            >
              {LOCALE_LABELS[locale]}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
