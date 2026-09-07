import { Fragment, type ReactNode } from "react";

// ============================================================================
// One translated sentence, with one styled value inside it.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// The shape it replaces is everywhere in this codebase:
//
//     Move every product from{" "}
//     <span className="font-medium">{brand}</span>{" "}
//     to another brand, then remove …
//
// That is three JSX fragments, and §5q's rule is that a sentence is never
// built from fragments. A translator receives "Move every product from" and
// "to another brand, then remove" as two unrelated strings and cannot reorder
// them — but French routinely puts the object somewhere English does not, so
// the order is exactly what has to change. The gate could not see the tail
// either, because a text node next to an interpolation was invisible to it
// until 2026-09-07.
//
// So the catalogue holds the WHOLE sentence with a `{placeholder}`, and this
// splits it there and drops the styled value into the gap. The sentence stays
// one translatable unit and the value keeps its emphasis.
//
// ── IT IS NOT A TEMPLATE ENGINE ───────────────────────────────────────────
//
// One placeholder, appearing as many times as the sentence needs it. A
// sentence wanting two DIFFERENT styled values wants two calls or a rethink —
// nesting this inside itself is how a screen ends up with copy no one can
// read in either language.
// ============================================================================

export function InterpolatedText({
  template,
  placeholder = "{name}",
  children,
}: {
  /** The translated sentence, e.g. `t("mergeBrandHelp")`. */
  template: string;
  /** The token to replace. Defaults to `{name}`. */
  placeholder?: string;
  /** Rendered wherever the placeholder appears. */
  children: ReactNode;
}) {
  const parts = template.split(placeholder);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && children}
        </Fragment>
      ))}
    </>
  );
}
