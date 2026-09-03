import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// ============================================================================
// ── WHY THIS IS NOT THE BARE `twMerge` ────────────────────────────────────
//
// tailwind-merge ships a table of the class groups it knows. `text-sm` is in
// it as a font size; §1's own type steps (`text-body`, `text-state-title`, the
// rest of docs/design-system/design-system.md §4's scale) are not, so
// tailwind-merge falls back to reading `text-<anything>` as a TEXT COLOUR —
// and then does its job perfectly, dropping the real colour class that came
// before it as a duplicate.
//
// Measured, not assumed:
//
//   twMerge("bg-primary text-primary-foreground text-body-strong")
//     -> "bg-primary text-body-strong"        // the white is GONE
//
// which is how a primary pill shipped with near-black type on #1668E3. The
// same collision silently strips `text-heading` from a section title and
// `text-ink-secondary` from body copy — every one of them a contrast failure
// with nothing in typecheck, lint or the compiled CSS to show for it, because
// the class never reaches the DOM at all.
//
// Naming the steps below puts them back in the font-size group, so a size and
// an ink can sit in one `cn()` and each still overrides only its own kind.
// KEEP THIS LIST IN STEP WITH THE `--text-*` KEYS IN src/app/globals.css.
// ============================================================================
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "page-title",
            "section",
            "body-strong",
            "body",
            "meta",
            "micro",
            "state-title",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
