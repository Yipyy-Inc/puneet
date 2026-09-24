import { formatMoney, formatPercent } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { ServiceAddOn } from "@/types/facility";

// ============================================================================
// WHAT AN ADD-ON COSTS, AS A SENTENCE.
//
// ── WHY THIS IS ITS OWN FILE ──────────────────────────────────────────────
//
// It lived in `AddOnsManager.tsx`, 749 lines of client component, and
// `tests/unit/addon-price.test.ts` imported it from there — which meant a test
// about number formatting loaded the whole editor, its dialog, and whatever
// those imported in turn.
//
// That was free until 2026-09-24, when the add-on dialog's image URL box became
// a real uploader: `RoomImageUpload` reaches `use-image-upload`, which reaches
// the WorkOS Supabase client, and `@workos-inc/authkit-nextjs/components`
// imports `server-only` — which THROWS outside Next's bundler. The test went
// from six passing assertions to one unhandled error, and the error named
// `server-only`, not the add-on dialog, so nothing in it pointed here.
//
// A pure function should not drag a component tree behind it. Splitting it is
// CLAUDE.md's own rule — keep components small, separate state from UI — and it
// makes the test cheap again as a side effect rather than as a workaround.
//
// ── WHY THE CATALOGUE SUPPLIES THE WHOLE SUFFIX ───────────────────────────
//
// `$${addon.price}` put a leading dollar sign on every figure and a `/` in
// front of every unit. Both are English-only shapes: fr-CA writes `42,50 $`,
// sign trailing, with a non-breaking space so the two never wrap apart — and
// it says `par jour`, not `/jour`. Intl decides the money; the catalogue
// supplies the whole suffix rather than a fragment glued to a slash.
// ============================================================================

export function formatPrice(
  addon: ServiceAddOn,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  const amount = formatMoney(addon.price, locale);
  const per = (unit: string) =>
    t("pricePerUnit").replace("{amount}", amount).replace("{unit}", unit);
  switch (addon.pricingType) {
    case "flat":
      return amount;
    case "per_day":
      return t("pricePerDay").replace("{amount}", amount);
    case "per_session":
      return per(addon.unitLabel || t("unitSession"));
    case "per_hour":
      return per(addon.unitLabel || t("unitHour"));
    case "per_item":
      return per(addon.unitLabel || t("unitItem"));
    case "percentage_of_booking":
      return t("priceOfBooking").replace(
        "{pct}",
        formatPercent(addon.price, locale),
      );
  }
}
