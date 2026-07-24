/**
 * Canonical number / currency / percent formatters for reports & analytics.
 *
 * One source of truth so every chart, KPI tile, table and tooltip renders the
 * same way: currency as $X,XXX.XX, counts with thousands separators, and
 * percentages to one decimal place. Compact variants ($1.2k, 3.4M) are for
 * axis ticks where space is tight.
 */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_WHOLE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const COUNT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** `$1,234.56` — the canonical currency format for reports. */
export function formatCurrency(value: number | null | undefined): string {
  return USD.format(Number(value ?? 0));
}

/** `$1,235` — whole-dollar currency, for headline KPI values where cents add noise. */
export function formatCurrencyWhole(value: number | null | undefined): string {
  return USD_WHOLE.format(Number(value ?? 0));
}

/** `1,234` — integer count with thousands separators. */
export function formatCount(value: number | null | undefined): string {
  return COUNT.format(Number(value ?? 0));
}

/** `12.3%` — percentage to one decimal place. Pass the already-scaled value (e.g. 12.3, not 0.123). */
export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  return `${Number(value ?? 0).toFixed(digits)}%`;
}

/** Compact currency for axis ticks: `$1.2k`, `$3.4M`. */
export function formatCompactCurrency(
  value: number | null | undefined,
): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

/** Compact count for axis ticks: `1.2k`, `3.4M`. */
export function formatCompactNumber(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export type ValueFormat = "currency" | "percent" | "number";

/** Format a value by a named format — used by shared chart tooltips/axes. */
export function formatValue(
  value: number | string | null | undefined,
  format: ValueFormat = "number",
): string {
  const n = Number(value ?? 0);
  if (format === "currency") return formatCurrency(n);
  if (format === "percent") return formatPercent(n);
  return formatCount(n);
}

// ── Period-over-period delta ────────────────────────────────────────────────

export type DeltaDirection = "up" | "down" | "flat";

export interface Delta {
  /** Signed percentage change vs. the previous period (e.g. +12.3, -4.0). */
  pct: number;
  direction: DeltaDirection;
  /** Preformatted label, e.g. "+12.3%". `—` when there is no comparable base. */
  label: string;
  /** True when the previous period had no data to compare against. */
  isNew: boolean;
}

/**
 * Period-over-period change of `current` vs `previous`. When `previous` is 0,
 * there is no meaningful percentage base, so `isNew` is set and the label
 * degrades to "—" (or "New" when current > 0) rather than a bogus +∞%.
 */
export function computeDelta(current: number, previous: number): Delta {
  if (!previous) {
    const isNew = current !== 0;
    return {
      pct: 0,
      direction: current > 0 ? "up" : "flat",
      label: isNew ? "New" : "—",
      isNew: true,
    };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const direction: DeltaDirection =
    Math.abs(pct) < 0.05 ? "flat" : pct > 0 ? "up" : "down";
  const sign = pct > 0 ? "+" : "";
  return { pct, direction, label: `${sign}${pct.toFixed(1)}%`, isNew: false };
}
