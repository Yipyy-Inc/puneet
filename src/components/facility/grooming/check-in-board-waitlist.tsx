"use client";

import { BellRing, Hourglass, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GroomingWaitlistEntry } from "@/data/grooming-waitlist";

// Zone 3 — horizontal row of today's waitlisted clients (reuses the
// waitlist-panel's "Book" action shape: convert opens the booking dialog).
export function WaitlistRow({
  entries,
  onConvert,
}: {
  entries: GroomingWaitlistEntry[];
  onConvert: (entry: GroomingWaitlistEntry) => void;
}) {
  return (
    <div className="bg-card rounded-xl border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Hourglass className="size-4 text-amber-600" />
        <h3 className="text-sm font-semibold">Waitlist</h3>
        <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
          {entries.length}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground py-3 text-center text-xs">
          Nobody on the waitlist for today.
        </p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {entries.map((e) => (
            <div
              key={e.id}
              className="bg-muted/20 flex w-56 shrink-0 flex-col rounded-lg border p-2.5"
            >
              <p className="truncate text-sm font-semibold">
                {e.petName}
                <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
                  {e.petBreed}
                </span>
              </p>
              <p className="text-muted-foreground truncate text-[11px]">
                {e.ownerName}
              </p>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-[11px]">
                <Scissors className="size-2.5" />
                {e.serviceName}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 gap-1.5 text-xs"
                onClick={() => onConvert(e)}
              >
                <BellRing className="size-3.5" />
                Convert to Booking
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
