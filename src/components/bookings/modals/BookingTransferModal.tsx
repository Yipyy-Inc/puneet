"use client";

import { useState, useMemo } from "react";
import {
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowLeftRight,
  DollarSign,
  Users,
  CalendarDays,
  Bed,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Location } from "@/types/location";
import type { TransferAvailabilityCheck } from "@/types/location";
import { addTransfer } from "@/data/location-transfers";
import { hqSettings } from "@/data/locations";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: number;
  currentLocationId: string;
  service: string;
  basePrice: number;
  petName: string;
  clientName: string;
  startDate: string;
  endDate: string;
  locations: Location[];
}

type Step = "select" | "check" | "confirm" | "done";

function StepIndicator({ current, steps }: { current: Step; steps: Step[] }) {
  const labels: Record<Step, string> = {
    select: "Select",
    check: "Availability",
    confirm: "Confirm",
    done: "Done",
  };
  const activeIdx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-all",
              i < activeIdx
                ? "bg-emerald-500 text-white"
                : i === activeIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i < activeIdx ? <CheckCircle2 className="size-3.5" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-xs font-medium",
              i === activeIdx ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {labels[step]}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-6 transition-all",
                i < activeIdx ? "bg-emerald-400" : "bg-muted",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function mockCheckAvailability(
  destLocation: Location,
  service: string,
  basePrice: number,
): TransferAvailabilityCheck {
  const serviceAvailable = destLocation.services.includes(service);
  const destPricing = destLocation.pricing.find((p) => p.serviceId.includes(service));
  const destinationPrice = destPricing ? destPricing.basePrice : basePrice;
  const priceDelta = destinationPrice - basePrice;

  const occupancy = destLocation.metrics?.occupancyRate ?? 50;
  const capacityAvailable = occupancy < 92;

  return {
    serviceAvailable,
    capacityAvailable,
    staffAvailable: true,
    priceDelta,
    destinationPrice,
    originalPrice: basePrice,
    warnings: [
      ...(Math.abs(priceDelta) > 0 ? [`Price will ${priceDelta > 0 ? "increase" : "decrease"} by $${Math.abs(priceDelta).toFixed(2)}`] : []),
      ...(!capacityAvailable ? ["Location is at near-full capacity"] : []),
    ],
    blockers: [
      ...(!serviceAvailable ? [`${service} is not available at this location`] : []),
    ],
  };
}

export function BookingTransferModal({
  open,
  onOpenChange,
  bookingId,
  currentLocationId,
  service,
  basePrice,
  petName,
  clientName,
  startDate,
  endDate,
  locations,
}: Props) {
  const steps: Step[] = ["select", "check", "confirm", "done"];
  const [step, setStep] = useState<Step>("select");
  const [destId, setDestId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<TransferAvailabilityCheck | null>(null);
  const [pricingPolicy, setPricingPolicy] = useState<"keep_original" | "apply_destination">(
    hqSettings.transferPricingPolicy === "keep_original" ? "keep_original" : "apply_destination",
  );
  const [reason, setReason] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const currentLocation = locations.find((l) => l.id === currentLocationId);
  const destLocation = locations.find((l) => l.id === destId);
  const eligibleDests = locations.filter((l) => l.id !== currentLocationId && l.isActive);

  const effectivePriceDelta =
    pricingPolicy === "keep_original" ? 0 : (availability?.priceDelta ?? 0);

  const handleSelectDest = async (id: string) => {
    setDestId(id);
    setStep("check");
    setChecking(true);
    setAvailability(null);

    await new Promise((r) => setTimeout(r, 900));

    const dest = locations.find((l) => l.id === id)!;
    const check = mockCheckAvailability(dest, service, basePrice);
    setAvailability(check);
    setChecking(false);
  };

  const handleConfirm = () => {
    if (!destId || !destLocation) return;

    const transfer = {
      id: `transfer-${Date.now()}`,
      bookingId,
      fromLocationId: currentLocationId,
      toLocationId: destId,
      initiatedBy: "You",
      initiatedAt: new Date().toISOString(),
      status: (hqSettings.transferRequiresCustomerApproval
        ? "pending_approval"
        : "completed") as "pending_approval" | "completed",
      pricingPolicy,
      priceDelta: effectivePriceDelta,
      requiresCustomerApproval: hqSettings.transferRequiresCustomerApproval,
      customerNotified: notifyCustomer,
      reason: reason || undefined,
    };

    addTransfer(transfer);
    setStep("done");
  };

  const reset = () => {
    setStep("select");
    setDestId(null);
    setAvailability(null);
    setReason("");
    setNotifyCustomer(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="text-primary size-4" />
            Transfer Booking #{bookingId}
          </DialogTitle>
          <DialogDescription>
            {petName} · {clientName} · {service}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="px-1 pb-1">
          <StepIndicator current={step} steps={steps} />
        </div>

        <Separator />

        {/* ── Step: Select ── */}
        {step === "select" && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Select the destination location for this booking.
            </p>

            {/* From */}
            <div className="flex items-center gap-2.5 rounded-xl border border-dashed px-4 py-3">
              <div
                className="flex size-7 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: currentLocation?.color ?? "#94a3b8" }}
              >
                {currentLocation?.shortCode ?? "??"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{currentLocation?.name ?? "Current location"}</p>
                <p className="text-muted-foreground text-[10px]">Current location</p>
              </div>
              <Badge variant="outline" className="text-[10px]">From</Badge>
            </div>

            {/* Destinations */}
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Transfer to
            </p>
            <div className="space-y-2">
              {eligibleDests.map((loc) => {
                const serviceAvail = loc.services.includes(service);
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectDest(loc.id)}
                    disabled={!serviceAvail}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                      serviceAvail
                        ? "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
                        : "cursor-not-allowed opacity-40",
                    )}
                  >
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ backgroundColor: loc.color }}
                    >
                      {loc.shortCode}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        {loc.isPrimary && (
                          <Badge variant="secondary" className="text-[10px]">Main</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <MapPin className="size-3" />
                        {loc.city} · {loc.services.join(", ")}
                      </p>
                    </div>
                    {!serviceAvail && (
                      <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">
                        No {service}
                      </Badge>
                    )}
                    {serviceAvail && (
                      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step: Check ── */}
        {step === "check" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: currentLocation?.color }}
              >
                {currentLocation?.shortCode}
              </div>
              <ArrowRight className="text-muted-foreground size-4" />
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: destLocation?.color }}
              >
                {destLocation?.shortCode}
              </div>
              <div>
                <p className="text-sm font-medium">{destLocation?.name}</p>
                <p className="text-muted-foreground text-xs">{destLocation?.city}</p>
              </div>
            </div>

            {checking ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="text-primary size-8 animate-spin" />
                <p className="text-muted-foreground text-sm">Checking availability...</p>
                <div className="space-y-1 text-center">
                  <p className="text-muted-foreground text-xs">Verifying service availability</p>
                  <p className="text-muted-foreground text-xs">Checking capacity</p>
                  <p className="text-muted-foreground text-xs">Validating staff coverage</p>
                </div>
              </div>
            ) : availability ? (
              <div className="space-y-3">
                {/* Checks */}
                {[
                  { ok: availability.serviceAvailable, label: `${service} available`, icon: CalendarDays },
                  { ok: availability.capacityAvailable, label: "Capacity available", icon: Bed },
                  { ok: availability.staffAvailable, label: "Staff coverage", icon: Users },
                ].map(({ ok, label, icon: Icon }) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
                      ok
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
                    )}
                  >
                    {ok ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-red-500" />
                    )}
                    <Icon className={cn("size-3.5 shrink-0", ok ? "text-emerald-500" : "text-red-400")} />
                    <span className={cn("text-sm font-medium", ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                      {label}
                    </span>
                  </div>
                ))}

                {/* Warnings */}
                {availability.warnings.map((w) => (
                  <div
                    key={w}
                    className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">{w}</span>
                  </div>
                ))}

                {/* Price delta */}
                {availability.priceDelta !== 0 && (
                  <div className="rounded-xl border bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="size-4 text-gray-500" />
                      <p className="text-sm font-semibold">Pricing at Destination</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current price</span>
                        <span>${availability.originalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Destination price</span>
                        <span>${availability.destinationPrice.toFixed(2)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-semibold">
                        <span>Difference</span>
                        <span className={availability.priceDelta > 0 ? "text-amber-600" : "text-emerald-600"}>
                          {availability.priceDelta > 0 ? "+" : ""}${availability.priceDelta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Pricing policy choice */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {([
                        { value: "keep_original", label: "Keep original" },
                        { value: "apply_destination", label: "Apply new price" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPricingPolicy(opt.value)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                            pricingPolicy === opt.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "hover:border-border/80",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setStep("select"); setDestId(null); setAvailability(null); }}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={availability.blockers.length > 0}
                    onClick={() => setStep("confirm")}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Step: Confirm ── */}
        {step === "confirm" && destLocation && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
                Transfer Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <span className="font-medium">#{bookingId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pet</span>
                  <span className="font-medium">{petName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dates</span>
                  <span className="font-medium">{startDate} → {endDate}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">From</span>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full" style={{ backgroundColor: currentLocation?.color }} />
                    <span className="font-medium">{currentLocation?.name}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">To</span>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full" style={{ backgroundColor: destLocation.color }} />
                    <span className="font-medium">{destLocation.name}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    ${(basePrice + effectivePriceDelta).toFixed(2)}
                    {effectivePriceDelta !== 0 && (
                      <span className={cn("ml-1 text-xs", effectivePriceDelta > 0 ? "text-amber-600" : "text-emerald-600")}>
                        ({effectivePriceDelta > 0 ? "+" : ""}${effectivePriceDelta.toFixed(2)})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pricing policy</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {pricingPolicy === "keep_original" ? "Keep original" : "Apply destination"}
                  </Badge>
                </div>
                {hqSettings.transferRequiresCustomerApproval && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Approval</span>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                      Awaiting customer
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">Reason (optional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this booking being transferred?"
                className="min-h-[72px] text-sm resize-none"
              />
            </div>

            {/* Notify */}
            <button
              onClick={() => setNotifyCustomer(!notifyCustomer)}
              className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <Bell className={cn("size-4 shrink-0", notifyCustomer ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1">
                <p className="text-sm font-medium">Notify customer</p>
                <p className="text-muted-foreground text-xs">
                  Send an email/SMS with the new location details
                </p>
              </div>
              <div
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-all",
                  notifyCustomer ? "bg-primary" : "bg-gray-200 dark:bg-gray-700",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                    notifyCustomer ? "translate-x-4.5" : "translate-x-0.5",
                  )}
                />
              </div>
            </button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep("check")}>
                Back
              </Button>
              <Button size="sm" className="flex-1 gap-1.5" onClick={handleConfirm}>
                <ArrowLeftRight className="size-3.5" />
                Confirm Transfer
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && destLocation && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">Transfer Complete</p>
              <p className="text-muted-foreground text-sm">
                Booking #{bookingId} has been transferred to{" "}
                <strong style={{ color: destLocation.color }}>{destLocation.name}</strong>
              </p>
            </div>

            <div className="w-full rounded-xl border bg-gray-50 px-4 py-3 text-left dark:bg-gray-900/50">
              <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                What happened
              </p>
              <ul className="space-y-1.5">
                {[
                  "Booking location updated",
                  "Calendar placement moved",
                  "Tasks regenerated for new location",
                  notifyCustomer ? "Customer notification sent" : "Customer not notified (manual)",
                  hqSettings.transferRequiresCustomerApproval
                    ? "Awaiting customer approval"
                    : "Transfer finalized",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                New location: <strong>{destLocation.address}, {destLocation.city}</strong>
                <br />
                Phone: {destLocation.phone}
              </span>
            </div>

            <Button className="w-full" onClick={reset}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
