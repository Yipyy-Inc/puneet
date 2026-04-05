"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Clock,
  AlertTriangle,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";
import type {
  MultiPetDiscountRule,
  LatePickupFee,
  Exceed24HourFee,
  CustomFee,
  DiscountStackingMode,
} from "@/types/boarding";

// ── Helpers ──────────────────────────────────────────────────────────

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Props ────────────────────────────────────────────────────────────

interface PricingRulesPanelProps {
  serviceType: "boarding" | "daycare";
}

// ── Main component ───────────────────────────────────────────────────

export function PricingRulesPanel({ serviceType }: PricingRulesPanelProps) {
  const rules = facilityConfig.pricingRules;

  // State for each rule type
  const [multiPet, setMultiPet] = useState<MultiPetDiscountRule[]>(
    (rules?.multiPetDiscounts ?? []) as MultiPetDiscountRule[],
  );
  const [timeFees, setTimeFees] = useState<LatePickupFee[]>(
    (rules?.latePickupFees ?? []) as LatePickupFee[],
  );
  const [exceed24h, setExceed24h] = useState<Exceed24HourFee>(
    (rules?.exceed24Hour ?? {
      id: "exceed-24h",
      name: "24-Hour Overflow",
      enabled: false,
      amount: 25,
      scope: "per_pet",
    }) as Exceed24HourFee,
  );
  const [customFees, setCustomFees] = useState<CustomFee[]>(
    (rules?.customFees ?? []) as CustomFee[],
  );
  const [stacking, setStacking] = useState<DiscountStackingMode>(
    (rules?.discountStacking as DiscountStackingMode) ?? "best_only",
  );

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBase, setPreviewBase] = useState(50);
  const [previewPets, setPreviewPets] = useState(2);
  const [previewNights, setPreviewNights] = useState(3);

  // Modal state
  const [mpModal, setMpModal] = useState(false);
  const [editingMp, setEditingMp] = useState<MultiPetDiscountRule | null>(null);
  const [tfModal, setTfModal] = useState(false);
  const [editingTf, setEditingTf] = useState<LatePickupFee | null>(null);
  const [cfModal, setCfModal] = useState(false);
  const [editingCf, setEditingCf] = useState<CustomFee | null>(null);
  const [e24Modal, setE24Modal] = useState(false);

  // Filter rules by service
  const filteredMultiPet = multiPet.filter((r) =>
    r.applicableServices.includes(serviceType),
  );
  const filteredTimeFees = timeFees.filter(
    (r) =>
      !r.applicableServices?.length ||
      r.applicableServices.includes(serviceType),
  );
  const filteredCustomFees = customFees.filter((r) =>
    r.applicableServices.includes(serviceType),
  );

  return (
    <div className="space-y-4">
      {/* ── Discount Stacking ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Settings2 className="size-4" />
              Discount Stacking
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              Preview
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            When multiple discount rules apply to a booking, how should they
            combine?
          </p>
          <div className="space-y-2">
            {(
              [
                {
                  value: "best_only" as const,
                  label: "Only apply the best discount",
                  desc: "Automatically selects the most beneficial discount",
                },
                {
                  value: "apply_all_sequence" as const,
                  label: "Apply all rules in sequence",
                  desc: "Stack multiple discounts when conditions are met",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStacking(opt.value)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  stacking === opt.value
                    ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                    : "hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-muted-foreground text-xs">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Preview calculator */}
          {previewOpen && (
            <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">
                Discount Preview
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Base rate ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={previewBase}
                    onChange={(e) =>
                      setPreviewBase(parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Pets</Label>
                  <Input
                    type="number"
                    min={1}
                    value={previewPets}
                    onChange={(e) =>
                      setPreviewPets(parseInt(e.target.value) || 1)
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Nights</Label>
                  <Input
                    type="number"
                    min={1}
                    value={previewNights}
                    onChange={(e) =>
                      setPreviewNights(parseInt(e.target.value) || 1)
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {(() => {
                const activeMultiPet = filteredMultiPet.filter(
                  (r) => r.isActive,
                );
                const discounts: { name: string; amount: number }[] = [];
                for (const rule of activeMultiPet) {
                  const matchingTier = [...rule.tiers]
                    .sort((a, b) => b.petCount - a.petCount)
                    .find((t) => previewPets >= t.petCount);
                  if (matchingTier) {
                    const count =
                      rule.discountType === "per_pet"
                        ? previewPets
                        : Math.max(0, previewPets - 1);
                    discounts.push({
                      name: rule.name,
                      amount:
                        matchingTier.discountAmount * count * previewNights,
                    });
                  }
                }
                const subtotal = previewBase * previewPets * previewNights;
                let total: number;
                let appliedDiscounts: typeof discounts;
                if (stacking === "best_only" && discounts.length > 1) {
                  const best = discounts.reduce((a, b) =>
                    b.amount > a.amount ? b : a,
                  );
                  appliedDiscounts = [best];
                  total = subtotal - best.amount;
                } else {
                  appliedDiscounts = discounts;
                  total =
                    subtotal - discounts.reduce((s, d) => s + d.amount, 0);
                }
                return (
                  <div className="space-y-1 border-t pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {appliedDiscounts.map((d, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-emerald-700"
                      >
                        <span>{d.name}</span>
                        <span>-${d.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {discounts.length > 0 &&
                      stacking === "best_only" &&
                      discounts.length > 1 && (
                        <p className="text-[10px] text-amber-600">
                          {discounts.length - 1} other discount
                          {discounts.length > 2 ? "s" : ""} skipped (best only)
                        </p>
                      )}
                    <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                      <span>Total</span>
                      <span>${Math.max(0, total).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Multi-Pet Discounts ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Users className="size-4" />
              Multi-Pet Discounts
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setEditingMp(null);
                setMpModal(true);
              }}
            >
              <Plus className="size-3" />
              Add Rule
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredMultiPet.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No multi-pet discount rules for {serviceType}
            </p>
          ) : (
            filteredMultiPet.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {rule.discountType === "per_pet"
                        ? "Per pet"
                        : "Additional pet"}
                    </Badge>
                    {rule.sameLodging && (
                      <Badge variant="outline" className="text-[10px]">
                        Same lodging
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {rule.tiers
                      .map((t) => `${t.petCount}+ pets: -$${t.discountAmount}`)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(c) =>
                      setMultiPet((prev) =>
                        prev.map((r) =>
                          r.id === rule.id ? { ...r, isActive: c } : r,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setEditingMp(rule);
                      setMpModal(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-7"
                    onClick={() => {
                      setMultiPet((prev) =>
                        prev.filter((r) => r.id !== rule.id),
                      );
                      toast.success(`"${rule.name}" deleted`);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Late Pickup / Early Drop-off ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Clock className="size-4" />
              Late Pickup / Early Drop-off Fees
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setEditingTf(null);
                setTfModal(true);
              }}
            >
              <Plus className="size-3" />
              Add Fee
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTimeFees.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No time-based fees configured
            </p>
          ) : (
            filteredTimeFees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {fee.name ||
                        (fee.condition === "late_pickup"
                          ? "Late Pickup"
                          : "Early Drop-off")}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {fee.condition === "late_pickup"
                        ? "Late pickup"
                        : "Early drop-off"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      ${fee.amount}
                      {fee.feeType === "per_minute"
                        ? "/min"
                        : fee.feeType === "per_30min"
                          ? "/30 min"
                          : fee.feeType === "per_hour"
                            ? "/hr"
                            : " flat"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {fee.scope === "per_pet" ? "Per pet" : "Per booking"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {fee.graceMinutes} min grace · Based on{" "}
                    {fee.basedOn === "business_hours"
                      ? "business hours"
                      : `custom time (${fee.customTime})`}
                    {fee.maxFee ? ` · Max $${fee.maxFee}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={fee.enabled}
                    onCheckedChange={(c) =>
                      setTimeFees((prev) =>
                        prev.map((f) =>
                          f.id === fee.id ? { ...f, enabled: c } : f,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setEditingTf(fee);
                      setTfModal(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-7"
                    onClick={() => {
                      setTimeFees((prev) =>
                        prev.filter((f) => f.id !== fee.id),
                      );
                      toast.success("Fee deleted");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Exceed 24-Hour Fee (boarding only) ── */}
      {serviceType === "boarding" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Exceed 24-Hour Fee
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={exceed24h.enabled}
                  onCheckedChange={(c) =>
                    setExceed24h((prev) => ({ ...prev, enabled: c }))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setE24Modal(true)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          {exceed24h.enabled && (
            <CardContent className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">${exceed24h.amount}</span>{" "}
                <span className="text-muted-foreground">
                  {exceed24h.scope === "per_pet" ? "per pet" : "per booking"}
                </span>
              </p>
              {exceed24h.description && (
                <p className="text-muted-foreground text-xs">
                  {exceed24h.description}
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Custom Fees ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Custom Fees
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setEditingCf(null);
                setCfModal(true);
              }}
            >
              <Plus className="size-3" />
              Add Fee
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredCustomFees.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No custom fees configured
            </p>
          ) : (
            filteredCustomFees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{fee.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {fee.feeType === "flat"
                        ? `$${fee.amount}`
                        : `${fee.amount}%`}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {fee.scope === "per_pet" ? "Per pet" : "Per booking"}
                    </Badge>
                    {fee.autoApply !== "none" && (
                      <Badge className="bg-blue-100 text-[10px] text-blue-700">
                        {fee.autoApply === "at_checkout"
                          ? "Auto at checkout"
                          : "Auto by care type"}
                      </Badge>
                    )}
                  </div>
                  {fee.description && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {fee.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={fee.isActive}
                    onCheckedChange={(c) =>
                      setCustomFees((prev) =>
                        prev.map((f) =>
                          f.id === fee.id ? { ...f, isActive: c } : f,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setEditingCf(fee);
                      setCfModal(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-7"
                    onClick={() => {
                      setCustomFees((prev) =>
                        prev.filter((f) => f.id !== fee.id),
                      );
                      toast.success(`"${fee.name}" deleted`);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ═══ MODALS ═══ */}

      {/* Multi-Pet Discount Modal */}
      <MultiPetModal
        open={mpModal}
        onOpenChange={setMpModal}
        editing={editingMp}
        serviceType={serviceType}
        onSave={(rule) => {
          if (editingMp) {
            setMultiPet((prev) =>
              prev.map((r) => (r.id === editingMp.id ? rule : r)),
            );
          } else {
            setMultiPet((prev) => [...prev, rule]);
          }
          setMpModal(false);
          toast.success(editingMp ? "Rule updated" : "Rule created");
        }}
      />

      {/* Time Fee Modal (Late Pickup / Early Drop-off) */}
      <TimeFeeModal
        open={tfModal}
        onOpenChange={setTfModal}
        editing={editingTf}
        serviceType={serviceType}
        onSave={(fee) => {
          if (editingTf) {
            setTimeFees((prev) =>
              prev.map((f) => (f.id === editingTf.id ? fee : f)),
            );
          } else {
            setTimeFees((prev) => [...prev, fee]);
          }
          setTfModal(false);
          toast.success(editingTf ? "Fee updated" : "Fee created");
        }}
      />

      {/* Exceed 24h Modal */}
      <Dialog open={e24Modal} onOpenChange={setE24Modal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exceed 24-Hour Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fee Name</Label>
              <Input
                value={exceed24h.name ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. 24-Hour Overflow"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={exceed24h.amount}
                  onChange={(e) =>
                    setExceed24h((prev) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={exceed24h.scope}
                  onValueChange={(v) =>
                    setExceed24h((prev) => ({
                      ...prev,
                      scope: v as "per_booking" | "per_pet",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_pet">Per pet</SelectItem>
                    <SelectItem value="per_booking">Per booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={exceed24h.taxRate ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({
                    ...prev,
                    taxRate: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="Uses facility default"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={exceed24h.description ?? ""}
                onChange={(e) =>
                  setExceed24h((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setE24Modal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setE24Modal(false);
                toast.success("Saved");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Fee Modal */}
      <CustomFeeModal
        open={cfModal}
        onOpenChange={setCfModal}
        editing={editingCf}
        serviceType={serviceType}
        onSave={(fee) => {
          if (editingCf) {
            setCustomFees((prev) =>
              prev.map((f) => (f.id === editingCf.id ? fee : f)),
            );
          } else {
            setCustomFees((prev) => [...prev, fee]);
          }
          setCfModal(false);
          toast.success(editingCf ? "Fee updated" : "Fee created");
        }}
      />
    </div>
  );
}

// ── Multi-Pet Discount Modal ─────────────────────────────────────────

function MultiPetModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MultiPetDiscountRule | null;
  serviceType: string;
  onSave: (rule: MultiPetDiscountRule) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    discountType: "additional_pet" as "per_pet" | "additional_pet",
    sameLodging: false,
    tiers: [{ petCount: 2, discountAmount: 5 }],
    isActive: true,
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        discountType: editing.discountType,
        sameLodging: editing.sameLodging,
        tiers: editing.tiers.map((t) => ({ ...t })),
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: "",
        discountType: "additional_pet",
        sameLodging: false,
        tiers: [{ petCount: 2, discountAmount: 5 }],
        isActive: true,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Multi-Pet Discount" : "Add Multi-Pet Discount"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Multi-Pet Boarding Discount"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Discount applies to</Label>
              <Select
                value={form.discountType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    discountType: v as "per_pet" | "additional_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="additional_pet">
                    Additional pet only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={form.sameLodging}
                  onCheckedChange={(c) =>
                    setForm((p) => ({ ...p, sameLodging: c === true }))
                  }
                />
                <span className="text-sm">Same lodging required</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Discount Tiers</Label>
            <div className="space-y-2">
              {form.tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2}
                    value={tier.petCount}
                    onChange={(e) => {
                      const next = [...form.tiers];
                      next[i] = {
                        ...tier,
                        petCount: parseInt(e.target.value) || 2,
                      };
                      setForm((p) => ({ ...p, tiers: next }));
                    }}
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">
                    + pets → $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={tier.discountAmount}
                    onChange={(e) => {
                      const next = [...form.tiers];
                      next[i] = {
                        ...tier,
                        discountAmount: parseFloat(e.target.value) || 0,
                      };
                      setForm((p) => ({ ...p, tiers: next }));
                    }}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">off</span>
                  {form.tiers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          tiers: p.tiers.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    tiers: [
                      ...p.tiers,
                      {
                        petCount: (p.tiers.at(-1)?.petCount ?? 1) + 1,
                        discountAmount: 0,
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-3" />
                Add tier
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSave({
                id: editing?.id ?? makeId("mpd"),
                name: form.name,
                applicableServices: [serviceType],
                isActive: form.isActive,
                discountType: form.discountType,
                sameLodging: form.sameLodging,
                tiers: form.tiers,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Time Fee Modal (Late Pickup / Early Drop-off) ────────────────────

function TimeFeeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LatePickupFee | null;
  serviceType: string;
  onSave: (fee: LatePickupFee) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    condition: "late_pickup" as "late_pickup" | "early_dropoff",
    graceMinutes: 15,
    feeType: "per_30min" as "flat" | "per_hour" | "per_30min" | "per_minute",
    amount: 10,
    maxFee: undefined as number | undefined,
    scope: "per_pet" as "per_booking" | "per_pet",
    basedOn: "business_hours" as "business_hours" | "custom_time",
    customTime: "",
    taxRate: undefined as number | undefined,
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name ?? "",
        condition: editing.condition,
        graceMinutes: editing.graceMinutes,
        feeType: editing.feeType,
        amount: editing.amount,
        maxFee: editing.maxFee,
        scope: editing.scope,
        basedOn: editing.basedOn,
        customTime: editing.customTime ?? "",
        taxRate: editing.taxRate,
      });
    } else {
      setForm({
        name: "",
        condition: "late_pickup",
        graceMinutes: 15,
        feeType: "per_30min",
        amount: 10,
        maxFee: undefined,
        scope: "per_pet",
        basedOn: "business_hours",
        customTime: "",
        taxRate: undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Time Fee" : "Add Time Fee"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fee Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Late Pickup Fee"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    condition: v as "late_pickup" | "early_dropoff",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late_pickup">Late pickup</SelectItem>
                  <SelectItem value="early_dropoff">Early drop-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    scope: v as "per_booking" | "per_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="per_booking">Per booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Grace (min)</Label>
              <Input
                type="number"
                min={0}
                value={form.graceMinutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    graceMinutes: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Fee Type</Label>
              <Select
                value={form.feeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    feeType: v as "flat" | "per_hour" | "per_30min",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="per_minute">Per minute</SelectItem>
                  <SelectItem value="per_30min">Per 30 min</SelectItem>
                  <SelectItem value="per_hour">Per hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Max Fee ($)</Label>
              <Input
                type="number"
                min={0}
                value={form.maxFee ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    maxFee: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="No cap"
              />
            </div>
            <div className="space-y-2">
              <Label>Based On</Label>
              <Select
                value={form.basedOn}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    basedOn: v as "business_hours" | "custom_time",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_hours">Business hours</SelectItem>
                  <SelectItem value="custom_time">Custom time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.basedOn === "custom_time" && (
            <div className="space-y-2">
              <Label>Custom Time</Label>
              <Input
                type="time"
                value={form.customTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customTime: e.target.value }))
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.taxRate ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  taxRate: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="Uses facility default"
            />
          </div>
          <p className="text-muted-foreground rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
            By default, only the rule matching the latest time applies per
            checkout. Multiple rules do not stack unless enabled at the facility
            level.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: editing?.id ?? makeId("tf"),
                name: form.name || undefined,
                enabled: true,
                condition: form.condition,
                graceMinutes: form.graceMinutes,
                feeType: form.feeType,
                amount: form.amount,
                maxFee: form.maxFee,
                scope: form.scope,
                basedOn: form.basedOn,
                customTime:
                  form.basedOn === "custom_time" ? form.customTime : undefined,
                taxRate: form.taxRate,
                applicableServices: [serviceType],
              })
            }
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Custom Fee Modal ─────────────────────────────────────────────────

function CustomFeeModal({
  open,
  onOpenChange,
  editing,
  serviceType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CustomFee | null;
  serviceType: string;
  onSave: (fee: CustomFee) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: 0,
    feeType: "flat" as "flat" | "percentage",
    taxRate: undefined as number | undefined,
    scope: "per_pet" as "per_booking" | "per_pet",
    autoApply: "none" as "none" | "at_checkout" | "by_care_type",
    autoApplyCareTypes: [] as string[],
  });

  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description ?? "",
        amount: editing.amount,
        feeType: editing.feeType,
        taxRate: editing.taxRate,
        scope: editing.scope,
        autoApply: editing.autoApply,
        autoApplyCareTypes: editing.autoApplyCareTypes ?? [],
      });
    } else {
      setForm({
        name: "",
        description: "",
        amount: 0,
        feeType: "flat",
        taxRate: undefined,
        scope: "per_pet",
        autoApply: "none",
        autoApplyCareTypes: [],
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Custom Fee" : "Add Custom Fee"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fee Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Medication Administration"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="When does this fee apply?"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.feeType}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    feeType: v as "flat" | "percentage",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat ($)</SelectItem>
                  <SelectItem value="percentage">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    scope: v as "per_booking" | "per_pet",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_pet">Per pet</SelectItem>
                  <SelectItem value="per_booking">Per booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.taxRate ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  taxRate: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="Uses facility default"
            />
          </div>
          <div className="space-y-2">
            <Label>Auto-Apply</Label>
            <div className="space-y-1.5">
              {(
                [
                  {
                    value: "none",
                    label: "Manual only",
                    desc: "Staff adds fee manually at checkout",
                  },
                  {
                    value: "at_checkout",
                    label: "Auto-apply at checkout",
                    desc: "Fee added automatically when appointment is checked out",
                  },
                  {
                    value: "by_care_type",
                    label: "Auto-apply by care type",
                    desc: "Auto-apply when booking matches specific service types",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, autoApply: opt.value }))
                  }
                  className={`w-full rounded-lg border p-2.5 text-left transition-all ${
                    form.autoApply === opt.value
                      ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="text-xs font-medium">{opt.label}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
            {form.autoApply === "by_care_type" && (
              <div className="space-y-1.5 rounded-lg border p-3">
                <Label className="text-xs">Apply to care types</Label>
                <div className="flex flex-wrap gap-2">
                  {["boarding", "daycare", "grooming"].map((ct) => (
                    <label key={ct} className="flex items-center gap-1.5">
                      <Checkbox
                        checked={form.autoApplyCareTypes.includes(ct)}
                        onCheckedChange={(c) =>
                          setForm((p) => ({
                            ...p,
                            autoApplyCareTypes: c
                              ? [...p.autoApplyCareTypes, ct]
                              : p.autoApplyCareTypes.filter((t) => t !== ct),
                          }))
                        }
                      />
                      <span className="text-xs capitalize">{ct}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-muted-foreground rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
            Each fee can only be added once per appointment. Fees are excluded
            from staff commission calculations but included when applying
            discounts.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onSave({
                id: editing?.id ?? makeId("cf"),
                name: form.name,
                description: form.description || undefined,
                amount: form.amount,
                feeType: form.feeType,
                taxRate: form.taxRate,
                scope: form.scope,
                autoApply: form.autoApply,
                autoApplyCareTypes:
                  form.autoApply === "by_care_type"
                    ? form.autoApplyCareTypes
                    : undefined,
                applicableServices: editing?.applicableServices ?? [
                  serviceType,
                ],
                isActive: editing?.isActive ?? true,
              });
            }}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
