import type { Location } from "@/types/location";

// The key names are retained (sky/violet/emerald/amber/rose) so every existing
// consumer keeps working, but their COLOUR VALUES are retuned to the HQ
// professional palette. Red is reserved strictly for errors/alerts and is never
// a location colour — the old "rose" slot now renders warm-grey Stone.
//
//   sky      → Navy   #1b2a4a
//   violet   → Teal   #007b6e
//   emerald  → Sage   #4d7c6f
//   amber    → Slate  #64748b  (Tailwind slate-500)
//   rose     → Stone  #78716c  (Tailwind stone-500; #e8e8e8 for soft borders)
export type LocationColorKey = "sky" | "violet" | "emerald" | "amber" | "rose";

export interface LocationColorClasses {
  key: LocationColorKey;
  bg: string;
  bgSoft: string;
  bgSofter: string;
  bgHover: string;
  text: string;
  textOn: string;
  textSoft: string;
  border: string;
  borderSoft: string;
  ring: string;
  ringSoft: string;
  fill: string;
  stroke: string;
  gradFrom: string;
  gradTo: string;
  badge: string;
}

const PALETTE: Record<LocationColorKey, LocationColorClasses> = {
  // Navy
  sky: {
    key: "sky",
    bg: "bg-[#1b2a4a]",
    bgSoft: "bg-[#1b2a4a]/10",
    bgSofter: "bg-[#1b2a4a]/5",
    bgHover: "hover:bg-[#1b2a4a]/15",
    text: "text-[#1b2a4a] dark:text-[#93a7d0]",
    textOn: "text-white",
    textSoft: "text-[#1b2a4a]/70 dark:text-[#93a7d0]/70",
    border: "border-[#1b2a4a]",
    borderSoft: "border-[#1b2a4a]/30",
    ring: "ring-[#1b2a4a]",
    ringSoft: "ring-[#1b2a4a]/20",
    fill: "fill-[#1b2a4a]",
    stroke: "stroke-[#1b2a4a]",
    gradFrom: "from-[#1b2a4a]/20",
    gradTo: "to-[#1b2a4a]/0",
    badge:
      "bg-[#1b2a4a]/10 text-[#1b2a4a] dark:bg-[#93a7d0]/15 dark:text-[#93a7d0]",
  },
  // Teal
  violet: {
    key: "violet",
    bg: "bg-[#007b6e]",
    bgSoft: "bg-[#007b6e]/10",
    bgSofter: "bg-[#007b6e]/5",
    bgHover: "hover:bg-[#007b6e]/15",
    text: "text-[#007b6e] dark:text-[#2eb6a6]",
    textOn: "text-white",
    textSoft: "text-[#007b6e]/70 dark:text-[#2eb6a6]/70",
    border: "border-[#007b6e]",
    borderSoft: "border-[#007b6e]/30",
    ring: "ring-[#007b6e]",
    ringSoft: "ring-[#007b6e]/20",
    fill: "fill-[#007b6e]",
    stroke: "stroke-[#007b6e]",
    gradFrom: "from-[#007b6e]/20",
    gradTo: "to-[#007b6e]/0",
    badge:
      "bg-[#007b6e]/10 text-[#007b6e] dark:bg-[#2eb6a6]/15 dark:text-[#2eb6a6]",
  },
  // Sage
  emerald: {
    key: "emerald",
    bg: "bg-[#4d7c6f]",
    bgSoft: "bg-[#4d7c6f]/10",
    bgSofter: "bg-[#4d7c6f]/5",
    bgHover: "hover:bg-[#4d7c6f]/15",
    text: "text-[#4d7c6f] dark:text-[#86b0a3]",
    textOn: "text-white",
    textSoft: "text-[#4d7c6f]/70 dark:text-[#86b0a3]/70",
    border: "border-[#4d7c6f]",
    borderSoft: "border-[#4d7c6f]/30",
    ring: "ring-[#4d7c6f]",
    ringSoft: "ring-[#4d7c6f]/20",
    fill: "fill-[#4d7c6f]",
    stroke: "stroke-[#4d7c6f]",
    gradFrom: "from-[#4d7c6f]/20",
    gradTo: "to-[#4d7c6f]/0",
    badge:
      "bg-[#4d7c6f]/10 text-[#4d7c6f] dark:bg-[#86b0a3]/15 dark:text-[#86b0a3]",
  },
  // Slate
  amber: {
    key: "amber",
    bg: "bg-slate-500",
    bgSoft: "bg-slate-500/10",
    bgSofter: "bg-slate-500/5",
    bgHover: "hover:bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-400",
    textOn: "text-white",
    textSoft: "text-slate-700/70 dark:text-slate-400/70",
    border: "border-slate-500",
    borderSoft: "border-slate-500/30",
    ring: "ring-slate-500",
    ringSoft: "ring-slate-500/20",
    fill: "fill-slate-500",
    stroke: "stroke-slate-500",
    gradFrom: "from-slate-500/20",
    gradTo: "to-slate-500/0",
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-950/50 dark:text-slate-300",
  },
  // Stone (warm grey) — the former red/rose slot; never red.
  rose: {
    key: "rose",
    bg: "bg-stone-500",
    bgSoft: "bg-stone-500/10",
    bgSofter: "bg-stone-500/5",
    bgHover: "hover:bg-stone-500/15",
    text: "text-stone-600 dark:text-stone-400",
    textOn: "text-white",
    textSoft: "text-stone-700/70 dark:text-stone-400/70",
    border: "border-stone-500",
    borderSoft: "border-stone-300",
    ring: "ring-stone-500",
    ringSoft: "ring-stone-500/20",
    fill: "fill-stone-500",
    stroke: "stroke-stone-500",
    gradFrom: "from-stone-500/20",
    gradTo: "to-stone-500/0",
    badge:
      "bg-stone-100 text-stone-700 dark:bg-stone-950/50 dark:text-stone-300",
  },
};

// Raw hex per key — used by locationHex() for consumers that need a colour
// value (e.g. recharts, which takes fill/stroke as props not classes).
const LOCATION_HEX: Record<LocationColorKey, string> = {
  sky: "#1b2a4a", // Navy
  violet: "#007b6e", // Teal
  emerald: "#4d7c6f", // Sage
  amber: "#64748b", // Slate
  rose: "#78716c", // Stone
};

// The spec palette's canonical hexes → keys. Locations carrying a legacy hex
// fall through to the shortcode map below, so every location still resolves to
// one of the five professional colours.
const HEX_TO_KEY: Record<string, LocationColorKey> = {
  "#1b2a4a": "sky", // Navy
  "#007b6e": "violet", // Teal
  "#4d7c6f": "emerald", // Sage
  "#64748b": "amber", // Slate
  "#e8e8e8": "rose", // Stone
};

const SHORTCODE_FALLBACK: Record<string, LocationColorKey> = {
  PLT: "sky", // Navy
  NDG: "violet", // Teal
  LVL: "emerald", // Sage
};

export function colorKeyFromLocation(loc: {
  color?: string;
  shortCode?: string;
}): LocationColorKey {
  if (loc.color) {
    const key = HEX_TO_KEY[loc.color.toLowerCase()];
    if (key) return key;
  }
  if (loc.shortCode && SHORTCODE_FALLBACK[loc.shortCode]) {
    return SHORTCODE_FALLBACK[loc.shortCode];
  }
  return "sky";
}

export function locationStyles(loc: {
  color?: string;
  shortCode?: string;
}): LocationColorClasses {
  return PALETTE[colorKeyFromLocation(loc)];
}

export function styleFromKey(key: LocationColorKey): LocationColorClasses {
  return PALETTE[key];
}

/** Palette hex for a colour key — for recharts series that aren't per-location
 *  (e.g. a boarding vs. daycare or new vs. returning split). */
export function hexFromKey(key: LocationColorKey): string {
  return LOCATION_HEX[key];
}

/** Palette hex for a location — routes legacy colours through the new palette. */
export function locationHex(loc: {
  color?: string;
  shortCode?: string;
}): string {
  return LOCATION_HEX[colorKeyFromLocation(loc)];
}

export function utilizationKey(rate: number): LocationColorKey {
  if (rate >= 70) return "emerald"; // Sage (healthy)
  if (rate >= 50) return "amber"; // Slate (moderate)
  return "rose"; // Stone (low) — muted, not red
}

/**
 * Health colour for a single-colour utilisation bar:
 *   teal ≥ 70%  ·  amber 50–70%  ·  red < 50%.
 * Red here is a health/alert signal (under-utilised staff), not a location
 * colour. Shares the 70/50 breakpoints with {@link utilizationKey}.
 */
export function utilizationHealth(rate: number): { bar: string; text: string } {
  if (rate >= 70)
    return { bar: "bg-[#007b6e]", text: "text-[#007b6e] dark:text-[#4fb3a8]" }; // Teal
  if (rate >= 50)
    return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

export function deltaKey(
  value: number,
  higherIsBetter: boolean = true,
): LocationColorKey {
  if (value === 0) return "sky"; // Navy (neutral)
  const positive = higherIsBetter ? value > 0 : value < 0;
  return positive ? "emerald" : "rose"; // Sage up / Stone down
}

export type SimpleLocation = Pick<
  Location,
  "id" | "name" | "shortCode" | "color" | "city"
>;
