import type { CallTag } from "@/types/calling";

// ============================================================
// Call-tag taxonomy helpers: the fixed colour palette a manager
// can choose from, and the per-facility cap that keeps the list
// usable.
// ============================================================

export const MAX_CALL_TAGS = 20;

export const TAG_COLORS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
  "gray",
] as const;
export type TagColor = (typeof TAG_COLORS)[number];

/** pill = chip styling for a tag; solid = swatch / analytics bar fill. */
export const TAG_COLOR_CLASSES: Record<TagColor, { pill: string; solid: string }> = {
  red: {
    pill: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    solid: "bg-red-500",
  },
  orange: {
    pill: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    solid: "bg-orange-500",
  },
  amber: {
    pill: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    solid: "bg-amber-500",
  },
  green: {
    pill: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    solid: "bg-green-500",
  },
  teal: {
    pill: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
    solid: "bg-teal-500",
  },
  blue: {
    pill: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    solid: "bg-blue-500",
  },
  indigo: {
    pill: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    solid: "bg-indigo-500",
  },
  purple: {
    pill: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    solid: "bg-purple-500",
  },
  pink: {
    pill: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
    solid: "bg-pink-500",
  },
  gray: {
    pill: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
    solid: "bg-gray-400",
  },
};

export function tagColorClasses(color: string): { pill: string; solid: string } {
  return TAG_COLOR_CLASSES[color as TagColor] ?? TAG_COLOR_CLASSES.gray;
}

/** Count how many times each tag id appears across a set of calls. */
export function countTagFrequency(
  logs: { tags?: string[] }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of logs) {
    for (const id of c.tags ?? []) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Resolve tag ids to their CallTag definitions, dropping unknown ids. */
export function resolveTags(ids: string[], taxonomy: CallTag[]): CallTag[] {
  return ids
    .map((id) => taxonomy.find((t) => t.id === id))
    .filter((t): t is CallTag => t != null);
}
