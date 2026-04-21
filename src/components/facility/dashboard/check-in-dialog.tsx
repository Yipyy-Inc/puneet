"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Bed, GraduationCap, LogIn, PawPrint, Scissors, Sun, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import {
  getPetImage,
  type UnifiedBooking,
} from "@/hooks/use-unified-bookings";

interface CheckInDialogProps {
  booking: UnifiedBooking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { timestamp: string; noShow: boolean }) => void;
}

const BUILTIN_ICONS: Record<string, typeof Sun> = {
  daycare: Sun,
  boarding: Bed,
  grooming: Scissors,
  training: GraduationCap,
};

function toTimeInputValue(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function timeInputToIso(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

function formatScheduled(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CheckInDialog({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: CheckInDialogProps) {
  const [noShow, setNoShow] = useState(false);
  const [time, setTime] = useState(() => toTimeInputValue(null));

  const petImage = useMemo(() => getPetImage(booking.petId), [booking.petId]);
  const Icon = BUILTIN_ICONS[booking.serviceKey];

  const handleConfirm = () => {
    onConfirm({
      timestamp: noShow ? new Date().toISOString() : timeInputToIso(time),
      noShow,
    });
    onOpenChange(false);
    setNoShow(false);
    setTime(toTimeInputValue(null));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="size-4" />
            Check In
            <span className="text-muted-foreground font-normal">
              #{booking.rawId}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-3">
          {petImage ? (
            <div className="size-14 overflow-hidden rounded-2xl ring-2 ring-background">
              <Image
                src={petImage}
                alt={booking.petName}
                width={56}
                height={56}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl ring-2 ring-background">
              <PawPrint className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold leading-none">
                {booking.petName}
              </p>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  color: booking.serviceColor,
                  borderColor: `${booking.serviceColor}40`,
                  backgroundColor: `${booking.serviceColor}12`,
                }}
              >
                {Icon ? (
                  <Icon className="size-3" />
                ) : (
                  <DynamicIcon name={booking.serviceIcon} className="size-3" />
                )}
                {booking.serviceLabel}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {booking.petBreed} · {booking.ownerName}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {booking.resourceLabel ? (
                <>
                  <span className="font-medium text-foreground/80">
                    {booking.resourceLabel}
                  </span>
                  <span className="mx-1.5">·</span>
                </>
              ) : null}
              Scheduled {formatScheduled(booking.scheduledStart)}
            </p>
          </div>
        </div>

        <div className="space-y-4 py-1">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/50">
            <Checkbox
              checked={noShow}
              onCheckedChange={(v) => setNoShow(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserX className="size-3.5" />
                Mark as No-Show
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                The pet didn&apos;t arrive for this appointment.
              </p>
            </div>
          </label>

          <div
            className={cn(
              "grid gap-2 transition-opacity",
              noShow && "pointer-events-none opacity-50",
            )}
          >
            <Label htmlFor="check-in-time" className="text-sm font-medium">
              Check-in Time
            </Label>
            <TimePickerLux
              id="check-in-time"
              value={time}
              onValueChange={setTime}
              disabled={noShow}
              displayMode="dialog"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn(
              "gap-1",
              noShow
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
          >
            {noShow ? (
              <>
                <UserX className="size-3.5" />
                Mark No-Show
              </>
            ) : (
              <>
                <LogIn className="size-3.5" />
                Check In
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
