"use client";

/**
 * Shared Recharts presentation layer for every report chart.
 *
 * One place for the theme-aware palette, a dark-safe tooltip, consistent axis
 * ticks + axis-title labels, a legend config, and a card wrapper — so every
 * chart across the app reads as one system instead of hand-rolling its own
 * axes/tooltip/colors. Number formatting flows through @/lib/format.
 */

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatValue, type ValueFormat } from "@/lib/format";

// ── Palette ─────────────────────────────────────────────────────────────────
// Theme-aware series colors backed by the --chart-* CSS vars in globals.css
// (they already have light + dark values), so charts recolor with the theme.
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Cycle the palette for arbitrary series counts. */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// ── Axis + grid config ──────────────────────────────────────────────────────
export const axisTick = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const;

export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  vertical: false,
} as const;

export const legendProps = {
  iconType: "circle" as const,
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
};

/**
 * Axis-title label config. Every chart should title both axes so a reader never
 * has to guess what a series or tick means.
 */
export function axisLabel(value: string, axis: "x" | "y") {
  return axis === "x"
    ? {
        value,
        position: "insideBottom" as const,
        offset: -2,
        style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
      }
    : {
        value,
        angle: -90 as const,
        position: "insideLeft" as const,
        style: {
          fill: "hsl(var(--muted-foreground))",
          fontSize: 11,
          textAnchor: "middle" as const,
        },
      };
}

// ── Tooltip ─────────────────────────────────────────────────────────────────
interface TooltipPayloadItem {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ReportTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  /** Format for values — a single format, or per-dataKey. Defaults to number. */
  format?: ValueFormat | Record<string, ValueFormat>;
  /** Optional relabeling of the header (the axis category). */
  labelFormatter?: (label: string | number) => string;
  /** Optional relabeling of a series name (e.g. id → display name). */
  nameFormatter?: (name: string) => string;
}

/**
 * Dark-safe custom tooltip. Pass as `content={<ReportTooltip format="currency" />}`.
 * Uses popover tokens so it renders correctly in light AND dark mode (the
 * legacy inline white-background tooltips did not).
 */
export function ReportTooltip({
  active,
  payload,
  label,
  format = "number",
  labelFormatter,
  nameFormatter,
}: ReportTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const fmtFor = (key?: string | number): ValueFormat =>
    typeof format === "string" ? format : (format[String(key)] ?? "number");
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-semibold">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((item, i) => {
          const name = String(item.name ?? item.dataKey ?? "");
          return (
            <div
              key={`${name}-${i}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">
                  {nameFormatter ? nameFormatter(name) : name}
                </span>
              </span>
              <span className="font-semibold tabular-nums">
                {formatValue(item.value, fmtFor(item.dataKey))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tick formatter factory for axes, e.g. `tickFormatter={tickFmt("currency")}`. */
export function tickFmt(
  format: ValueFormat | "compactCurrency" | "compactNumber",
) {
  return (v: number | string) => {
    if (format === "compactCurrency") return formatValueCompact(v, "currency");
    if (format === "compactNumber") return formatValueCompact(v, "number");
    return formatValue(v, format);
  };
}

function formatValueCompact(
  v: number | string,
  kind: "currency" | "number",
): string {
  // Local import-free compact to avoid a circular re-export; mirrors @/lib/format.
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  const suffix = abs >= 1_000_000 ? "M" : abs >= 1_000 ? "k" : "";
  const scaled =
    abs >= 1_000_000 ? n / 1_000_000 : abs >= 1_000 ? n / 1_000 : n;
  const body = suffix ? scaled.toFixed(1) : String(Math.round(n));
  return kind === "currency" ? `$${body}${suffix}` : `${body}${suffix}`;
}

// ── Card wrapper + empty state ──────────────────────────────────────────────
export interface ReportChartCardProps {
  title: string;
  subtitle?: string;
  /** Right-aligned header slot (e.g. a toggle). */
  actions?: ReactNode;
  /** Chart height in px (the ResponsiveContainer fills the card width). */
  height?: number;
  className?: string;
  children: ReactNode;
  /** When true, render the empty state instead of the chart. */
  isEmpty?: boolean;
  emptyMessage?: string;
}

/** Consistent card chrome + spacing for a titled chart, matching the dashboard. */
export function ReportChartCard({
  title,
  subtitle,
  actions,
  height = 280,
  className,
  children,
  isEmpty,
  emptyMessage = "No data in this period",
}: ReportChartCardProps) {
  return (
    <Card className={cn("gap-0 p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {isEmpty ? (
        <ChartEmpty message={emptyMessage} height={height} />
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </Card>
  );
}

/** Inline empty state for a chart whose range genuinely has no data. */
export function ChartEmpty({
  message,
  height = 280,
}: {
  message: string;
  height?: number;
}) {
  return (
    <div
      className="text-muted-foreground flex flex-col items-center justify-center gap-2 text-center"
      style={{ height }}
    >
      <div className="bg-muted/40 flex size-10 items-center justify-center rounded-xl">
        <Inbox className="size-5 opacity-60" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
