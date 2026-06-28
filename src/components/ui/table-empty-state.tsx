import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableEmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface TableEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: TableEmptyStateAction;
  className?: string;
}

/**
 * Consistent empty state for lists and tables: a muted icon, a one-line title,
 * an optional supporting line, and an optional primary action. Used by
 * DataTable and can be dropped into any custom list.
 */
export function TableEmptyState({
  icon: Icon,
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
      {Icon && (
        <div className="bg-muted text-muted-foreground/70 flex size-12 items-center justify-center rounded-2xl">
          <Icon className="size-6" />
        </div>
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
          className="mt-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
        >
          {action.icon && <action.icon className="size-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
