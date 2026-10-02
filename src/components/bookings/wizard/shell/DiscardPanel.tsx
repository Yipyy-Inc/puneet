"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

// ============================================================================
// "Discard this booking?" — in the wizard's own footer, not a second dialog on
// top of it (§5i: never stack two modals). It names what is lost and whether
// that can be undone (§5j); "Continue editing" is the safe default and takes
// focus, the destructive verb sits to its right.
// ============================================================================

export function DiscardPanel({
  title,
  help,
  keepLabel,
  discardLabel,
  onKeep,
  onDiscard,
}: {
  title: string;
  help: string;
  keepLabel: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
  }, []);
  return (
    <footer
      role="alertdialog"
      aria-labelledby="wizard-discard-title"
      aria-describedby="wizard-discard-help"
      className="border-line bg-background flex flex-col gap-3 border-t px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:px-6 sm:py-3.5 lg:px-8 lg:py-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <AlertTriangle
          className="text-warning mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p
            id="wizard-discard-title"
            className="text-body-strong text-body-ink"
          >
            {title}
          </p>
          <p id="wizard-discard-help" className="text-meta text-ink-secondary">
            {help}
          </p>
        </div>
      </div>
      <div className="flex gap-2 max-sm:*:flex-1">
        <Button ref={keep} type="button" variant="outline" onClick={onKeep}>
          {keepLabel}
        </Button>
        <Button type="button" variant="destructive" onClick={onDiscard}>
          {discardLabel}
        </Button>
      </div>
    </footer>
  );
}
