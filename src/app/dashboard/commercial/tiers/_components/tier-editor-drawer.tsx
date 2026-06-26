"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Save } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { modules } from "@/data/modules";
import type { TierType } from "@/data/subscription-tiers";
import { cn } from "@/lib/utils";
import type { TierWithUsage } from "@/types/commercial-tiers";
import {
  LIMIT_FIELDS,
  type LimitKey,
  annualDiscountPct,
  toEditableLimit,
} from "./tier-utils";

const TYPE_OPTIONS: { value: TierType; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
  { value: "custom", label: "Custom" },
];

const MODULE_CATEGORIES: { key: string; label: string }[] = [
  { key: "core", label: "Core" },
  { key: "advanced", label: "Advanced" },
  { key: "premium", label: "Premium" },
  { key: "addon", label: "Add-ons" },
];

interface TierEditorDrawerProps {
  tier: TierWithUsage;
  isNew: boolean;
  onSave: (tier: TierWithUsage) => void;
  onClose: () => void;
}

function seedDraft(tier: TierWithUsage): TierWithUsage {
  return {
    ...tier,
    limitations: {
      maxUsers: toEditableLimit(tier.limitations.maxUsers),
      maxReservations: toEditableLimit(tier.limitations.maxReservations),
      storageGB: toEditableLimit(tier.limitations.storageGB),
      maxLocations: toEditableLimit(tier.limitations.maxLocations),
      maxClients: toEditableLimit(tier.limitations.maxClients),
    },
    isPublic: tier.isPublic ?? true,
    transactionFeePercent: tier.transactionFeePercent ?? 0,
  };
}

export function TierEditorDrawer({
  tier,
  isNew,
  onSave,
  onClose,
}: TierEditorDrawerProps) {
  const [draft, setDraft] = useState<TierWithUsage>(() => seedDraft(tier));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const discount = annualDiscountPct(
    draft.pricing.monthly,
    draft.pricing.yearly,
  );
  const nameValid = draft.name.trim().length > 0;
  const needsConfirm = !isNew && tier.facilityCount > 0;

  function patch(updates: Partial<TierWithUsage>) {
    setDraft((prev) => ({ ...prev, ...updates }));
  }
  function patchPricing(field: "monthly" | "yearly", value: number) {
    setDraft((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }));
  }
  function patchLimit(field: LimitKey, value: number) {
    setDraft((prev) => ({
      ...prev,
      limitations: { ...prev.limitations, [field]: value },
    }));
  }
  function toggleModule(moduleId: string, checked: boolean) {
    setDraft((prev) => ({
      ...prev,
      availableModules: checked
        ? [...prev.availableModules, moduleId]
        : prev.availableModules.filter((id) => id !== moduleId),
    }));
  }

  function commit() {
    onSave(draft);
  }
  function attemptSave() {
    if (needsConfirm) setConfirmOpen(true);
    else commit();
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{isNew ? "Create new tier" : "Edit tier"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Define pricing, modules and platform limits for the new tier."
              : `Update the “${tier.name}” tier configuration.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-8 overflow-y-auto px-4 py-5">
          {/* Identity */}
          <Section title="Identity">
            <Field label="Name" htmlFor="tier-name">
              <Input
                id="tier-name"
                value={draft.name}
                placeholder="e.g. Pack Leader"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="Description" htmlFor="tier-description">
              <Textarea
                id="tier-description"
                value={draft.description}
                placeholder="Who is this tier for?"
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <Field label="Type" htmlFor="tier-type">
              <Select
                value={draft.type}
                onValueChange={(value) => patch({ type: value as TierType })}
              >
                <SelectTrigger id="tier-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ToggleField
              label="Active"
              hint="Inactive tiers can't be assigned to facilities."
              checked={draft.isActive}
              onCheckedChange={(checked) => patch({ isActive: checked })}
            />
            <ToggleField
              label="Public visibility"
              hint="Show this tier on the public pricing page."
              checked={draft.isPublic ?? true}
              onCheckedChange={(checked) => patch({ isPublic: checked })}
            />
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly price ($)" htmlFor="price-monthly">
                <Input
                  id="price-monthly"
                  type="number"
                  min={0}
                  value={draft.pricing.monthly}
                  onChange={(e) =>
                    patchPricing("monthly", Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Annual price ($)" htmlFor="price-yearly">
                <Input
                  id="price-yearly"
                  type="number"
                  min={0}
                  value={draft.pricing.yearly}
                  onChange={(e) =>
                    patchPricing("yearly", Number(e.target.value))
                  }
                />
              </Field>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>
                Paying monthly for a year costs $
                {(draft.pricing.monthly * 12).toLocaleString()}.
              </span>
              {discount > 0 ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                  Annual saves {discount}%
                </Badge>
              ) : (
                <Badge variant="secondary">No annual discount</Badge>
              )}
            </div>
          </Section>

          {/* Included Modules */}
          <Section title="Included modules">
            <div className="space-y-4">
              {MODULE_CATEGORIES.map((cat) => {
                const catModules = modules.filter(
                  (m) => m.category === cat.key,
                );
                if (catModules.length === 0) return null;
                return (
                  <div key={cat.key} className="space-y-2">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      {cat.label}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {catModules.map((mod) => {
                        const checked = draft.availableModules.includes(mod.id);
                        return (
                          <label
                            key={mod.id}
                            htmlFor={`mod-${mod.id}`}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors",
                              checked
                                ? "border-emerald-500/40 bg-emerald-500/5"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <Checkbox
                              id={`mod-${mod.id}`}
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleModule(mod.id, value === true)
                              }
                            />
                            <span className="truncate">{mod.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Platform Limits */}
          <Section title="Platform limits" hint="Set to 0 for unlimited.">
            <div className="grid grid-cols-2 gap-3">
              {LIMIT_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  htmlFor={`limit-${field.key}`}
                >
                  <Input
                    id={`limit-${field.key}`}
                    type="number"
                    min={0}
                    value={draft.limitations[field.key]}
                    onChange={(e) =>
                      patchLimit(field.key, Number(e.target.value))
                    }
                  />
                </Field>
              ))}
            </div>
          </Section>

          {/* Transaction Fee */}
          <Section title="Transaction fee">
            <Field
              label="Fee applied to each transaction (%)"
              htmlFor="txn-fee"
            >
              <Input
                id="txn-fee"
                type="number"
                min={0}
                step={0.1}
                value={draft.transactionFeePercent ?? 0}
                onChange={(e) =>
                  patch({ transactionFeePercent: Number(e.target.value) })
                }
              />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!nameValid}
            onClick={attemptSave}
          >
            <Save className="mr-2 size-4" />
            {isNew ? "Create tier" : "Save changes"}
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                Update tier permissions?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately update permissions for all{" "}
                <span className="text-foreground font-semibold">
                  {tier.facilityCount}
                </span>{" "}
                {tier.facilityCount === 1 ? "facility" : "facilities"} on this
                tier. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={commit}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
