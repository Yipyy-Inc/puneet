"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A filter tile. docs/design-system/design-system.md §tiles.
 *
 * Same anatomy as `KpiTile` — 24px radius, 18px padding, a 40px solid carrier,
 * 12/700/.07em label with two lines reserved, a 30px tabular value — and the
 * same two selection states: SELECTED is a full 2px inset ring with the value
 * stepping to `--primary-hover`, APPLIED is the solid `--primary` fill for the
 * one filter currently narrowing the view.
 *
 * What it replaced: `ring-primary bg-primary/5 ring-2`. The `/5` tint is
 * exactly the fill rule 2 bans, and it was carrying the selection on its own.
 */
interface ClickableStatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  onClick?: () => void;
  isActive?: boolean;
  /** The single applied filter — solid, and only ever one at a time. */
  isApplied?: boolean;
  valueClassName?: string;
}

export function ClickableStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  onClick,
  isActive,
  isApplied,
  valueClassName,
}: ClickableStatCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        `border-line relative rounded-2xl border p-[18px] transition-[transform,box-shadow,border-color] duration-180 ease-[ease] motion-reduce:transition-none`,
        // One shadow class per state — see the note in kpi-tile.tsx for why
        // stacking them silently loses the selected ring.
        isApplied
          ? "bg-primary border-transparent shadow-(--sh-cta)"
          : "bg-card yy-wash-primary",
        isActive && !isApplied
          ? "border-transparent shadow-[inset_0_0_0_2px_var(--primary),var(--sh)]"
          : !isApplied && "shadow-card",
        onClick && [
          "cursor-pointer",
          "hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-18px_rgba(10,27,51,0.4)]",
          !isApplied && !isActive && "hover:border-line-strong",
          "motion-reduce:hover:translate-y-0",
        ],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "min-h-[2.6em] text-[12px] leading-[1.3] font-bold tracking-[0.07em] uppercase",
              isApplied
                ? "text-white/80"
                : isActive
                  ? "text-primary-hover"
                  : "text-ink-secondary",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-[30px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums",
              isApplied
                ? "text-white"
                : isActive
                  ? "text-primary-hover"
                  : "text-body-ink",
              valueClassName,
            )}
          >
            {value}
          </p>
          <p
            className={cn(
              "mt-1 line-clamp-2 text-[13px]",
              isApplied ? "text-white/80" : "text-ink-secondary",
            )}
          >
            {subtitle}
          </p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isApplied ? "bg-white/16 text-white" : "bg-primary text-white",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
