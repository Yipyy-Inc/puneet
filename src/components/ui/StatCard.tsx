import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// Metric tile. docs/design-system/design-system.md §tiles.
//
// Same anatomy as `KpiTile`: 24px radius, 1px --line, 18px padding, the
// measured wash, a 40px SOLID carrier, a 12/700/.07em label with two lines
// reserved, a 30px tabular value and one 13px sub-line.
//
// Three things went, all named in §tiles' own "never" list or in rule 2:
//
//   - `bg-gradient-to-br from-<x> to-<x>/80` on every badge. The carrier is
//     one solid fill; a gradient at 80% opacity is a tint by another route.
//   - A `radial-gradient(... currentColor ...)` overlay at `opacity-5`. Rule 4
//     puts opacity off-limits as a de-emphasis tool, and a decorative smear
//     that changes with the ink is not a system value at all.
//   - `border-0`. §tiles gives every tile a 1px --line hairline; without it
//     the tile has no edge on the --ground it sits on.
// ============================================================================

type StatCardVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "secondary";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  variant?: StatCardVariant;
}

const VARIANT_STYLES: Record<
  StatCardVariant,
  { wash: string; badge: string; glyph: string }
> = {
  primary: {
    wash: "yy-wash-primary",
    badge: "bg-primary",
    glyph: "text-white",
  },
  success: {
    wash: "yy-wash-success",
    badge: "bg-success",
    glyph: "text-white",
  },
  warning: {
    wash: "yy-wash-warning",
    badge: "bg-warning",
    glyph: "text-white",
  },
  info: { wash: "yy-wash-primary", badge: "bg-info", glyph: "text-white" },
  secondary: {
    wash: "yy-wash-violet",
    badge: "bg-violet",
    glyph: "text-white",
  },
  // Neutral is not one of the five washes, so the tile is plain white.
  default: { wash: "", badge: "bg-ink-secondary", glyph: "text-white" },
};

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "primary",
}: StatCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "border-line bg-card shadow-card rounded-2xl border p-[18px]",
        styles.wash,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Two lines reserved so a wrapping French label cannot push its own
              figure down and break a row of tiles (§tiles, §5q). */}
          <p className="text-ink-secondary min-h-[2.6em] text-[12px] leading-[1.3] font-bold tracking-[0.07em] uppercase">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-body-ink text-[30px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums">
              {value}
            </h3>
            {change && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[13px] font-semibold tabular-nums",
                  changeType === "up" && "text-success",
                  changeType === "down" && "text-bad",
                  changeType === "neutral" && "text-ink-secondary",
                )}
              >
                {/* The glyph is what carries direction for a reader who cannot
                    separate the green from the red (§3). */}
                {changeType === "up" && <TrendingUp className="size-4" />}
                {changeType === "down" && <TrendingDown className="size-4" />}
                {change}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-ink-secondary mt-1 line-clamp-2 text-[13px]">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            styles.badge,
            styles.glyph,
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
