"use client";

import { createElement } from "react";
import { resolveIcon } from "@/lib/service-registry";
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
  md: "size-3",
  lg: "size-3.5",
} as const;

const PRIORITY_STYLES = {
  critical: "border-red-300 dark:border-red-800",
  warning: "border-amber-300 dark:border-amber-800",
  informational: "border-border/60",
} as const;

export function TagBadge({
  tag,
  size = "md",
  showIcon = true,
  showRemove = false,
  onRemove,
  className,
}: TagBadgeProps) {
  return (
    <span
      className={cn(
        "text-foreground inline-flex shrink-0 items-center rounded-full border bg-transparent font-normal whitespace-nowrap transition-all",
        SIZE_CLASSES[size],
        PRIORITY_STYLES[tag.priority],
        className,
      )}
      title={tag.description ?? tag.name}
    >
      {showIcon && (
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ color: tag.color }}
        >
          {createElement(resolveIcon(tag.icon), {
            className: ICON_SIZES[size],
          })}
        </span>
      )}
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
          className="hover:bg-muted ml-0.5 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className={size === "sm" ? "size-2" : "h-2.5 w-2.5"} />
        </button>
      )}
    </span>
  );
}
