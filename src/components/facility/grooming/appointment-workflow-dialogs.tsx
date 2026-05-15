"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  XCircle,
  UserX,
  CalendarClock,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { GroomingAppointment } from "@/types/grooming";
import {
  getNoShowCount,
  incrementNoShow,
  NO_SHOW_RISK_THRESHOLD,
} from "@/lib/grooming-no-show-tracker";

// ─── Cancel ──────────────────────────────────────────────────────────────────

const CANCEL_REASONS = [
  { value: "client", label: "Client cancelled" },
  { value: "facility", label: "Facility cancelled" },
  { value: "weather", label: "Weather" },
  { value: "other", label: "Other" },
] as const;
type CancelReason = (typeof CANCEL_REASONS)[number]["value"];

const DEFAULT_CANCELLATION_FEE = 25;

export type CancelResult = {
  reason: CancelReason;
  reasonNote: string;
  fee: number;
  notifyClient: boolean;
};

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: GroomingAppointment | null;
  onConfirm: (result: CancelResult) => void;
}) {
  const [reason, setReason] = useState<CancelReason>("client");
  const [reasonNote, setReasonNote] = useState("");
  const [applyFee, setApplyFee] = useState(true);
  const [fee, setFee] = useState(DEFAULT_CANCELLATION_FEE);
  const [notifyClient, setNotifyClient] = useState(true);

  useEffect(() => {
    if (open) {
      setReason("client");
      setReasonNote("");
      setApplyFee(true);
      setFee(DEFAULT_CANCELLATION_FEE);
      setNotifyClient(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="size-4 text-destructive" />
            Cancel Appointment
          </DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs">
              <p className="font-medium">
                {appointment.petName} · {appointment.packageName}
              </p>
              <p className="text-muted-foreground">
                {appointment.ownerName} · {appointment.date} ·{" "}
                {appointment.startTime}
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {CANCEL_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                      reason === r.value
                        ? "border-destructive bg-destructive/5 text-destructive"
                        : "hover:bg-muted/40",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {reason === "other" && (
                <Textarea
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Tell us more…"
                  rows={2}
                  className="mt-1 text-sm"
                />
              )}
            </div>

            {/* Fee */}
            <div className="space-y-1.5 rounded-lg border p-3">
              <label
                htmlFor="apply-fee"
                className="flex cursor-pointer items-start gap-2"
              >
                <Checkbox
                  id="apply-fee"
                  checked={applyFee}
                  onCheckedChange={(v) => setApplyFee(!!v)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Apply cancellation fee</p>
                  <p className="text-muted-foreground text-[11px]">
                    Invoice will reflect the fee instead of the full service.
                  </p>
                </div>
              </label>
              {applyFee && (
                <div className="ml-7 flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value) || 0)}
                    className="h-8 w-24 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Notify */}
            <label
              htmlFor="notify-client"
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"
            >
              <Checkbox
                id="notify-client"
                checked={notifyClient}
                onCheckedChange={(v) => setNotifyClient(!!v)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Send client a cancellation notification
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Email + SMS using the cancellation template.
                </p>
              </div>
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Appointment
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              onConfirm({
                reason,
                reasonNote,
                fee: applyFee ? fee : 0,
                notifyClient,
              })
            }
          >
            <XCircle className="mr-1.5 size-4" />
            Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── No-Show ─────────────────────────────────────────────────────────────────

const DEFAULT_NO_SHOW_FEE = 35;

export type NoShowResult = {
  fee: number;
  notifyClient: boolean;
  newCount: number;
  flaggedAsRisk: boolean;
};

export function NoShowDialog({
  open,
  onOpenChange,
  appointment,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: GroomingAppointment | null;
  onConfirm: (result: NoShowResult) => void;
}) {
  const [applyFee, setApplyFee] = useState(true);
  const [fee, setFee] = useState(DEFAULT_NO_SHOW_FEE);
  const [notifyClient, setNotifyClient] = useState(true);

  useEffect(() => {
    if (open) {
      setApplyFee(true);
      setFee(DEFAULT_NO_SHOW_FEE);
      setNotifyClient(true);
    }
  }, [open]);

  // What the count will be AFTER we mark this one. We don't increment yet —
  // that happens on confirm so it stays cancellable.
  const previousCount = appointment ? getNoShowCount(appointment.ownerId) : 0;
  const projectedCount = previousCount + 1;
  const willFlagAsRisk =
    projectedCount >= NO_SHOW_RISK_THRESHOLD &&
    previousCount < NO_SHOW_RISK_THRESHOLD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserX className="size-4 text-destructive" />
            Mark as No-Show
          </DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs">
              <p className="font-medium">
                {appointment.petName} · {appointment.packageName}
              </p>
              <p className="text-muted-foreground">
                {appointment.ownerName} · {appointment.date} ·{" "}
                {appointment.startTime}
              </p>
              <p className="text-muted-foreground mt-1">
                Previous no-shows for this client:{" "}
                <span className="text-foreground font-medium">
                  {previousCount}
                </span>
              </p>
            </div>

            {willFlagAsRisk && (
              <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Confirming this will hit{" "}
                  <strong>{NO_SHOW_RISK_THRESHOLD}</strong> no-shows and flag
                  this client with{" "}
                  <Badge
                    variant="destructive"
                    className="ml-0.5 align-baseline"
                  >
                    No-Show Risk
                  </Badge>
                </span>
              </div>
            )}

            {/* Fee */}
            <div className="space-y-1.5 rounded-lg border p-3">
              <label
                htmlFor="ns-apply-fee"
                className="flex cursor-pointer items-start gap-2"
              >
                <Checkbox
                  id="ns-apply-fee"
                  checked={applyFee}
                  onCheckedChange={(v) => setApplyFee(!!v)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Apply no-show fee</p>
                  <p className="text-muted-foreground text-[11px]">
                    Auto-charged when the cancellation policy allows it.
                  </p>
                </div>
              </label>
              {applyFee && (
                <div className="ml-7 flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value) || 0)}
                    className="h-8 w-24 text-sm"
                  />
                </div>
              )}
            </div>

            <label
              htmlFor="ns-notify"
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"
            >
              <Checkbox
                id="ns-notify"
                checked={notifyClient}
                onCheckedChange={(v) => setNotifyClient(!!v)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Notify client of missed appointment
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Sends the no-show template (mock — toast only here).
                </p>
              </div>
            </label>
            <p className="text-muted-foreground text-[11px]">
              Slot becomes available for new bookings immediately.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!appointment) return;
              const newCount = incrementNoShow(appointment.ownerId);
              onConfirm({
                fee: applyFee ? fee : 0,
                notifyClient,
                newCount,
                flaggedAsRisk: willFlagAsRisk,
              });
            }}
          >
            <UserX className="mr-1.5 size-4" />
            Mark No-Show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reschedule ──────────────────────────────────────────────────────────────

export type RescheduleResult = {
  date: string;
  startTime: string;
  endTime: string;
  applyToSeries: boolean;
  notifyClient: boolean;
};

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
  isInSeries,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: GroomingAppointment | null;
  /** True when the booking is part of a recurring series. When false, the
   *  "apply to all future" radio is shown but disabled. */
  isInSeries?: boolean;
  onConfirm: (result: RescheduleResult) => void;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);

  useEffect(() => {
    if (open && appointment) {
      setDate(appointment.date);
      setStartTime(appointment.startTime);
      const [sh, sm] = appointment.startTime.split(":").map(Number);
      const [eh, em] = appointment.endTime.split(":").map(Number);
      setDuration(Math.max(15, eh * 60 + em - (sh * 60 + sm)));
      setApplyToSeries(false);
      setNotifyClient(true);
    }
  }, [open, appointment]);

  const endTime = addMinutes(startTime || "09:00", duration);
  const changed =
    appointment &&
    (date !== appointment.date ||
      startTime !== appointment.startTime ||
      endTime !== appointment.endTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-sky-600" />
            Reschedule Appointment
          </DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs">
              <p className="font-medium">
                {appointment.petName} · {appointment.packageName}
              </p>
              <p className="text-muted-foreground">
                Currently: {appointment.date} · {appointment.startTime}–
                {appointment.endTime}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">New Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 60)}
                className="mt-1 w-32"
              />
              <p className="text-muted-foreground mt-1 text-[11px]">
                Ends at <span className="font-mono">{endTime}</span>
              </p>
            </div>

            {/* Series radio — disabled when not part of a recurring series */}
            <div
              className={cn(
                "space-y-1.5 rounded-lg border p-3",
                !isInSeries && "opacity-60",
              )}
            >
              <Label className="text-xs">Apply to</Label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="applyTo"
                  checked={!applyToSeries}
                  onChange={() => setApplyToSeries(false)}
                />
                <span className="text-sm">This appointment only</span>
              </label>
              <label
                className={cn(
                  "flex items-center gap-2",
                  isInSeries ? "cursor-pointer" : "cursor-not-allowed",
                )}
              >
                <input
                  type="radio"
                  name="applyTo"
                  checked={applyToSeries}
                  disabled={!isInSeries}
                  onChange={() => setApplyToSeries(true)}
                />
                <span className="text-sm">
                  This and all future occurrences
                  {!isInSeries && (
                    <span className="text-muted-foreground ml-1.5 text-[10px] italic">
                      (no recurring series)
                    </span>
                  )}
                </span>
              </label>
            </div>

            <label
              htmlFor="rs-notify"
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"
            >
              <Checkbox
                id="rs-notify"
                checked={notifyClient}
                onCheckedChange={(v) => setNotifyClient(!!v)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Send client a reschedule confirmation
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Email + SMS with the new date and time.
                </p>
              </div>
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!changed || !date || !startTime}
            onClick={() =>
              onConfirm({
                date,
                startTime,
                endTime,
                applyToSeries,
                notifyClient,
              })
            }
            className="bg-sky-600 text-white hover:bg-sky-700"
          >
            <Bell className="mr-1.5 size-4" />
            Confirm Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Toast-only helper kept here for reuse by other callsites that want the
 *  same confirmation pattern without rolling their own. */
export function toastClientNotification(
  appointment: GroomingAppointment,
  kind: "cancellation" | "reschedule" | "no-show",
) {
  const labels: Record<typeof kind, string> = {
    cancellation: "Cancellation",
    reschedule: "Reschedule",
    "no-show": "No-show",
  };
  toast.success(`${labels[kind]} notification sent to ${appointment.ownerName}`, {
    description: `${appointment.ownerEmail} · ${appointment.ownerPhone}`,
  });
}
