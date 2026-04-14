"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RateColorPicker } from "@/components/facility/RateColorPicker";
import type { PlanBuilderData } from "../use-plan-builder";

interface Props {
  data: PlanBuilderData;
  update: (patch: Partial<PlanBuilderData>) => void;
}

export function StepBasics({ data, update }: Props) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Plan name" required>
          <Input
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g., Daycare Plus"
          />
        </Field>
        <Field label="Tier label" required>
          <Select
            value={data.tierLabel}
            onValueChange={(v) => update({ tierLabel: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bronze">Bronze</SelectItem>
              <SelectItem value="Silver">Silver</SelectItem>
              <SelectItem value="Gold">Gold</SelectItem>
              <SelectItem value="Platinum">Platinum</SelectItem>
              <SelectItem value="Black">Black</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Description"
        required
        hint="Shown to clients during online purchase."
      >
        <Textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          placeholder="Describe the value, perks, and who this plan is for..."
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Badge color">
          <RateColorPicker
            value={data.badgeColor}
            onChange={(hex) => update({ badgeColor: hex })}
            label=""
          />
        </Field>

        <div className="grid gap-3">
          <Toggle
            label="Active"
            description="Inactive plans cannot be sold"
            checked={data.isActive}
            onChange={(v) => update({ isActive: v })}
          />
          <Toggle
            label="Available online"
            description="Allow purchase through the online booking site"
            checked={data.availableOnline}
            onChange={(v) => update({ availableOnline: v })}
          />
          <Toggle
            label="Mark as popular"
            description="Highlights this plan with a Sparkles accent"
            checked={data.isPopular}
            onChange={(v) => update({ isPopular: v })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Terms URL"
          hint="Link to full terms & policy document (optional)"
        >
          <Input
            value={data.termsUrl}
            onChange={(e) => update({ termsUrl: e.target.value })}
            placeholder="https://example.com/terms"
          />
        </Field>
        <Field
          label="Short terms text"
          hint="Displayed at checkout. Plain text only."
        >
          <Textarea
            value={data.termsText}
            onChange={(e) => update({ termsText: e.target.value })}
            rows={3}
            placeholder="Auto-renews until cancelled. Cancel anytime..."
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="bg-muted/30 flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
