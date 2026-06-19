"use client";

import { Info, QrCode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  CustomServiceModule,
  CustomServiceCheckInLocation,
  CustomServiceLateArrivalAction,
} from "@/types/facility";
import { cn } from "@/lib/utils";

const CHECK_IN_LOCATION_OPTIONS: {
  value: CustomServiceCheckInLocation;
  title: string;
  description: string;
}[] = [
  {
    value: "front_desk",
    title: "Front Desk",
    description: "Client checks in at the main reception desk.",
  },
  {
    value: "service_location",
    title: "At Service Location",
    description: "Check-in at the pool, grooming room, etc.",
  },
  {
    value: "curbside",
    title: "Curbside",
    description: "Client checks in from the curb or parking lot.",
  },
  {
    value: "mobile",
    title: "Mobile",
    description: "Staff goes out to the client's car.",
  },
];

const LATE_ARRIVAL_ACTIONS: {
  value: CustomServiceLateArrivalAction;
  label: string;
}[] = [
  { value: "flag", label: "Flag Only" },
  { value: "auto_cancel", label: "Auto-Cancel" },
  { value: "notify_staff", label: "Notify Staff" },
];

const DEFAULT_DEPARTURE_MESSAGE =
  "Hi {owner}, {pet} has been checked out and is ready for pickup. Thank you!";

interface CheckInOutStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function CheckInOutStep({ data, onChange }: CheckInOutStepProps) {
  const cio = data.checkInOut;

  const checkInLocation = cio.checkInLocation ?? "front_desk";
  const lateArrivalPolicy = cio.lateArrivalPolicy ?? {
    graceMinutes: 15,
    action: "flag" as CustomServiceLateArrivalAction,
  };
  const departureNotification = cio.departureNotification ?? {
    enabled: false,
    messageTemplate: DEFAULT_DEPARTURE_MESSAGE,
  };

  const updateCio = (updates: Partial<typeof cio>) => {
    onChange({ checkInOut: { ...cio, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
        <div className="space-y-0.5">
          <Label
            htmlFor="cio-enabled"
            className="cursor-pointer text-sm font-semibold"
          >
            Enable Check-In / Check-Out
          </Label>
          <p className="text-muted-foreground text-xs">
            Track when pets arrive and depart for this service.
          </p>
        </div>
        <Switch
          id="cio-enabled"
          checked={cio.enabled}
          onCheckedChange={(enabled) => updateCio({ enabled })}
        />
      </div>

      {!cio.enabled && (
        <div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Check-in/out is disabled. Staff will not be prompted to log arrival
            or departure for this service.
          </span>
        </div>
      )}

      <div
        className={cn(
          "space-y-6",
          !cio.enabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Check-In Type */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Check-In Type</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              How pets are marked as arrived.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Check-in type"
            className="flex gap-3"
          >
            {(["manual", "auto"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={cio.checkInType === type}
                onClick={() => updateCio({ checkInType: type })}
                className={cn(
                  "flex-1 rounded-lg border-2 p-3 text-left transition-colors",
                  cio.checkInType === type
                    ? "border-primary bg-primary/5 text-primary"
                    : `border-border hover:border-border/80 hover:bg-accent/30`,
                )}
              >
                <p className="text-sm font-semibold capitalize">{type}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {type === "manual"
                    ? "Staff manually marks the pet as checked in"
                    : "System auto-checks in at the scheduled start time"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Check-In Location */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Check-In Location</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Where check-in happens. This is included in the check-in
              notification sent to staff.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Check-in location"
            className="grid gap-3 sm:grid-cols-2"
          >
            {CHECK_IN_LOCATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={checkInLocation === opt.value}
                onClick={() => updateCio({ checkInLocation: opt.value })}
                className={cn(
                  "rounded-lg border-2 p-3 text-left transition-colors",
                  checkInLocation === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : `border-border hover:border-border/80 hover:bg-accent/30`,
                )}
              >
                <p className="text-sm font-semibold">{opt.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {opt.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Checkout Tracking */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="checkout-tracking"
              className="cursor-pointer text-sm font-medium"
            >
              Checkout Time Tracking
            </Label>
            <p className="text-muted-foreground text-xs">
              Log the exact time each pet departs. Useful for billing
              duration-based services.
            </p>
          </div>
          <Switch
            id="checkout-tracking"
            checked={cio.checkOutTimeTracking}
            onCheckedChange={(checkOutTimeTracking) =>
              updateCio({ checkOutTimeTracking })
            }
          />
        </div>

        {/* QR Code Support */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <QrCode className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="space-y-0.5">
              <Label
                htmlFor="qr-support"
                className="cursor-pointer text-sm font-medium"
              >
                QR Code Check-In Support
              </Label>
              <p className="text-muted-foreground text-xs">
                Generate a scannable QR code so clients can trigger check-in or
                check-out from their phone.
              </p>
            </div>
          </div>
          <Switch
            id="qr-support"
            checked={cio.qrCodeSupport}
            onCheckedChange={(qrCodeSupport) => updateCio({ qrCodeSupport })}
          />
        </div>

        {cio.qrCodeSupport && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              A <strong>unique QR code is generated per booking</strong> (not a
              single static service code). Each client scans their own code on
              arrival to check in or out.
            </span>
          </div>
        )}

        <Separator />

        {/* Late Arrival Policy */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Late Arrival Policy</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              How long after the start time before a late booking is acted on.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="grace-minutes">Grace period (minutes)</Label>
              <Input
                id="grace-minutes"
                type="number"
                min={0}
                step={5}
                value={lateArrivalPolicy.graceMinutes}
                onChange={(e) =>
                  updateCio({
                    lateArrivalPolicy: {
                      ...lateArrivalPolicy,
                      graceMinutes: parseInt(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="late-action">After grace period</Label>
              <Select
                value={lateArrivalPolicy.action}
                onValueChange={(v) =>
                  updateCio({
                    lateArrivalPolicy: {
                      ...lateArrivalPolicy,
                      action: v as CustomServiceLateArrivalAction,
                    },
                  })
                }
              >
                <SelectTrigger id="late-action" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LATE_ARRIVAL_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Departure Notification */}
        <div className="space-y-3">
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="departure-notification"
                className="cursor-pointer text-sm font-medium"
              >
                Departure Notification
              </Label>
              <p className="text-muted-foreground text-xs">
                Automatically notify the owner when their pet is checked out.
              </p>
            </div>
            <Switch
              id="departure-notification"
              checked={departureNotification.enabled}
              onCheckedChange={(enabled) =>
                updateCio({
                  departureNotification: { ...departureNotification, enabled },
                })
              }
            />
          </div>

          {departureNotification.enabled && (
            <div className="space-y-1.5">
              <Label htmlFor="departure-template">Message template</Label>
              <Textarea
                id="departure-template"
                rows={3}
                value={departureNotification.messageTemplate}
                onChange={(e) =>
                  updateCio({
                    departureNotification: {
                      ...departureNotification,
                      messageTemplate: e.target.value,
                    },
                  })
                }
                className="resize-none"
              />
              <p className="text-muted-foreground text-xs">
                Use {"{owner}"} and {"{pet}"} as placeholders — they&apos;re
                filled in when the message is sent.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
