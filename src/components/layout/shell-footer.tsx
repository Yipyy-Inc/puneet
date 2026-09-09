"use client";

import { useShellText } from "@/lib/shell/use-shell-text";
import type { ShellGroup } from "@/lib/shell/text";

/**
 * The copyright line at the bottom of a portal.
 *
 * A CLIENT component, and that is the whole reason it exists. The three
 * layouts that render this line — the root one wrapping all 266 routes, the
 * super-admin portal's and the employee portal's — are Server Components, and
 * the reader's language lives in `localStorage["settings-language"]`, which a
 * server render cannot see. So the line stayed English in every language.
 *
 * It stayed English UNSEEN, too: `check:ui-french` derives its shell surfaces
 * from the four portal layouts, and the root layout sits ABOVE all four, on
 * nobody's list. `isProse()` then rejected the string a second time, for
 * starting with `©` rather than a letter — a guard written to throw away
 * ", VariantProps". Two independent blind spots over the same line.
 */
export function ShellFooter({
  group,
  className,
}: {
  group: ShellGroup;
  className: string;
}) {
  const t = useShellText(group);
  return <footer className={className}>{t("copyright")}</footer>;
}
