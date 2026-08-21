"use client";

import { Button } from "@/components/ui/button";
import { Save, RotateCcw } from "lucide-react";

interface SaveBarProps {
  dirty: boolean;
  /**
   * May be async. It writes to Postgres now rather than to localStorage, and
   * the bar has to stay disabled until that lands — otherwise a second click
   * queues a second write of the same draft.
   */
  onSave: () => void | Promise<void>;
  onReset: () => void;
  saveLabel?: string;
  /** True while the write is in flight. */
  saving?: boolean;
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
  saving = false,
}: SaveBarProps) {
  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-2 border-t px-6 py-3 backdrop-blur-sm">
      {dirty && (
        <span className="text-muted-foreground mr-auto text-sm">
          You have unsaved changes
        </span>
      )}
      <Button variant="ghost" onClick={onReset} disabled={!dirty || saving}>
        <RotateCcw className="mr-2 size-4" />
        Discard
      </Button>
      <Button onClick={() => void onSave()} disabled={!dirty || saving}>
        <Save className="mr-2 size-4" />
        {saving ? "Saving…" : saveLabel}
      </Button>
    </div>
  );
}
