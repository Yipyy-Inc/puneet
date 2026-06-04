"use client";

import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";

interface SaveBarProps {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  saveLabel?: string;
}

/**
 * Sticky action bar shown at the bottom of each loyalty config tab. Surfaces
 * unsaved-changes state and the Save / Discard actions; the parent page owns
 * the draft state and persistence.
 */
export function SaveBar({
  dirty,
  onSave,
  onReset,
  saveLabel = "Save changes",
}: SaveBarProps) {
  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-2 border-t px-6 py-3 backdrop-blur-sm">
      {dirty && (
        <span className="text-muted-foreground mr-auto text-sm">
          You have unsaved changes
        </span>
      )}
      <Button variant="ghost" onClick={onReset} disabled={!dirty}>
        <RotateCcw className="mr-2 size-4" />
        Discard
      </Button>
      <Button onClick={onSave} disabled={!dirty}>
        <Save className="mr-2 size-4" />
        {saveLabel}
      </Button>
    </div>
  );
}
