"use client";

import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ModuleToggleItem } from "./flags-utils";

export function ModuleToggleList({
  items,
  onToggle,
}: {
  items: ModuleToggleItem[];
  onToggle: (moduleId: string, enabled: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((m) => (
        <div
          key={m.moduleId}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3 transition-colors",
            m.enabled ? "border-primary/30 bg-primary/5" : "bg-muted/40",
          )}
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              m.enabled ? "bg-primary/10" : "bg-muted",
            )}
          >
            <Package
              className={cn(
                "size-4.5",
                m.enabled ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-medium">{m.name}</h4>
              <Badge
                variant="outline"
                className={cn(
                  "px-1.5 py-0 text-[10px] font-normal",
                  m.tierIncluded
                    ? "border-emerald-300/60 text-emerald-700 dark:text-emerald-300"
                    : "border-violet-300/60 text-violet-700 dark:text-violet-300",
                )}
              >
                {m.tierIncluded ? "Tier default" : "Add-on"}
              </Badge>
              {m.override && (
                <Badge
                  variant="outline"
                  className="border-amber-400/60 px-1.5 py-0 text-[10px] font-normal text-amber-700 dark:text-amber-300"
                >
                  Override
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs capitalize">
              {m.category}
            </p>
          </div>
          <Switch
            checked={m.enabled}
            onCheckedChange={(v) => onToggle(m.moduleId, v)}
            aria-label={`Toggle ${m.name}`}
          />
        </div>
      ))}
    </div>
  );
}
