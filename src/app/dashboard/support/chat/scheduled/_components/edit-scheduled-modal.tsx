"use client";

import { useState } from "react";
import { CalendarClock, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { updateScheduled } from "@/lib/scheduled-support-store";
import type {
  ScheduledChannel,
  ScheduledSupportMessage,
} from "@/types/scheduled-support-message";
import { FacilityAvatar } from "../../_components/facility-avatar";
import { CHANNEL_META, isoToParts, partsToIso } from "./scheduled-utils";

interface EditScheduledModalProps {
  message: ScheduledSupportMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditScheduledModal({
  message,
  open,
  onOpenChange,
}: EditScheduledModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {message && (
          // Keyed by id so opening a different message remounts the form with
          // fresh initial values (no derive-state-from-props effect needed).
          <EditForm
            key={message.id}
            message={message}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  message,
  onClose,
}: {
  message: ScheduledSupportMessage;
  onClose: () => void;
}) {
  const initial = isoToParts(message.scheduledFor);
  const [body, setBody] = useState(message.body);
  const [channel, setChannel] = useState<ScheduledChannel>(message.channel);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  const canSave = body.trim().length > 0 && !!date && !!time;

  function handleSave() {
    if (!canSave) return;
    updateScheduled(message.id, {
      body: body.trim(),
      channel,
      scheduledFor: partsToIso(date, time),
    });
    toast.success("Scheduled message updated");
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit scheduled message</DialogTitle>
        <DialogDescription>
          Update the content, channel, or send time before it goes out.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-muted/40 flex items-center gap-3 rounded-lg border p-3">
          <FacilityAvatar
            name={message.facilityName}
            id={message.facilityId}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {message.facilityName}
            </p>
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <User className="size-3" />
              Created by {message.createdBy}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sched-channel">Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => setChannel(v as ScheduledChannel)}
            >
              <SelectTrigger id="sched-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["chat", "email"] as const).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Send date</Label>
            <DatePicker
              value={date}
              onValueChange={(v) => setDate(v)}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Send time</Label>
          <TimePickerLux value={time} onValueChange={(v) => setTime(v)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sched-body">Message</Label>
          <Textarea
            id="sched-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Write the message…"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <CalendarClock className="size-4" />
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}
