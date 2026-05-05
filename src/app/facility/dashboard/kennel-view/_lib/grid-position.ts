// Static lookup tables so Tailwind sees every class literal at build time.
// We support up to 14 columns (the 2-week view).

export const COL_START_CLASS: Record<number, string> = {
  1: "col-start-[1]",
  2: "col-start-[2]",
  3: "col-start-[3]",
  4: "col-start-[4]",
  5: "col-start-[5]",
  6: "col-start-[6]",
  7: "col-start-[7]",
  8: "col-start-[8]",
  9: "col-start-[9]",
  10: "col-start-[10]",
  11: "col-start-[11]",
  12: "col-start-[12]",
  13: "col-start-[13]",
  14: "col-start-[14]",
};

export const COL_SPAN_CLASS: Record<number, string> = {
  1: "col-span-[1]",
  2: "col-span-[2]",
  3: "col-span-[3]",
  4: "col-span-[4]",
  5: "col-span-[5]",
  6: "col-span-[6]",
  7: "col-span-[7]",
  8: "col-span-[8]",
  9: "col-span-[9]",
  10: "col-span-[10]",
  11: "col-span-[11]",
  12: "col-span-[12]",
  13: "col-span-[13]",
  14: "col-span-[14]",
};

export const GRID_COLS_CLASS: Record<number, string> = {
  7: "grid-cols-[repeat(7,minmax(0,1fr))]",
  14: "grid-cols-[repeat(14,minmax(0,1fr))]",
};

export function colStart(col: number): string {
  return COL_START_CLASS[Math.max(1, Math.min(14, col))];
}

export function colSpan(span: number): string {
  return COL_SPAN_CLASS[Math.max(1, Math.min(14, span))];
}

export function gridCols(numDays: number): string {
  return GRID_COLS_CLASS[numDays] ?? GRID_COLS_CLASS[14];
}

// Map a hex colour back to a Tailwind background class so service-indicator
// dots can be coloured without an inline style attribute. Hex values mirror
// `COLOR_HEX_MAP` in src/data/custom-services.ts.
export const HEX_TO_BG_CLASS: Record<string, string> = {
  "#3b82f6": "bg-blue-500",
  "#6366f1": "bg-indigo-500",
  "#06b6d4": "bg-cyan-500",
  "#22c55e": "bg-green-500",
  "#10b981": "bg-emerald-500",
  "#ec4899": "bg-pink-500",
  "#f97316": "bg-orange-500",
  "#eab308": "bg-yellow-500",
  "#a855f7": "bg-purple-500",
  "#ef4444": "bg-red-500",
  "#14b8a6": "bg-teal-500",
  "#6b7280": "bg-gray-500",
  "#9ca3af": "bg-gray-400",
};

export function bgClassForHex(hex: string | undefined): string {
  if (!hex) return "bg-indigo-500";
  return HEX_TO_BG_CLASS[hex.toLowerCase()] ?? "bg-indigo-500";
}
