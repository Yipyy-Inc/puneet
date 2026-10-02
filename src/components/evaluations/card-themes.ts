import type { CardTheme } from "@/lib/evaluations/questions";

// ============================================================================
// The report card's five themes (Setup › Card theme, the client's mock,
// 2026-10-02), each a header colour the system already has — every one
// carries white text at 5:1 or better (§1), so a theme can never make the
// card unreadable, and each is also a text ink, so the card's section labels
// and meters take the same colour:
//
//   Fresh start  success  #0F7A52     Autumn    warning  #8A5115
//   Classic      primary  #1668E3     Midnight  heading  #0E3A5C
//   Gentle       violet   #4C3BB8
//
// The mock's own hexes and its dotted header are its look, not ours.
// ============================================================================

export const CARD_THEME_STYLE: Record<
  CardTheme,
  { fill: string; ink: string; labelKey: string }
> = {
  green: { fill: "bg-success", ink: "text-success", labelKey: "themeGreen" },
  blue: { fill: "bg-primary", ink: "text-primary", labelKey: "themeBlue" },
  plum: { fill: "bg-violet", ink: "text-violet", labelKey: "themePlum" },
  fall: { fill: "bg-warning", ink: "text-warning", labelKey: "themeFall" },
  ink: { fill: "bg-heading", ink: "text-heading", labelKey: "themeInk" },
};
