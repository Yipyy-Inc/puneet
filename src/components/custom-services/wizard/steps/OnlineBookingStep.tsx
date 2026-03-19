"use client";

import { Globe, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

interface OnlineBookingStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function OnlineBookingStep({ data, onChange }: OnlineBookingStepProps) {
  const ob = data.onlineBooking;

  const updateOb = (updates: Partial<typeof ob>) => {
    onChange({ onlineBooking: { ...ob, ...updates } });
  };

  const updateCancellationPolicy = (
    updates: Partial<typeof ob.cancellationPolicy>,
  ) => {
    updateOb({ cancellationPolicy: { ...ob.cancellationPolicy, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <Label htmlFor="ob-enabled" className="text-sm font-semibold cursor-pointer">
              Enable Online Booking
            </Label>
            <p className="text-xs text-muted-foreground">
              Clients can discover and book this service from your public booking portal.
            </p>
          </div>
        </div>
        <Switch
          id="ob-enabled"
          checked={ob.enabled}
          onCheckedChange={(enabled) => updateOb({ enabled })}
        />
      </div>

      {!ob.enabled && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Online booking is off. This service can only be booked internally by staff.
            {data.category === "addon_only" && " Add-on services are typically booked alongside a primary service."}
          </span>
        </div>
      )}

      <div className={cn("space-y-6", !ob.enabled && "opacity-50 pointer-events-none")}>
        {/* Eligible Clients */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Client Eligibility</Label>
          <p className="text-xs text-muted-foreground">
            Who can book this service online.
          </p>
          <Select
            value={ob.eligibleClients}
            onValueChange={(v) =>
              updateOb({ eligibleClients: v as typeof ob.eligibleClients })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="approved_only">Approved Clients Only</SelectItem>
              <SelectItem value="active_members_only">Active Members Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Approval Required */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="space-y-0.5">
            <Label htmlFor="ob-approval" className="text-sm font-medium cursor-pointer">
              Require Staff Approval
            </Label>
            <p className="text-xs text-muted-foreground">
              Online bookings are held as &quot;Pending&quot; until a staff member approves them.
              Great for services with limited capacity or prerequisites.
            </p>
          </div>
          <Switch
            id="ob-approval"
            checked={ob.approvalRequired}
            onCheckedChange={(approvalRequired) => updateOb({ approvalRequired })}
          />
        </div>

        {/* Max Dogs Per Session */}
        <div className="space-y-1.5">
          <Label htmlFor="max-dogs">Max Dogs per Session</Label>
          <Input
            id="max-dogs"
            type="number"
            min={1}
            value={ob.maxDogsPerSession}
            onChange={(e) =>
              updateOb({ maxDogsPerSession: parseInt(e.target.value) || 1 })
            }
            className="w-full sm:w-36"
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of dogs a single booking can include.
          </p>
        </div>

        <Separator />

        {/* Cancellation Policy */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Cancellation Policy</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the notice period and fee for late cancellations.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-hours">Notice Period (hours)</Label>
              <Input
                id="cancel-hours"
                type="number"
                min={0}
                value={ob.cancellationPolicy.hoursBeforeBooking}
                onChange={(e) =>
                  updateCancellationPolicy({
                    hoursBeforeBooking: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Clients must cancel at least this many hours before the booking.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cancel-fee">Cancellation Fee (%)</Label>
              <Input
                id="cancel-fee"
                type="number"
                min={0}
                max={100}
                value={ob.cancellationPolicy.feePercentage}
                onChange={(e) =>
                  updateCancellationPolicy({
                    feePercentage: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                0% = free cancellation. 100% = no refund.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Deposit */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="space-y-0.5">
              <Label htmlFor="deposit-required" className="text-sm font-medium cursor-pointer">
                Require Deposit
              </Label>
              <p className="text-xs text-muted-foreground">
                Clients pay a deposit upfront to secure their booking.
              </p>
            </div>
            <Switch
              id="deposit-required"
              checked={ob.depositRequired}
              onCheckedChange={(depositRequired) => updateOb({ depositRequired })}
            />
          </div>

          {ob.depositRequired && (
            <div className="space-y-1.5">
              <Label htmlFor="deposit-amount">Deposit Amount ($)</Label>
              <Input
                id="deposit-amount"
                type="number"
                min={0}
                step={0.5}
                value={ob.depositAmount ?? ""}
                onChange={(e) =>
                  updateOb({
                    depositAmount: parseFloat(e.target.value) || undefined,
                  })
                }
                placeholder="e.g. 25.00"
                className="w-36"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
