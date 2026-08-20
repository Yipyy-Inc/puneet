"use client";

import { FileEdit, Send, Undo2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * ── "SAVE DRAFT" IS GONE, AND ITS ABSENCE IS THE FIX ──────────────────────
 *
 * It called a handler whose entire body was `toast.success("Draft saved")`.
 * That was honest enough while the whole rota lived in component state and
 * nothing could be saved at all; now a shift is written to `staff_shifts` with
 * `status = 'draft'` the moment it is added, so there is nothing left for the
 * button to do. A button that reports success for doing nothing is worse than
 * no button, because it teaches people to press it.
 */
interface DraftPublishBarProps {
  draftCount: number;
  hasChanges: boolean;
  onPublish: () => void;
  onDiscard: () => void;
}

export function DraftPublishBar({
  draftCount,
  hasChanges,
  onPublish,
  onDiscard,
}: DraftPublishBarProps) {
  const { can } = useCurrentUser();
  if (!can("schedule.publish")) return null;
  if (draftCount === 0 && !hasChanges) return null;

  return (
    <div className="border-t bg-amber-50/60 dark:bg-amber-950/15">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <FileEdit className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Unpublished Changes</p>
            <p className="text-muted-foreground text-xs">
              {draftCount} draft shift{draftCount !== 1 ? "s" : ""} waiting to
              be published
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-2 border-amber-300 bg-amber-100/50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            <AlertTriangle className="mr-1 size-3" />
            Not visible to staff
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            className="text-muted-foreground hover:text-destructive"
          >
            <Undo2 className="mr-1.5 size-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={onPublish}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Send className="mr-1.5 size-3.5" />
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
