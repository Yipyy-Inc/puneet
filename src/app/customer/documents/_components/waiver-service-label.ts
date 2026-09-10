import type { WaiverServiceTag } from "@/data/additional-features";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import type { AppLocale } from "@/lib/language-settings";

/**
 * A waiver's service tag, in the reader's language. The shared
 * `SERVICE_LABEL` map is English and is the facility screens'; the tags are
 * service ids, so `serviceTypeLabel` names them — all but `general`, which is
 * a waiver word rather than a service and lives in this page's catalogue.
 */
export function waiverServiceLabel(
  tag: WaiverServiceTag,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  return tag === "general"
    ? t("serviceGeneral")
    : serviceTypeLabel(locale, tag);
}
