"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PhysicalCardBatch } from "@/types/payments";

const STATUS_STYLES: Record<string, string> = {
  inactive: "border-amber-300 text-amber-600",
  active: "border-green-300 text-green-600",
  sold: "border-blue-300 text-blue-600",
  voided: "border-red-300 text-red-600",
};

interface BatchCardsModalProps {
  batch: PhysicalCardBatch | null;
  /** Display name (may be a session-renamed override). */
  name?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchCardsModal({
  batch,
  name,
  open,
  onOpenChange,
}: BatchCardsModalProps) {
  if (!batch) return null;

  const available = batch.cards.filter((c) => c.status === "inactive").length;
  const sold = batch.cards.filter(
    (c) => c.status === "sold" || c.status === "active",
  ).length;
  const denominationLabel =
    batch.denomination != null
      ? `Fixed: $${batch.denomination.toFixed(2)}`
      : "Open (any value)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{name ?? batch.name} — Cards</DialogTitle>
          <DialogDescription>
            {batch.cards.length} cards · {sold} sold · {available} available ·{" "}
            {denominationLabel}
            {batch.denomination != null &&
              ` · $${(batch.totalCards * batch.denomination).toLocaleString()} potential value`}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
          {batch.cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="truncate font-mono text-xs">
                {card.cardNumber}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-xs capitalize",
                  STATUS_STYLES[card.status],
                )}
              >
                {card.status}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
