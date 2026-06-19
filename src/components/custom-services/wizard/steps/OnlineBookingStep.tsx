"use client";

import { Globe, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  CustomServiceBookingDocument,
} from "@/types/facility";
import { facilitySpeciesConfig } from "@/data/settings";
import { cn } from "@/lib/utils";

const REQUIRED_DOCUMENT_OPTIONS: {
  value: CustomServiceBookingDocument;
  label: string;
}[] = [
  { value: "vaccination_records", label: "Vaccination Records" },
  { value: "vet_reference", label: "Vet Reference" },
  { value: "signed_waiver", label: "Signed Waiver" },
  { value: "temperament_assessment", label: "Temperament Assessment Pass" },
];

interface OnlineBookingStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function OnlineBookingStep({ data, onChange }: OnlineBookingStepProps) {
  const ob = data.onlineBooking;

  const petNoun = facilitySpeciesConfig.petNounPlural;
  const waitlist = ob.waitlist ?? { enabled: false, autoConfirm: false };
  const requiredDocuments = ob.requiredDocuments ?? [];
  const depositRefundPolicy = ob.depositRefundPolicy ?? {
    refundable: true,
    refundableUpToHours: 24,
  };

  const updateOb = (updates: Partial<typeof ob>) => {
    onChange({ onlineBooking: { ...ob, ...updates } });
  };

  const updateCancellationPolicy = (
    updates: Partial<typeof ob.cancellationPolicy>,
  ) => {
    updateOb({ cancellationPolicy: { ...ob.cancellationPolicy, ...updates } });
  };

  const toggleDocument = (doc: CustomServiceBookingDocument) => {
    updateOb({
      requiredDocuments: requiredDocuments.includes(doc)
        ? requiredDocuments.filter((d) => d !== doc)
        : [...requiredDocuments, doc],
    });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Globe className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div className="space-y-0.5">
            <Label
              htmlFor="ob-enabled"
              className="cursor-pointer text-sm font-semibold"
            >
              Enable Online Booking
            </Label>
            <p className="text-muted-foreground text-xs">
              Clients can discover and book this service from your public
              booking portal.
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
        <div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Online booking is off. This service can only be booked internally by
            staff.
            {data.category === "addon_only" &&
              " Add-on services are typically booked alongside a primary service."}
          </span>
        </div>
      )}

      <div
        className={cn(
          "space-y-6",
          !ob.enabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Eligible Clients */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Client Eligibility</Label>
          <p className="text-muted-foreground text-xs">
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
              <SelectItem value="approved_only">
                Approved Clients Only
              </SelectItem>
              <SelectItem value="active_members_only">
                Active Members Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Approval Required */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="ob-approval"
              className="cursor-pointer text-sm font-medium"
            >
              Require Staff Approval
            </Label>
            <p className="text-muted-foreground text-xs">
              Online bookings are held as &quot;Pending&quot; until a staff
              member approves them. Great for services with limited capacity or
              prerequisites.
            </p>
          </div>
          <Switch
            id="ob-approval"
            checked={ob.approvalRequired}
            onCheckedChange={(approvalRequired) =>
              updateOb({ approvalRequired })
            }
          />
        </div>

        {/* Max Pets Per Booking — species noun from facility config */}
        <div className="space-y-1.5">
          <Label htmlFor="max-pets">Max Pets per Booking</Label>
          <Input
            id="max-pets"
            type="number"
            min={1}
            value={ob.maxDogsPerSession}
            onChange={(e) =>
              updateOb({ maxDogsPerSession: parseInt(e.target.value) || 1 })
            }
            className="w-full sm:w-36"
          />
          <p className="text-muted-foreground text-xs">
            Maximum number of {petNoun} a single booking can include.
          </p>
        </div>

        <Separator />

        {/* Waitlist */}
        <div className="space-y-3">
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="waitlist-enabled"
                className="cursor-pointer text-sm font-medium"
              >
                Waitlist
              </Label>
              <p className="text-muted-foreground text-xs">
                When a session is full, allow clients to join a waitlist.
              </p>
            </div>
            <Switch
              id="waitlist-enabled"
              checked={waitlist.enabled}
              onCheckedChange={(enabled) =>
                updateOb({ waitlist: { ...waitlist, enabled } })
              }
            />
          </div>

          {waitlist.enabled && (
            <div className="space-y-3 pl-1">
              <div className="space-y-1.5">
                <Label htmlFor="waitlist-size">Max waitlist size</Label>
                <Input
                  id="waitlist-size"
                  type="number"
                  min={1}
                  value={waitlist.maxSize ?? ""}
                  onChange={(e) =>
                    updateOb({
                      waitlist: {
                        ...waitlist,
                        maxSize: parseInt(e.target.value) || undefined,
                      },
                    })
                  }
                  placeholder="e.g. 5"
                  className="w-full sm:w-36"
                />
              </div>
              <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
                <Label
                  htmlFor="waitlist-auto"
                  className="cursor-pointer text-sm font-medium"
                >
                  Auto-confirm from waitlist when a spot opens
                </Label>
                <Switch
                  id="waitlist-auto"
                  checked={waitlist.autoConfirm}
                  onCheckedChange={(autoConfirm) =>
                    updateOb({ waitlist: { ...waitlist, autoConfirm } })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Required Pre-Booking Documents */}
        <div className="space-y-2">
          <div>
            <Label className="text-sm font-semibold">
              Required Pre-Booking Documents
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Documents that must be on file before a client can complete an
              online booking. Leave all unchecked for none.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {REQUIRED_DOCUMENT_OPTIONS.map((doc) => {
              const checked = requiredDocuments.includes(doc.value);
              return (
                <label
                  key={doc.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/30",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleDocument(doc.value)}
                  />
                  <span className="text-sm font-medium">{doc.label}</span>
                </label>
              );
            })}
          </div>
          {requiredDocuments.length === 0 && (
            <p className="text-muted-foreground text-xs italic">
              None — no documents required to book.
            </p>
          )}
        </div>

        <Separator />

        {/* Booking Confirmation Message */}
        <div className="space-y-1.5">
          <Label
            htmlFor="confirmation-message"
            className="text-sm font-semibold"
          >
            Booking Confirmation Message
          </Label>
          <Textarea
            id="confirmation-message"
            rows={3}
            value={ob.confirmationMessage ?? ""}
            onChange={(e) => updateOb({ confirmationMessage: e.target.value })}
            placeholder="e.g. Thank you for booking a pool session! Please bring your dog's vaccination records on the day."
            className="resize-none"
          />
          <p className="text-muted-foreground text-xs">
            Shown to the client immediately after they complete a booking for
            this service.
          </p>
        </div>

        <Separator />

        {/* Cancellation Policy */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Cancellation Policy</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
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
              <p className="text-muted-foreground text-xs">
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
              <p className="text-muted-foreground text-xs">
                0% = free cancellation. 100% = no refund.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Deposit */}
        <div className="space-y-3">
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="deposit-required"
                className="cursor-pointer text-sm font-medium"
              >
                Require Deposit
              </Label>
              <p className="text-muted-foreground text-xs">
                Clients pay a deposit upfront to secure their booking.
              </p>
            </div>
            <Switch
              id="deposit-required"
              checked={ob.depositRequired}
              onCheckedChange={(depositRequired) =>
                updateOb({ depositRequired })
              }
            />
          </div>

          {ob.depositRequired && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    (ob.depositType ?? "fixed") === "fixed"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => updateOb({ depositType: "fixed" })}
                >
                  $ Fixed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    ob.depositType === "percentage" ? "default" : "outline"
                  }
                  onClick={() => updateOb({ depositType: "percentage" })}
                >
                  % Percentage
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deposit-amount">
                  {ob.depositType === "percentage"
                    ? "Deposit Percentage (%)"
                    : "Deposit Amount ($)"}
                </Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  min={0}
                  max={ob.depositType === "percentage" ? 100 : undefined}
                  step={ob.depositType === "percentage" ? 1 : 0.5}
                  value={ob.depositAmount ?? ""}
                  onChange={(e) =>
                    updateOb({
                      depositAmount: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder={
                    ob.depositType === "percentage" ? "e.g. 25" : "e.g. 25.00"
                  }
                  className="w-36"
                />
                <p className="text-muted-foreground text-xs">
                  {ob.depositType === "percentage"
                    ? "Percentage of the booking total"
                    : "Fixed dollar amount"}
                </p>
              </div>

              {/* Refund policy */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Deposit Refund Policy
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      depositRefundPolicy.refundable ? "default" : "outline"
                    }
                    onClick={() =>
                      updateOb({
                        depositRefundPolicy: {
                          ...depositRefundPolicy,
                          refundable: true,
                        },
                      })
                    }
                  >
                    Refundable
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      !depositRefundPolicy.refundable ? "default" : "outline"
                    }
                    onClick={() =>
                      updateOb({
                        depositRefundPolicy: {
                          ...depositRefundPolicy,
                          refundable: false,
                        },
                      })
                    }
                  >
                    Non-refundable
                  </Button>
                </div>
                {depositRefundPolicy.refundable && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      Fully refundable up to
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={depositRefundPolicy.refundableUpToHours ?? ""}
                      onChange={(e) =>
                        updateOb({
                          depositRefundPolicy: {
                            ...depositRefundPolicy,
                            refundableUpToHours:
                              parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                      placeholder="24"
                      className="w-20"
                    />
                    <span className="text-muted-foreground text-xs">
                      hours before the booking
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
