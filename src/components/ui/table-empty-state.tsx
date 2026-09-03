import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { YipyyPose, type YipyyPoseProps } from "@/components/ui/yipyy-pose";
import { cn } from "@/lib/utils";

export interface TableEmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface TableEmptyStateProps {
  icon?: LucideIcon;
  /**
   * Which of Yipyy's poses belongs on this surface (§5d2 assigns one to every
   * module and every state — look it up there rather than choosing).
   *
   * When set, he replaces the 48px icon circle. When absent the circle stays,
   * which is what keeps every existing call site rendering exactly as before.
   */
  pose?: YipyyPoseProps["name"];
  title: string;
  description?: string;
  action?: TableEmptyStateAction;
  className?: string;
}

/**
 * Consistent empty state for lists and tables: Yipyy or a muted icon, a
 * one-line title, an optional supporting line, and an optional primary action.
 * Used by DataTable and can be dropped into any custom list.
 *
 * §5d: a first-run empty gets him at 132 with a headline and exactly one
 * primary action; a filtered empty gets `searching` at the same size, which
 * DataTable passes in on its own.
 */
export function TableEmptyState({
  icon: Icon,
  pose,
  title,
  description,
  action,
  className,
}: TableEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      {/* He needs 96px of clear vertical room (§5d1's physical floor) — the
          py-14 above plus the 132px slot clears it. The icon circle is the
          fallback for a call site that has not been given a pose yet, never a
          thing shown beside him. */}
      {pose ? (
        <YipyyPose name={pose} size={132} float />
      ) : (
        Icon && (
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
            <Icon className="size-6" />
          </div>
        )
      )}
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-sm text-xs">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          type="button"
          size="sm"
          onClick={action.onClick}
          // Was `bg-emerald-600 hover:bg-emerald-700` — an off-palette green
          // hardcoded on the one button ~80 empty states share, and named in
          // the handoff's own list of defects. It now takes the primary fill
          // it should always have had, a full pill (§1 shape), and §4's lift
          // via the one class that owns that declaration.
          className="yy-cta mt-1 gap-1.5 rounded-full"
        >
          {action.icon && <action.icon className="size-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
