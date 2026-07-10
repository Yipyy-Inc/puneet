"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import { locationStyles } from "@/lib/hq/location-styles";
import type { Location } from "@/types/location";

export interface DispatchPayload {
  toLocationId: string;
  date: string;
  start: string;
  end: string;
}

interface Props {
  member: { name: string; primaryLocation: string };
  locations: Location[];
  onOpenChange: (open: boolean) => void;
  onSend: (payload: DispatchPayload) => void;
}

/**
 * Temporarily dispatch a staff member to another location for a specific
 * date + shift. On confirm the parent creates a transfer record and adds the
 * shift to the member's schedule.
 */
export function SendToLocationDialog({
  member,
  locations,
  onOpenChange,
  onSend,
}: Props) {
  const [open, setOpen] = useState(true);
  // Default to a location that isn't the member's home, if there is one.
  const [toLocationId, setToLocationId] = useState(
    () =>
      locations.find((l) => l.id !== member.primaryLocation)?.id ??
      locations[0]?.id ??
      "",
  );
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  function close(next: boolean) {
    setOpen(next);
    if (!next) onOpenChange(false);
  }

  const valid = toLocationId !== "" && date !== "" && start < end;

  function send() {
    if (!valid) return;
    onSend({ toLocationId, date, start, end });
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4" />
            Send {member.name} to a location
          </DialogTitle>
          <DialogDescription>
            Temporarily dispatch this staff member to another location for a
            single shift. It appears on the Schedule tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Destination</Label>
            <Select value={toLocationId} onValueChange={setToLocationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => {
                  const s = locationStyles(loc);
                  return (
                    <SelectItem key={loc.id} value={loc.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn("size-2.5 rounded-sm", s.bg)}
                          aria-hidden
                        />
                        {loc.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>
            <DatePicker
              value={date}
              onValueChange={(v) => setDate(v)}
              placeholder="Select date"
              className="h-9 w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Start</Label>
              <TimePickerLux value={start} onValueChange={setStart} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">End</Label>
              <TimePickerLux value={end} onValueChange={setEnd} />
            </div>
          </div>
          {start >= end && (
            <p className="text-xs text-red-600 dark:text-red-400">
              End time must be after the start time.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!valid}>
            Send to location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
