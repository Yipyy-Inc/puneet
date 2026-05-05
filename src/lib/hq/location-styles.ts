import type { Location } from "@/types/location";

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
  sky: {
    key: "sky",
    bg: "bg-sky-500",
    bgSoft: "bg-sky-500/10",
    bgSofter: "bg-sky-500/5",
    bgHover: "hover:bg-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    textOn: "text-white",
    textSoft: "text-sky-700/70 dark:text-sky-400/70",
    border: "border-sky-500",
    borderSoft: "border-sky-500/30",
    ring: "ring-sky-500",
    ringSoft: "ring-sky-500/20",
    fill: "fill-sky-500",
    stroke: "stroke-sky-500",
    gradFrom: "from-sky-500/20",
    gradTo: "to-sky-500/0",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  violet: {
    key: "violet",
    bg: "bg-violet-500",
    bgSoft: "bg-violet-500/10",
    bgSofter: "bg-violet-500/5",
    bgHover: "hover:bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    textOn: "text-white",
    textSoft: "text-violet-700/70 dark:text-violet-400/70",
    border: "border-violet-500",
    borderSoft: "border-violet-500/30",
    ring: "ring-violet-500",
    ringSoft: "ring-violet-500/20",
    fill: "fill-violet-500",
    stroke: "stroke-violet-500",
    gradFrom: "from-violet-500/20",
    gradTo: "to-violet-500/0",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
  emerald: {
    key: "emerald",
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-500/10",
    bgSofter: "bg-emerald-500/5",
    bgHover: "hover:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    textOn: "text-white",
    textSoft: "text-emerald-700/70 dark:text-emerald-400/70",
    border: "border-emerald-500",
    borderSoft: "border-emerald-500/30",
    ring: "ring-emerald-500",
    ringSoft: "ring-emerald-500/20",
    fill: "fill-emerald-500",
    stroke: "stroke-emerald-500",
    gradFrom: "from-emerald-500/20",
    gradTo: "to-emerald-500/0",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  amber: {
    key: "amber",
    bg: "bg-amber-500",
    bgSoft: "bg-amber-500/10",
    bgSofter: "bg-amber-500/5",
    bgHover: "hover:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    textOn: "text-white",
    textSoft: "text-amber-700/70 dark:text-amber-400/70",
    border: "border-amber-500",
    borderSoft: "border-amber-500/30",
    ring: "ring-amber-500",
    ringSoft: "ring-amber-500/20",
    fill: "fill-amber-500",
    stroke: "stroke-amber-500",
    gradFrom: "from-amber-500/20",
    gradTo: "to-amber-500/0",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  rose: {
    key: "rose",
    bg: "bg-rose-500",
    bgSoft: "bg-rose-500/10",
    bgSofter: "bg-rose-500/5",
    bgHover: "hover:bg-rose-500/15",
    text: "text-rose-600 dark:text-rose-400",
    textOn: "text-white",
    textSoft: "text-rose-700/70 dark:text-rose-400/70",
    border: "border-rose-500",
    borderSoft: "border-rose-500/30",
    ring: "ring-rose-500",
    ringSoft: "ring-rose-500/20",
    fill: "fill-rose-500",
    stroke: "stroke-rose-500",
    gradFrom: "from-rose-500/20",
    gradTo: "to-rose-500/0",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

const HEX_TO_KEY: Record<string, LocationColorKey> = {
  "#0ea5e9": "sky",
  "#8b5cf6": "violet",
  "#22c55e": "emerald",
  "#f59e0b": "amber",
  "#f43f5e": "rose",
};

const SHORTCODE_FALLBACK: Record<string, LocationColorKey> = {
  PLT: "sky",
  NDG: "violet",
  LVL: "emerald",
};

export function colorKeyFromLocation(loc: { color?: string; shortCode?: string }): LocationColorKey {
  if (loc.color) {
    const key = HEX_TO_KEY[loc.color.toLowerCase()];
    if (key) return key;
  }
  if (loc.shortCode && SHORTCODE_FALLBACK[loc.shortCode]) {
    return SHORTCODE_FALLBACK[loc.shortCode];
  }
  return "sky";
}

export function locationStyles(loc: { color?: string; shortCode?: string }): LocationColorClasses {
  return PALETTE[colorKeyFromLocation(loc)];
}

export function styleFromKey(key: LocationColorKey): LocationColorClasses {
  return PALETTE[key];
}

export function utilizationKey(rate: number): LocationColorKey {
  if (rate >= 85) return "emerald";
  if (rate >= 70) return "amber";
  return "rose";
}

export function deltaKey(value: number, higherIsBetter: boolean = true): LocationColorKey {
  if (value === 0) return "sky";
  const positive = higherIsBetter ? value > 0 : value < 0;
  return positive ? "emerald" : "rose";
}

export type SimpleLocation = Pick<Location, "id" | "name" | "shortCode" | "color" | "city">;
