"use client";

import { Button } from "@/components/ui/button";
import { Sun } from "lucide-react";

interface Props {
  onOpen: () => void;
  priorClosingTotal?: number;
  currencySymbol: string;
}

export function NoSessionPanel({ onOpen, priorClosingTotal, currencySymbol }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-10 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Sun className="size-6" />
      </div>
      <h3 className="text-lg font-semibold">Register hasn&apos;t been opened today</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Before taking the first cash sale, count the drawer and record the
        opening float. Once opened, every cash payment routes into today&apos;s
        session automatically.
      </p>
      {priorClosingTotal !== undefined && (
        <p className="mt-3 text-xs text-muted-foreground">
          Yesterday closed at{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {currencySymbol}
            {priorClosingTotal.toFixed(2)}
          </span>
        </p>
      )}
      <Button size="lg" className="mt-5" onClick={onOpen}>
        <Sun className="mr-2 size-4" />
        Open Today&apos;s Register
      </Button>
    </div>
  );
}
