"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/types/smart-insights";
import { INSIGHT_CATEGORY_LABELS } from "@/types/smart-insights";

interface Props {
  dismissed: Insight[];
  onRestore: (insight: Insight) => void;
}

function formatRelative(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DismissedInsightsView({ dismissed, onRestore }: Props) {
  const [open, setOpen] = useState(false);

  if (dismissed.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        Show dismissed ({dismissed.length})
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {dismissed.map((insight) => (
            <li
              key={insight.insightId}
              className="bg-muted/30 flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {INSIGHT_CATEGORY_LABELS[insight.category]}
                  </Badge>
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Dismissed {formatRelative(insight.dismissedAt)}
                  {insight.dismissedBy ? ` by ${insight.dismissedBy}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => onRestore(insight)}
              >
                <RotateCcw className="size-3.5" />
                Re-activate
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
