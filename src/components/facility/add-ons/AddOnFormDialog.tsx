"use client";

import { useState } from "react";
import type { ServiceAddOn, AddOnCategory, AddOnSchedulingType, AddOnPricingType } from "@/types/facility";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AddOnPetFilter } from "@/components/facility/add-ons/AddOnPetFilter";
import {
  Hash, Clock, Repeat, Scissors, UserCheck, UserX,
  CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { RateColorPicker } from "@/components/facility/RateColorPicker";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRICING_LABELS: Record<AddOnPricingType, string> = {
  flat: "Flat Fee", per_day: "Per Day", per_session: "Per Session", per_hour: "Per Hour",
};

const SCHEDULING_OPTIONS: { value: AddOnSchedulingType; label: string; desc: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "quantity",       label: "Quantity-based",     desc: "Client picks how many (no time slot needed)", Icon: Hash },
  { value: "time_slot",      label: "Scheduled",          desc: "Staff books a specific time slot",            Icon: Clock },
  { value: "per_stay_night", label: "Per Night of Stay",  desc: "Auto-applies once per night of boarding",     Icon: Repeat },
  { value: "grooming_linked",label: "Grooming-linked",    desc: "Occurs alongside a grooming session",         Icon: Scissors },
];

const SIZE_KEYS = ["small", "medium", "large", "giant"] as const;
type SizeKey = typeof SIZE_KEYS[number];
const SIZE_LABELS: Record<SizeKey, string> = { small: "Small", medium: "Medium", large: "Large", giant: "Giant" };

// ── Form state ─────────────────────────────────────────────────────────────────

export type AddOnFormValues = Omit<ServiceAddOn, "id" | "sortOrder" | "createdAt" | "updatedAt">;

function blank(): AddOnFormValues {
  return {
    name: "", description: "", image: "", category: "", colorCode: "#3b82f6",
    pricingType: "flat", price: 0, unitLabel: "", maxQuantity: undefined,
    duration: undefined, taxRate: undefined, taxable: true,
    applicableServices: [], locationIds: [],
    requiresStaff: false, schedulingType: "quantity", requiresScheduling: false,
    generatesTask: true, taskCategory: "", isDefault: false,
    petTypeFilter: undefined, sizePricing: undefined, isActive: true,
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editing: ServiceAddOn | null;
  categories: AddOnCategory[];
  allServices: { id: string; name: string }[];
  onClose: () => void;
  onSave: (values: AddOnFormValues) => void;
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children, collapsible = false }: {
  title: string; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className={cn("w-full flex items-center justify-between px-4 py-3 text-left bg-muted/30 border-b",
          collapsible && "hover:bg-muted/50 transition-colors cursor-pointer",
        )}
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {collapsible && (open
          ? <ChevronUp className="size-3.5 text-muted-foreground" />
          : <ChevronDown className="size-3.5 text-muted-foreground" />)}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────────

export function AddOnFormDialog({ open, editing, categories, allServices, onClose, onSave }: Props) {
  const [form, setForm] = useState<AddOnFormValues>(() =>
    editing
      ? { name: editing.name, description: editing.description, image: editing.image ?? "",
          category: editing.category ?? "", colorCode: editing.colorCode ?? "#3b82f6",
          pricingType: editing.pricingType, price: editing.price, unitLabel: editing.unitLabel ?? "",
          maxQuantity: editing.maxQuantity, duration: editing.duration, taxRate: editing.taxRate,
          taxable: editing.taxable ?? true, applicableServices: [...editing.applicableServices],
          locationIds: [...(editing.locationIds ?? [])],
          requiresStaff: editing.requiresStaff ?? false,
          schedulingType: editing.schedulingType ?? "quantity",
          requiresScheduling: editing.requiresScheduling, generatesTask: editing.generatesTask,
          taskCategory: editing.taskCategory ?? "", isDefault: editing.isDefault ?? false,
          petTypeFilter: editing.petTypeFilter, sizePricing: editing.sizePricing, isActive: editing.isActive }
      : blank(),
  );
  const [sizePricingOn, setSizePricingOn] = useState(
    !!editing?.sizePricing?.length,
  );
  const [sizeRows, setSizeRows] = useState<Array<{ size: SizeKey; priceModifier: number; modifierType: "flat" | "percentage" }>>(
    editing?.sizePricing?.map((r) => ({ ...r, size: r.size as SizeKey })) ?? SIZE_KEYS.map((s) => ({ size: s, priceModifier: 0, modifierType: "flat" })),
  );

  function f<K extends keyof AddOnFormValues>(key: K, val: AddOnFormValues[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  function toggleService(id: string) {
    f("applicableServices",
      form.applicableServices.includes(id)
        ? form.applicableServices.filter((s) => s !== id)
        : [...form.applicableServices, id],
    );
  }

  function handleSave() {
    onSave({
      ...form,
      image: form.image || undefined,
      category: form.category || undefined,
      sizePricing: sizePricingOn ? sizeRows : undefined,
      requiresScheduling: form.schedulingType === "time_slot" || form.schedulingType === "grooming_linked",
    } as AddOnFormValues);
  }

  const isValid = !!form.name.trim() && !!form.description.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editing ? "Edit Add-On" : "Create Add-On"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure how this add-on appears in the booking flow and who it applies to.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh]">
          <div className="px-6 py-5 space-y-4">

            {/* ── Basic Info ── */}
            <Section title="Basic Information">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={(e) => f("name", e.target.value)}
                  placeholder="e.g. Daily Video Call" autoFocus />
              </div>
              {/* Color */}
              <RateColorPicker
                value={form.colorCode ?? "#3b82f6"}
                onChange={(hex) => f("colorCode", hex)}
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description <span className="text-destructive">*</span></Label>
                <Textarea value={form.description} onChange={(e) => f("description", e.target.value)}
                  placeholder="What does this add-on include?" rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={form.category ?? ""} onValueChange={(v) => f("category", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ backgroundColor: c.colorCode ?? "#64748b" }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Image URL</Label>
                  <Input value={form.image ?? ""} onChange={(e) => f("image", e.target.value)}
                    placeholder="https://..." className="h-9 text-sm" />
                </div>
              </div>
            </Section>

            {/* ── Status ── */}
            <Section title="Status &amp; Visibility">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive add-ons won't appear in the booking flow.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={form.isActive ? "default" : "secondary"} className="text-[10px]">
                    {form.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Switch checked={form.isActive} onCheckedChange={(v) => f("isActive", v)} />
                </div>
              </div>
            </Section>

            {/* ── Pricing ── */}
            <Section title="Pricing">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Pricing Type</Label>
                  <Select value={form.pricingType} onValueChange={(v) => f("pricingType", v as AddOnPricingType)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PRICING_LABELS) as [AddOnPricingType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Base Price ($)</Label>
                  <Input type="number" min={0} step={0.01} value={form.price}
                    onChange={(e) => f("price", parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tax Rate % (override)</Label>
                  <Input type="number" min={0} step={0.01} value={form.taxRate ?? ""}
                    onChange={(e) => f("taxRate", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Uses facility default" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                  <Input type="number" min={0} value={form.duration ?? ""}
                    onChange={(e) => f("duration", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Optional" className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
                <p className="text-sm">Size-based pricing</p>
                <Switch checked={sizePricingOn} onCheckedChange={setSizePricingOn} />
              </div>
              {sizePricingOn && (
                <div className="space-y-2">
                  {sizeRows.map((row, i) => (
                    <div key={row.size} className="flex items-center gap-2">
                      <span className="w-14 text-xs font-medium text-muted-foreground">{SIZE_LABELS[row.size]}</span>
                      <Input type="number" min={0} step={0.01} value={row.priceModifier}
                        onChange={(e) => setSizeRows((prev) => prev.map((r, idx) => idx === i ? { ...r, priceModifier: parseFloat(e.target.value) || 0 } : r))}
                        className="h-7 text-xs flex-1" />
                      <Select value={row.modifierType} onValueChange={(v) => setSizeRows((prev) => prev.map((r, idx) => idx === i ? { ...r, modifierType: v as "flat" | "percentage" } : r))}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">$ Flat</SelectItem>
                          <SelectItem value="percentage">% Add</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Scheduling Type ── */}
            <Section title="Scheduling">
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULING_OPTIONS.map(({ value, label, desc, Icon }) => (
                  <button key={value} type="button"
                    onClick={() => f("schedulingType", value)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all",
                      form.schedulingType === value
                        ? "border-primary bg-primary/6 ring-2 ring-primary/20 shadow-sm"
                        : "hover:border-slate-300 hover:bg-slate-50/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-3.5", form.schedulingType === value ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-semibold">{label}</span>
                      {form.schedulingType === value && <CheckCircle2 className="size-3 text-primary ml-auto" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
                  </button>
                ))}
              </div>
              {(form.schedulingType === "quantity") && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max Quantity</Label>
                  <Input type="number" min={1} value={form.maxQuantity ?? ""}
                    onChange={(e) => f("maxQuantity", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No limit" className="h-9 text-sm" />
                </div>
              )}
            </Section>

            {/* ── Staff ── */}
            <Section title="Staff Requirement">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: false, label: "No Staff Needed", desc: "No assignment required", Icon: UserX },
                  { val: true,  label: "Staff Assignable", desc: "Assign when adding to booking", Icon: UserCheck },
                ].map(({ val, label, desc, Icon }) => (
                  <button key={String(val)} type="button"
                    onClick={() => f("requiresStaff", val)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all",
                      form.requiresStaff === val
                        ? "border-primary bg-primary/6 ring-2 ring-primary/20 shadow-sm"
                        : "hover:border-slate-300 hover:bg-slate-50/50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-3.5", form.requiresStaff === val ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-xs font-semibold">{label}</span>
                      {form.requiresStaff === val && <CheckCircle2 className="size-3 text-primary ml-auto" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Applicable Services ── */}
            <Section title="Applicable Services">
              <div className="flex gap-2 mb-3">
                {[
                  { key: "all" as const, label: "All Services" },
                  { key: "specific" as const, label: "Select Specific" },
                ].map(({ key, label }) => {
                  const isAll = form.applicableServices.length === 0;
                  const active = key === "all" ? isAll : !isAll;
                  return (
                    <button key={key} type="button"
                      onClick={() => { if (key === "all") f("applicableServices", []); }}
                      className={cn(
                        "flex-1 rounded-lg border py-2 text-xs font-medium transition-all",
                        active ? "border-primary bg-primary/8 text-primary" : "hover:border-slate-300 text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {allServices.map((svc) => {
                  const selected = form.applicableServices.includes(svc.id);
                  return (
                    <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        selected ? "border-primary bg-primary/10 text-primary" : "hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      {selected && <CheckCircle2 className="size-3" />}
                      {svc.name}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* ── Pet Eligibility ── */}
            <Section title="Pet Eligibility" collapsible>
              <p className="text-xs text-muted-foreground -mt-1">Leave all as "All" to allow this add-on for every pet.</p>
              <AddOnPetFilter value={form.petTypeFilter} onChange={(v) => f("petTypeFilter", v)} />
            </Section>

            {/* ── Task Generation ── */}
            <Section title="Auto-Task" collapsible>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Generate staff task</p>
                  <p className="text-xs text-muted-foreground">Creates a reminder task in the assigned staff member's queue.</p>
                </div>
                <Switch checked={form.generatesTask} onCheckedChange={(v) => f("generatesTask", v)} />
              </div>
              {form.generatesTask && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Task Category</Label>
                  <Input value={form.taskCategory ?? ""} onChange={(e) => f("taskCategory", e.target.value)}
                    placeholder="e.g. grooming, communication, exercise" className="h-9 text-sm" />
                </div>
              )}
            </Section>

          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="px-6 py-4 bg-slate-50/60">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!isValid} onClick={handleSave}>
            {editing ? "Save Changes" : "Create Add-On"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
