"use client";

import { useState } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookingTransfer, Location } from "@/types/location";
import { bookings } from "@/data/bookings";
import { deriveLocationId } from "@/data/locations";

const SERVICE_LABEL: Record<string, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
};

type PricingPolicy = BookingTransfer["pricingPolicy"];

interface Props {
  locations: Location[];
  onOpenChange: (open: boolean) => void;
  onCreate: (transfer: BookingTransfer) => void;
}

/**
 * Owner-initiated booking transfer: pick a booking, choose the origin and
 * destination locations and a pricing policy, then create a BookingTransfer
 * record (no staff request needed).
 */
export function InitiateTransferDialog({
  locations,
  onOpenChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(true);
  const [bookingId, setBookingId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [policy, setPolicy] = useState<PricingPolicy>("keep_original");
  const [reason, setReason] = useState("");

  function pickBooking(idStr: string) {
    setBookingId(idStr);
    // A booking's current location is derived; pre-fill "from", keep it editable.
    const b = bookings.find((x) => String(x.id) === idStr);
    if (b) setFrom(deriveLocationId(b.id));
  }

  const valid = bookingId !== "" && from !== "" && to !== "" && from !== to;
  const fromLoc = locations.find((l) => l.id === from);
  const toLoc = locations.find((l) => l.id === to);

  function close(next: boolean) {
    setOpen(next);
    if (!next) onOpenChange(false);
  }

  function create() {
    if (!valid) return;
    onCreate({
      id: `transfer-new-${Date.now()}`,
      bookingId: Number(bookingId),
      fromLocationId: from,
      toLocationId: to,
      initiatedBy: "HQ Admin",
      initiatedAt: new Date().toISOString(),
      status: "approved",
      pricingPolicy: policy,
      priceDelta: 0,
      requiresCustomerApproval: false,
      customerNotified: true,
      reason: reason.trim() || undefined,
    });
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5" />
            Initiate transfer
          </DialogTitle>
          <DialogDescription>
            Move a booking from one location to another. This creates an
            approved transfer, ready to finalize.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Booking *</Label>
            <Select value={bookingId} onValueChange={pickBooking}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a booking" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    #{b.id} · {SERVICE_LABEL[b.service] ?? b.service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">From *</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="text-muted-foreground mb-2.5 size-4" />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">To *</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== from)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Pricing policy</Label>
            <Select
              value={policy}
              onValueChange={(v) => setPolicy(v as PricingPolicy)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_original">
                  Keep original price
                </SelectItem>
                <SelectItem value="apply_destination">
                  Apply destination price
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[11px]">
              {policy === "keep_original"
                ? "The customer keeps the price from the original location."
                : `The customer is charged ${toLoc?.name ?? "the destination"}'s price.`}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Capacity at origin, closer to client…"
            />
          </div>

          {valid && (
            <div className="bg-muted/40 flex items-center gap-2 rounded-lg px-3 py-2 text-xs">
              Booking <strong>#{bookingId}</strong> ·{" "}
              <span className="font-medium">{fromLoc?.name}</span>
              <ArrowRight className="text-muted-foreground size-3.5" />
              <span className="font-medium">{toLoc?.name}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={!valid}>
            Create transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
