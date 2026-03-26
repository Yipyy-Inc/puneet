"use client";

import { createElement } from "react";
import { resolveIcon } from "@/lib/service-registry";
import { getContrastTextColor } from "@/lib/color-utils";
import type { Tag } from "@/data/tags-notes";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: Tag;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-[10px] px-1.5 py-0 gap-0.5 h-5",
  md: "text-xs px-2 py-0.5 gap-1 h-6",
  lg: "text-sm px-2.5 py-1 gap-1.5 h-7",
} as const;

const ICON_SIZES = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
} as const;

const PRIORITY_RING = {
  critical:
    "ring-2 ring-red-400/60 dark:ring-red-500/60 motion-safe:animate-pulse",
  warning: "ring-1 ring-yellow-400/50 dark:ring-yellow-500/50",
  informational: "",
} as const;

export function TagBadge({
  tag,
  size = "md",
  showIcon = true,
  showRemove = false,
  onRemove,
  className,
}: TagBadgeProps) {
  const textColor = getContrastTextColor(tag.color);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap shrink-0 transition-all",
        SIZE_CLASSES[size],
        PRIORITY_RING[tag.priority],
        className,
      )}
      style={{ backgroundColor: tag.color, color: textColor }}
      title={tag.description ?? tag.name}
    >
      {showIcon &&
        createElement(resolveIcon(tag.icon), {
          className: ICON_SIZES[size],
        })}
      <span
        className={cn(
          "truncate",
          size === "sm"
            ? "max-w-[60px]"
            : size === "md"
              ? "max-w-[100px]"
              : "max-w-[140px]",
        )}
        title={tag.name}
      >
        {tag.name}
      </span>
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className={size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"} />
        </button>
      )}
    </span>
  );
}
