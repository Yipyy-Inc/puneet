/**
 * End a sentence that finishes with interpolated text.
 *
 * QuickBooks company names routinely end in punctuation — "Yipyy Pet Services
 * Inc." — so writing `{companyName}.` produces "Inc..". That slipped through
 * three separate screens before this existed; use it anywhere a company or
 * account name lands at the end of a sentence.
 */
export function withPeriod(text: string | undefined): string {
  if (!text) return "";
  return /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}
