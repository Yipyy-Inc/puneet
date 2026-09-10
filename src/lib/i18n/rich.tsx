import { Fragment, type ReactNode } from "react";

/**
 * A translated sentence with ELEMENTS in it, not just values.
 *
 *   rich(t("newReportCard"), {
 *     facility: <strong>{name}</strong>,
 *     pet: <strong>{pet}</strong>,
 *   })
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * `fill()` puts a STRING into a sentence. But half the sentences on a
 * customer screen put a bold name or a link mid-sentence — "New report card
 * from **Paws & Play** — **Buddy** had a great day" — and the English source
 * built them as JSX fragments around literal words:
 *
 *   New report card from <b>{facility}</b> — <b>{pet}</b> had a …
 *
 * Translating the fragments one by one pins each value where English put it,
 * and French does not put them there. So the whole sentence is ONE catalogue
 * string with `{placeholders}`, and this splits it back into text and
 * elements at render time. The translator can move `{pet}` anywhere.
 *
 * A placeholder with no matching part is left as its literal text, so a
 * missing value is visible in review rather than silently dropped.
 */
export function rich(
  template: string,
  parts: Record<string, ReactNode>,
): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((segment, index) => {
    const name = /^\{(\w+)\}$/.exec(segment)?.[1];
    if (name && name in parts) {
      return <Fragment key={index}>{parts[name]}</Fragment>;
    }
    return segment;
  });
}
