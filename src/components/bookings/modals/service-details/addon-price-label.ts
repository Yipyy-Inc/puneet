import type { AppLocale } from "@/lib/language-settings";
import { formatMoney, formatPercent } from "@/lib/i18n/format";
import type { ServiceAddOn } from "@/types/facility";

/**
 * `$15/day` · `15 $/jour` — an add-on's price with its unit (§5q).
 *
 * Boarding, daycare and evaluation each carried their own copy of this, all
 * three building `$${price}/day` by hand: US order and English units on a
 * French screen, and a "15 $" that could wrap away from its number. One copy
 * now, reading `shell.booking` for the words. A unit the facility typed
 * (`unitLabel`) is its own text and passes through as written.
 */
export function addOnPriceLabel(
  addon: ServiceAddOn,
  t: (key: string) => string,
  locale: AppLocale,
): string {
  const price = formatMoney(addon.price, locale, {
    whole: Number.isInteger(addon.price),
  });
  const per = (fallbackUnitKey: string) =>
    t("pricePerUnit")
      .replace("{price}", price)
      .replace("{unit}", addon.unitLabel || t(fallbackUnitKey));

  switch (addon.pricingType) {
    case "per_day":
      return per("unitDay");
    case "per_session":
      return per("unitSession");
    case "per_hour":
      return per("unitHour");
    case "per_item":
      return per("unitItem");
    case "percentage_of_booking":
      return t("percentOfBooking").replace(
        "{percent}",
        formatPercent(addon.price, locale),
      );
    default:
      return price;
  }
}
