"use client";

import { Info, QrCode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomServiceModule } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CheckInOutStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function CheckInOutStep({ data, onChange }: CheckInOutStepProps) {
  const cio = data.checkInOut;

  const updateCio = (updates: Partial<typeof cio>) => {
    onChange({ checkInOut: { ...cio, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="space-y-0.5">
          <Label htmlFor="cio-enabled" className="text-sm font-semibold cursor-pointer">
            Enable Check-In / Check-Out
          </Label>
          <p className="text-xs text-muted-foreground">
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
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Check-in/out is disabled. Staff will not be prompted to log arrival or
            departure for this service.
          </span>
        </div>
      )}

      <div className={cn("space-y-6", !cio.enabled && "opacity-50 pointer-events-none")}>
        {/* Check-In Type */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Check-In Type</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              How pets are marked as arrived.
            </p>
          </div>
          <div role="radiogroup" aria-label="Check-in type" className="flex gap-3">
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
                    : "border-border hover:border-border/80 hover:bg-accent/30",
                )}
              >
                <p className="text-sm font-semibold capitalize">{type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {type === "manual"
                    ? "Staff manually marks the pet as checked in"
                    : "System auto-checks in at the scheduled start time"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Checkout Tracking */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="space-y-0.5">
            <Label htmlFor="checkout-tracking" className="text-sm font-medium cursor-pointer">
              Checkout Time Tracking
            </Label>
            <p className="text-xs text-muted-foreground">
              Log the exact time each pet departs. Useful for billing duration-based services.
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
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <QrCode className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <Label htmlFor="qr-support" className="text-sm font-medium cursor-pointer">
                QR Code Check-In Support
              </Label>
              <p className="text-xs text-muted-foreground">
                Generate a scannable QR code for this service. Clients can scan to trigger
                check-in or check-out from their phone.
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
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-400">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              A QR code will be generated when this service module is activated.
              Print and post it at the check-in station.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
