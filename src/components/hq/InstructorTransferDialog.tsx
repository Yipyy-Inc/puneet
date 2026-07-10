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
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { locationStyles } from "@/lib/hq/location-styles";
import type { Location } from "@/types/location";
import type { Trainer } from "@/types/training";

export interface InstructorTransfer {
  id: string;
  instructorId: string;
  instructorName: string;
  fromLocationId: string;
  toLocationId: string;
  effectiveDate: string;
  reason?: string;
  createdAt: string;
}

interface Props {
  trainers: Trainer[];
  locations: Location[];
  /** instructorId → their busiest teaching location (pre-fills "from"). */
  homeByInstructor: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  onCreate: (transfer: InstructorTransfer) => void;
}

/**
 * Reassign an instructor from one location to another for a shift — e.g. when
 * one branch is overbooked and another has availability. Creates a transfer
 * record the parent tracks.
 */
export function InstructorTransferDialog({
  trainers,
  locations,
  homeByInstructor,
  onOpenChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(true);
  const [instructorId, setInstructorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const activeTrainers = trainers.filter((t) => t.status === "active");
  const instructor = trainers.find((t) => t.id === instructorId);
  const fromLoc = locations.find((l) => l.id === from);
  const toLoc = locations.find((l) => l.id === to);
  const valid =
    instructorId !== "" &&
    from !== "" &&
    to !== "" &&
    from !== to &&
    date !== "";

  function pickInstructor(id: string) {
    setInstructorId(id);
    setFrom(homeByInstructor[id] ?? "");
  }

  function close(next: boolean) {
    setOpen(next);
    if (!next) onOpenChange(false);
  }

  function create() {
    if (!valid || !instructor) return;
    onCreate({
      id: `instr-transfer-${Date.now()}`,
      instructorId,
      instructorName: instructor.name,
      fromLocationId: from,
      toLocationId: to,
      effectiveDate: date,
      reason: reason.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5" />
            Instructor transfer
          </DialogTitle>
          <DialogDescription>
            Reassign an instructor to another location — e.g. cover an
            overbooked branch from one with availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Instructor *</Label>
            <Select value={instructorId} onValueChange={pickInstructor}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an instructor" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {activeTrainers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
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
            <Label className="text-xs font-semibold">Effective date *</Label>
            <DatePicker
              value={date}
              onValueChange={(v) => setDate(v)}
              placeholder="Select date"
              className="h-9 w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Plateau overbooked — NDG has availability"
            />
          </div>

          {valid && (
            <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs">
              <strong>{instructor?.name}</strong>
              {fromLoc && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white",
                    locationStyles(fromLoc).bg,
                  )}
                >
                  {fromLoc.shortCode}
                </span>
              )}
              <ArrowRight className="text-muted-foreground size-3.5" />
              {toLoc && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white",
                    locationStyles(toLoc).bg,
                  )}
                >
                  {toLoc.shortCode}
                </span>
              )}
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
