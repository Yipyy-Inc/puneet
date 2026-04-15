"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type KpiTone =
  | "indigo"
  | "amber"
  | "rose"
  | "emerald"
  | "slate"
  | "violet";

interface KpiTileProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: KpiTone;
  trail?: { label: string; value: number | string }[];
  onClick?: () => void;
  active?: boolean;
}

const TONE_STYLES: Record<
  KpiTone,
  {
    accentBg: string;
    accentText: string;
    halo: string;
    border: string;
    iconRing: string;
  }
> = {
  indigo: {
    accentBg: "bg-gradient-to-br from-indigo-500 via-indigo-500 to-blue-600",
    accentText: "text-indigo-600 dark:text-indigo-300",
    halo: "from-indigo-200/60 via-transparent to-transparent dark:from-indigo-500/15",
    border: "border-indigo-100/80 dark:border-indigo-900/40",
    iconRing: "ring-indigo-200/70 dark:ring-indigo-900/40",
  },
  amber: {
    accentBg: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500",
    accentText: "text-amber-600 dark:text-amber-300",
    halo: "from-amber-200/60 via-transparent to-transparent dark:from-amber-500/15",
    border: "border-amber-100/80 dark:border-amber-900/40",
    iconRing: "ring-amber-200/70 dark:ring-amber-900/40",
  },
  rose: {
    accentBg: "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500",
    accentText: "text-rose-600 dark:text-rose-300",
    halo: "from-rose-200/60 via-transparent to-transparent dark:from-rose-500/15",
    border: "border-rose-100/80 dark:border-rose-900/40",
    iconRing: "ring-rose-200/70 dark:ring-rose-900/40",
  },
  emerald: {
    accentBg: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500",
    accentText: "text-emerald-600 dark:text-emerald-300",
    halo: "from-emerald-200/60 via-transparent to-transparent dark:from-emerald-500/15",
    border: "border-emerald-100/80 dark:border-emerald-900/40",
    iconRing: "ring-emerald-200/70 dark:ring-emerald-900/40",
  },
  slate: {
    accentBg: "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700",
    accentText: "text-slate-700 dark:text-slate-200",
    halo: "from-slate-200/60 via-transparent to-transparent dark:from-slate-500/15",
    border: "border-slate-200/70 dark:border-slate-800/60",
    iconRing: "ring-slate-200/70 dark:ring-slate-800/60",
  },
  violet: {
    accentBg: "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500",
    accentText: "text-violet-600 dark:text-violet-300",
    halo: "from-violet-200/60 via-transparent to-transparent dark:from-violet-500/15",
    border: "border-violet-100/80 dark:border-violet-900/40",
    iconRing: "ring-violet-200/70 dark:ring-violet-900/40",
  },
};

export function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
  trail,
  onClick,
  active,
}: KpiTileProps) {
  const styles = TONE_STYLES[tone];
  const isInteractive = !!onClick;

  return (
    <Card
      data-tone={tone}
      data-active={active ? "true" : undefined}
      className={cn(
        "group relative overflow-hidden border bg-card transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg",
        styles.border,
        isInteractive && "cursor-pointer",
        active && "ring-2 ring-offset-2 ring-offset-background",
        active && styles.iconRing,
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          styles.halo,
        )}
      />
      <div className="relative flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-semibold leading-tight tracking-tight tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="text-muted-foreground line-clamp-1 text-[11px]">
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-2 transition-transform group-hover:scale-105",
            styles.accentBg,
            styles.iconRing,
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      {trail && trail.length > 0 && (
        <div className="relative flex flex-wrap gap-x-3 gap-y-0.5 border-t border-dashed border-current/10 px-4 py-1.5">
          {trail.map((t) => (
            <span
              key={t.label}
              className="text-muted-foreground inline-flex items-center gap-1 text-xs"
            >
              <span className="font-semibold tabular-nums text-foreground">
                {t.value}
              </span>
              {t.label}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
