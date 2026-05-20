"use client";

import { Button } from "@/components/ui/button";

interface Props {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryDestructive?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function DrawerFooter({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryDestructive,
  secondaryLabel = "Cancel",
  onSecondary,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-2 border-t pt-4">
      {onSecondary && (
        <Button type="button" variant="ghost" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      )}
      <Button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        variant={primaryDestructive ? "destructive" : "default"}
      >
        {primaryLabel}
      </Button>
    </div>
  );
}
