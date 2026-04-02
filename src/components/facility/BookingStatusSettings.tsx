"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Zap, Palette, Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import { useFacilityRole } from "@/hooks/use-facility-role";

// ── Types ────────────────────────────────────────────────────────────────────

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface AutoTransitions {
  onDepositPaid: string;
  onCheckIn: string;
  onCheckout: string;
  onPaymentComplete: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_STATUSES = [
  { id: "estimate_sent", label: "Estimate Sent", color: "violet" },
  { id: "pending", label: "Pending", color: "amber" },
  { id: "confirmed", label: "Confirmed", color: "emerald" },
  { id: "checked_in", label: "Checked In", color: "teal" },
  { id: "in_progress", label: "In Progress", color: "orange" },
  { id: "ready", label: "Ready", color: "purple" },
  { id: "completed", label: "Completed", color: "slate" },
  { id: "no_show", label: "No-Show", color: "red" },
  { id: "cancelled", label: "Cancelled", color: "red" },
  { id: "declined", label: "Declined", color: "red" },
];

const COLOR_OPTIONS = [
  { value: "red", label: "Red", dot: "bg-red-500" },
  { value: "orange", label: "Orange", dot: "bg-orange-500" },
  { value: "amber", label: "Amber", dot: "bg-amber-500" },
  { value: "yellow", label: "Yellow", dot: "bg-yellow-500" },
  { value: "emerald", label: "Green", dot: "bg-emerald-500" },
  { value: "teal", label: "Teal", dot: "bg-teal-500" },
  { value: "blue", label: "Blue", dot: "bg-blue-500" },
  { value: "violet", label: "Violet", dot: "bg-violet-500" },
  { value: "purple", label: "Purple", dot: "bg-purple-500" },
  { value: "pink", label: "Pink", dot: "bg-pink-500" },
  { value: "slate", label: "Gray", dot: "bg-slate-500" },
];

const ALL_STATUS_OPTIONS = [
  ...SYSTEM_STATUSES.map((s) => ({ value: s.id, label: s.label })),
];

const defaultFacility = facilities.find((f) => f.id === 11);
const defaultConfig = defaultFacility?.bookingStatusConfig;

let _customId = 600;

// ── Component ────────────────────────────────────────────────────────────────

export function BookingStatusSettings() {
  const { role } = useFacilityRole();

  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>(
    (defaultConfig?.customStatuses as CustomStatus[]) ?? [],
  );
  const [autoTransitions, setAutoTransitions] = useState<AutoTransitions>(
    (defaultConfig?.autoTransitions as AutoTransitions) ?? {
      onDepositPaid: "confirmed",
      onCheckIn: "checked_in",
      onCheckout: "completed",
      onPaymentComplete: "confirmed",
    },
  );

  const handleAddCustom = () => {
    _customId += 1;
    setCustomStatuses((prev) => [
      ...prev,
      {
        id: `custom_${_customId}`,
        name: "",
        color: "blue",
        position: prev.length + 3,
      },
    ]);
  };

  const handleRemoveCustom = (id: string) => {
    setCustomStatuses((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateCustom = (id: string, updates: Partial<CustomStatus>) => {
    setCustomStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const handleSave = () => {
    // Validate custom statuses have names
    const empty = customStatuses.find((s) => !s.name.trim());
    if (empty) {
      toast.error("All custom statuses must have a name");
      return;
    }

    if (defaultFacility) {
      (defaultFacility as Record<string, unknown>).bookingStatusConfig = {
        customStatuses,
        autoTransitions,
      };
    }
    toast.success("Booking status settings saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Booking status settings are only accessible to facility owners and
            managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Booking Statuses</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure the booking workflow statuses and automatic transitions.
          System statuses cannot be removed.
        </p>
      </div>

      {/* System Statuses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lock className="size-4" />
            System Statuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-xs">
            These are built-in and cannot be removed. They form the core booking
            lifecycle.
          </p>
          <div className="flex flex-wrap gap-2">
            {SYSTEM_STATUSES.map((s) => {
              const colorOpt = COLOR_OPTIONS.find((c) => c.value === s.color);
              return (
                <div
                  key={s.id}
                  className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1.5"
                >
                  <div
                    className={cn(
                      "size-2 rounded-full",
                      colorOpt?.dot ?? "bg-muted-foreground",
                    )}
                  />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Statuses */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="size-4" />
              Custom Statuses
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAddCustom}
            >
              <Plus className="size-3.5" />
              Add Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {customStatuses.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No custom statuses. Click &quot;Add Status&quot; to create one.
            </p>
          ) : (
            customStatuses.map((status) => (
              <div
                key={status.id}
                className="grid grid-cols-12 items-end gap-3 rounded-xl border p-3"
              >
                <div className="col-span-4">
                  <Label className="text-[11px]">Name</Label>
                  <Input
                    value={status.name}
                    onChange={(e) =>
                      handleUpdateCustom(status.id, { name: e.target.value })
                    }
                    placeholder="e.g. On Hold"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-[11px]">Color</Label>
                  <Select
                    value={status.color}
                    onValueChange={(v) =>
                      handleUpdateCustom(status.id, { color: v })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2.5 rounded-full",
                            COLOR_OPTIONS.find((c) => c.value === status.color)
                              ?.dot ?? "bg-muted-foreground",
                          )}
                        />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn("size-2.5 rounded-full", c.dot)}
                            />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-[11px]">Position (after)</Label>
                  <Select
                    value={String(status.position)}
                    onValueChange={(v) =>
                      handleUpdateCustom(status.id, {
                        position: parseInt(v, 10),
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_STATUSES.map((s, idx) => (
                        <SelectItem key={s.id} value={String(idx)}>
                          After {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                    onClick={() => handleRemoveCustom(status.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Auto-Transition Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="size-4" />
            Auto-Transition Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            Automatically change booking status when these actions happen. Staff
            can still override manually.
          </p>

          <div className="space-y-3">
            <TransitionRule
              label="When deposit is paid"
              value={autoTransitions.onDepositPaid}
              onChange={(v) =>
                setAutoTransitions((p) => ({ ...p, onDepositPaid: v }))
              }
              options={ALL_STATUS_OPTIONS}
            />
            <Separator />
            <TransitionRule
              label="When full payment is received"
              value={autoTransitions.onPaymentComplete}
              onChange={(v) =>
                setAutoTransitions((p) => ({ ...p, onPaymentComplete: v }))
              }
              options={ALL_STATUS_OPTIONS}
            />
            <Separator />
            <TransitionRule
              label="When pet is checked in"
              value={autoTransitions.onCheckIn}
              onChange={(v) =>
                setAutoTransitions((p) => ({ ...p, onCheckIn: v }))
              }
              options={ALL_STATUS_OPTIONS}
            />
            <Separator />
            <TransitionRule
              label="When checkout completes"
              value={autoTransitions.onCheckout}
              onChange={(v) =>
                setAutoTransitions((p) => ({ ...p, onCheckout: v }))
              }
              options={ALL_STATUS_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Status Settings
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TransitionRule({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Zap className="text-muted-foreground size-3.5" />
        <span className="text-sm">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No auto-transition</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              → {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
