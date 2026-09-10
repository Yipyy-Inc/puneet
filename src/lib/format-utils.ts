import type { AppLocale } from "@/lib/language-settings";
import { formatDateLong, formatTime } from "@/lib/i18n/format";
/** Shared date formatting for notes and audit entries. */
/**
 * "Tue, Sep 1, 2026 · 2:30 PM" · "mar. 1 sept. 2026 · 14 h 30".
 *
 * Was `toLocaleDateString("en-US", …)` — American formatting on every note
 * in every portal. It takes the reader's locale now and composes the two
 * `Intl` formatters §5q already trusts, rather than a third format string.
 */
export function formatNoteDate(iso: string, locale: AppLocale): string {
  return `${formatDateLong(iso, locale)} · ${formatTime(iso, locale)}`;
}
