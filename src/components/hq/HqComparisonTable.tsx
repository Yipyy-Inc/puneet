"use client";

import { DataTable, type DataTableProps } from "@/components/ui/DataTable";

// Re-exported so HQ pages define columns without importing DataTable directly.
export type { ColumnDef } from "@/components/ui/DataTable";

type HqComparisonTableProps<T extends object> = DataTableProps<T>;

/**
 * The standard HQ comparison table — a thin configuration of the shared
 * DataTable (never a hand-rolled table). It turns on the HQ conventions:
 *   • sticky header row on vertical scroll
 *   • alternating row shading (white / very light grey)
 *   • sortable headers with a sort indicator (built into DataTable)
 * Columns keep DataTable's `ColumnDef` shape; set `align: "right"` on numeric
 * columns (left-aligned text is the default). Use `bestWorstClass` inside a
 * column's `render` to highlight the best (green) / worst (red) cell.
 *
 * Substrate for Performance (Area 3) and Service Catalog (Area 6).
 */
export function HqComparisonTable<T extends object>({
  itemsPerPage = 50,
  ...props
}: HqComparisonTableProps<T>) {
  return (
    <DataTable stickyHeader zebra {...props} itemsPerPage={itemsPerPage} />
  );
}

/**
 * Cell highlight helper for a comparison group. Given the current cell `value`
 * and the full set of comparable `values` (all cells in the row, or all cells
 * in a column), returns a className that renders the best value green and the
 * worst red. Set `higherIsBetter=false` for metrics where lower wins (cost,
 * churn, wait time). Returns "" when there's nothing meaningful to highlight.
 */
export function bestWorstClass(
  value: number,
  values: number[],
  higherIsBetter: boolean = true,
): string {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length < 2 || !Number.isFinite(value)) return "";
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  if (max === min) return ""; // all equal — nothing to distinguish
  const best = higherIsBetter ? max : min;
  const worst = higherIsBetter ? min : max;
  if (value === best) {
    return "font-semibold text-emerald-600 dark:text-emerald-400";
  }
  if (value === worst) {
    return "font-semibold text-red-600 dark:text-red-400";
  }
  return "";
}
