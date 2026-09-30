import type { AppLocale } from "@/lib/language-settings";
import { formatMoney } from "@/lib/i18n/format";

/**
 * `$15/item` · `15 $/article` — an add-on's price as a picker shows it (§5q).
 *
 * Boarding, daycare and evaluation each carried their own copy of this, all
 * three building `$${price}/day` by hand: US order and English units on a
 * French screen, and a "15 $" that could wrap away from its number. One copy
 * now, reading `shell.booking` for the words.
 *
 * One unit, because the add-ons list has one price and the booking says how
 * many (`price × quantity`). The JSON it replaced priced by day, session,
 * hour or a percentage of the booking, each with a unit the facility could
 * type; none of that came across, and every add-on has read "/item" since.
 */
export function addOnPriceLabel(
  addon: { price: number },
  t: (key: string) => string,
  locale: AppLocale,
): string {
  const price = formatMoney(addon.price, locale, {
    whole: Number.isInteger(addon.price),
  });
  return t("pricePerUnit")
    .replace("{price}", price)
    .replace("{unit}", t("unitItem"));
}
