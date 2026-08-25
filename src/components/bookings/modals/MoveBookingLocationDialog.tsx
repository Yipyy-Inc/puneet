"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocationContext } from "@/hooks/use-location-context";
import { useMoveBookingLocation } from "@/lib/api/booking-status";

// ============================================================================
// Move a booking to another branch.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `BookingTransferModal` -- a 4-step wizard (select, availability check,
// confirm, done) with pricing-policy and customer-approval fields, writing to
// `location-transfers.ts`, a module-level array that reset on every reload.
// None of that had anywhere real to live: no per-location availability model,
// no transfer-pricing concept, no approval workflow anywhere in Postgres.
//
// What's real and small: `bookings.location_id` is a real column, and moving
// it now writes for real and records itself in the audit trail
// (20260825150000). If the richer workflow is wanted later, it is a real,
// separate feature -- not something to fake here to look finished.
// ============================================================================

export function MoveBookingLocationDialog({
  open,
  onOpenChange,
  bookingId,
  currentLocationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: number;
  currentLocationId: string | null | undefined;
}) {
  const { locations } = useLocationContext();
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const move = useMoveBookingLocation();

  const selected = locationId ?? currentLocationId ?? undefined;
  const destination = locations.find((l) => l.id === selected);
  const currentName =
    locations.find((l) => l.id === currentLocationId)?.name ?? "No branch";

  const save = () => {
    if (!selected) return;
    move.mutate(
      { id: bookingId, locationId: selected },
      {
        onSuccess: () => {
          toast.success(
            `Moved to ${destination?.name ?? "the selected branch"}`,
          );
          onOpenChange(false);
          setLocationId(undefined);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to another location</DialogTitle>
          <DialogDescription>
            Currently at {currentName}. This changes which branch the booking
            belongs to.
          </DialogDescription>
        </DialogHeader>

        <Select value={selected} onValueChange={setLocationId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a branch" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !selected || selected === currentLocationId || move.isPending
            }
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={save}
          >
            {move.isPending ? "Moving…" : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
