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
  sm: "text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 gap-0.5 h-4 md:h-5",
  md: "text-[10px] md:text-xs px-1.5 md:px-2 py-0 md:py-0.5 gap-0.5 md:gap-1 h-5 md:h-6",
  lg: "text-xs md:text-sm px-2 md:px-2.5 py-0.5 md:py-1 gap-1 md:gap-1.5 h-6 md:h-7",
} as const;

const ICON_SIZES = {
  sm: "h-2 w-2 md:h-2.5 md:w-2.5",
  md: "size-2.5 md:size-3",
  lg: "size-3 md:size-3.5",
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
        "inline-flex shrink-0 items-center rounded-full border-0 font-medium whitespace-nowrap",
        SIZE_CLASSES[size],
        tag.priority === "critical" &&
          "animate-[tag-pulse_2s_ease-in-out_infinite]",
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
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className={size === "sm" ? "size-2" : "h-2.5 w-2.5"} />
        </button>
      )}
    </span>
  );
}
