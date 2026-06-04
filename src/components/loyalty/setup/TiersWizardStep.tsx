"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Users,
} from "lucide-react";
import type { Tier, TierBenefit, TierThresholdType } from "@/types/loyalty";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";

const COLOR_PRESETS = [
  "#CD7F32",
  "#C0C0C0",
  "#FFD700",
  "#E5E4E2",
  "#6366F1",
  "#10B981",
  "#0EA5E9",
  "#EC4899",
];

const ICON_PRESETS = ["🥉", "🥈", "🥇", "💎", "⭐", "👑", "🏆", "🐾"];

const THRESHOLD_LABELS: Record<TierThresholdType, string> = {
  points: "Points",
  spend: "Spend ($)",
  visits: "Visits",
};

function thresholdText(t: Tier): string {
  const v = t.thresholdValue.toLocaleString();
  if (t.thresholdType === "points") return `${v}+ pts`;
  if (t.thresholdType === "spend") return `$${v}+ spend`;
  return `${v}+ visits`;
}

function requiredNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Benefit model <-> friendly "kind"
// ---------------------------------------------------------------------------

type BenefitKind =
  | "discount_all"
  | "discount_service"
  | "multiplier"
  | "free_service"
  | "priority"
  | "credit_tierup"
  | "custom";

const BENEFIT_KIND_LABELS: Record<BenefitKind, string> = {
  discount_all: "Discount % on all services",
  discount_service: "Discount % on a specific service",
  multiplier: "Bonus points multiplier",
  free_service: "Free service",
  priority: "Priority booking",
  credit_tierup: "Account credit on tier-up",
  custom: "Custom reward text",
};

function benefitKind(b: TierBenefit): BenefitKind {
  switch (b.type) {
    case "discount_pct":
    case "discount_fixed":
      return b.appliesToServiceTypes && b.appliesToServiceTypes.length > 0
        ? "discount_service"
        : "discount_all";
    case "bonus_points_multiplier":
      return "multiplier";
    case "free_service":
      return "free_service";
    case "priority_booking":
      return "priority";
    case "credit":
      return "credit_tierup";
    case "custom_text":
      return "custom";
  }
}

function applyBenefitKind(kind: BenefitKind): TierBenefit {
  switch (kind) {
    case "discount_all":
      return { type: "discount_pct", value: 10, appliesToServiceTypes: null };
    case "discount_service":
      return {
        type: "discount_pct",
        value: 10,
        appliesToServiceTypes: [BOOKABLE_SERVICE_TYPES[0]],
      };
    case "multiplier":
      return { type: "bonus_points_multiplier", value: 1.5 };
    case "free_service":
      return { type: "free_service", value: BOOKABLE_SERVICE_TYPES[0] };
    case "priority":
      return { type: "priority_booking", value: "Priority booking" };
    case "credit_tierup":
      return { type: "credit", value: 25 };
    case "custom":
      return { type: "custom_text", value: "" };
  }
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export function TiersWizardStep({
  value,
  onChange,
  enabled,
  onEnabledChange,
  facilityId,
}: {
  value: Tier[];
  onChange: (v: Tier[]) => void;
  enabled: boolean;
  onEnabledChange: (b: boolean) => void;
  facilityId: number;
}) {
  const sorted = [...value].sort((a, b) => a.sortOrder - b.sortOrder);

  const commit = (next: Tier[]) =>
    onChange(next.map((t, i) => ({ ...t, sortOrder: i })));

  const updateTier = (id: string, patch: Partial<Tier>) =>
    commit(sorted.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const removeTier = (id: string) => {
    if (sorted.length <= 1) return;
    commit(sorted.filter((t) => t.id !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[j]] = [next[j], next[index]];
    commit(next);
  };

  const addTier = () => {
    // Compute a unique id from existing ones at click time (no ref/Date.now).
    const nextN = value.reduce((max, t) => {
      const m = /^tier-w(\d+)$/.exec(t.id);
      return m ? Math.max(max, Number(m[1]) + 1) : max;
    }, 0);
    const newTier: Tier = {
      id: `tier-w${nextN}`,
      facilityId,
      name: "New Tier",
      thresholdType: "points",
      thresholdValue: 0,
      color: COLOR_PRESETS[4],
      icon: "⭐",
      sortOrder: sorted.length,
      benefits: [],
    };
    commit([...sorted, newTier]);
  };

  return (
    <div className="space-y-5">
      {/* Use tiers toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Use loyalty tiers</Label>
          <p className="text-muted-foreground text-sm">
            Off: everyone earns equally and rules apply flat. On: customers
            climb tiers for better perks.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
          aria-label="Use loyalty tiers"
        />
      </div>

      {!enabled ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">Flat program — no tiers</p>
            <p className="text-muted-foreground max-w-md text-sm">
              All customers are treated equally. Your earn rules apply the same
              way to everyone.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Tier cards */}
          <div className="space-y-4">
            {sorted.length === 0 && (
              <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                Add your first tier to get started.
              </p>
            )}
            {sorted.map((tier, index) => (
              <TierCard
                key={tier.id}
                tier={tier}
                index={index}
                count={sorted.length}
                onPatch={(patch) => updateTier(tier.id, patch)}
                onRemove={() => removeTier(tier.id)}
                onMove={(dir) => move(index, dir)}
              />
            ))}
            <Button variant="outline" onClick={addTier} className="w-full">
              <Plus className="mr-2 size-4" /> Add tier
            </Button>
          </div>

          {/* Progression ladder */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Tier journey
            </p>
            <div className="lg:sticky lg:top-40">
              <ProgressionLadder tiers={sorted} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier card
// ---------------------------------------------------------------------------

function TierCard({
  tier,
  index,
  count,
  onPatch,
  onRemove,
  onMove,
}: {
  tier: Tier;
  index: number;
  count: number;
  onPatch: (patch: Partial<Tier>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const updateBenefit = (i: number, benefit: TierBenefit) =>
    onPatch({ benefits: tier.benefits.map((b, j) => (j === i ? benefit : b)) });
  const removeBenefit = (i: number) =>
    onPatch({ benefits: tier.benefits.filter((_, j) => j !== i) });
  const addBenefit = () =>
    onPatch({ benefits: [...tier.benefits, applyBenefitKind("discount_all")] });

  return (
    <Card className="relative">
      <CardContent className="space-y-4 pt-6">
        {/* Header: drag handle + reorder + title + remove */}
        <div className="flex items-center gap-2">
          <GripVertical className="text-muted-foreground size-4 shrink-0" />
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Move tier up"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Move tier down"
              disabled={index === count - 1}
              onClick={() => onMove(1)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
          <span
            className="flex size-8 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: `${tier.color}22` }}
            aria-hidden="true"
          >
            {tier.icon || "⭐"}
          </span>
          <span className="text-base font-semibold">
            {tier.name || "New Tier"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove tier"
            className="ml-auto"
            disabled={count <= 1}
            onClick={onRemove}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>

        {/* Name + threshold */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tier name</Label>
            <Input
              value={tier.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="e.g., Gold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Threshold</Label>
            <Select
              value={tier.thresholdType}
              onValueChange={(v: TierThresholdType) =>
                onPatch({ thresholdType: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(THRESHOLD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value</Label>
            <Input
              type="number"
              value={tier.thresholdValue}
              onChange={(e) =>
                onPatch({ thresholdValue: requiredNumber(e.target.value) })
              }
            />
          </div>
        </div>

        {/* Color + icon */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ColorField
            value={tier.color}
            onChange={(color) => onPatch({ color })}
          />
          <IconField
            value={tier.icon}
            onChange={(icon) => onPatch({ icon })}
          />
        </div>

        {/* Benefits */}
        <div className="space-y-2">
          <Label className="text-xs">Benefits</Label>
          {tier.benefits.length === 0 && (
            <p className="text-muted-foreground text-sm">No benefits yet.</p>
          )}
          {tier.benefits.map((b, i) => (
            <BenefitRow
              key={i}
              benefit={b}
              onChange={(next) => updateBenefit(i, next)}
              onRemove={() => removeBenefit(i)}
            />
          ))}
          <Button variant="outline" size="sm" onClick={addBenefit}>
            <Plus className="mr-1 size-4" /> Add benefit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Benefit row
// ---------------------------------------------------------------------------

function BenefitRow({
  benefit,
  onChange,
  onRemove,
}: {
  benefit: TierBenefit;
  onChange: (b: TierBenefit) => void;
  onRemove: () => void;
}) {
  const kind = benefitKind(benefit);
  const service =
    typeof benefit.value === "string" && benefit.value
      ? benefit.value
      : BOOKABLE_SERVICE_TYPES[0];
  const scopeService = benefit.appliesToServiceTypes?.[0] ?? BOOKABLE_SERVICE_TYPES[0];

  return (
    <div className="bg-muted/20 flex flex-wrap items-end gap-2 rounded-lg border p-2.5">
      <div className="min-w-[200px] flex-1 space-y-1">
        <Select
          value={kind}
          onValueChange={(v: BenefitKind) => onChange(applyBenefitKind(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BENEFIT_KIND_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(kind === "discount_all" || kind === "discount_service") && (
        <div className="w-24">
          <Input
            type="number"
            aria-label="Discount percent"
            value={typeof benefit.value === "number" ? benefit.value : ""}
            onChange={(e) =>
              onChange({ ...benefit, value: requiredNumber(e.target.value) })
            }
            placeholder="%"
          />
        </div>
      )}

      {kind === "discount_service" && (
        <div className="w-36">
          <Select
            value={scopeService}
            onValueChange={(v) =>
              onChange({ ...benefit, appliesToServiceTypes: [v] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKABLE_SERVICE_TYPES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {kind === "multiplier" && (
        <div className="flex w-28 items-center gap-1">
          <Input
            type="number"
            step="0.25"
            aria-label="Points multiplier"
            value={typeof benefit.value === "number" ? benefit.value : ""}
            onChange={(e) =>
              onChange({ ...benefit, value: requiredNumber(e.target.value) })
            }
          />
          <span className="text-muted-foreground text-sm">×</span>
        </div>
      )}

      {kind === "free_service" && (
        <div className="w-36">
          <Select
            value={service}
            onValueChange={(v) => onChange({ ...benefit, value: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKABLE_SERVICE_TYPES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {kind === "credit_tierup" && (
        <div className="w-24">
          <Input
            type="number"
            aria-label="Credit amount"
            value={typeof benefit.value === "number" ? benefit.value : ""}
            onChange={(e) =>
              onChange({ ...benefit, value: requiredNumber(e.target.value) })
            }
            placeholder="$"
          />
        </div>
      )}

      {kind === "custom" && (
        <div className="min-w-[200px] flex-1">
          <Input
            aria-label="Custom reward text"
            value={typeof benefit.value === "string" ? benefit.value : ""}
            onChange={(e) => onChange({ ...benefit, value: e.target.value })}
            placeholder="Describe the reward"
          />
        </div>
      )}

      {kind === "priority" && (
        <span className="text-muted-foreground px-1 py-2 text-sm">
          Enabled for this tier
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Remove benefit"
        onClick={onRemove}
      >
        <Trash2 className="text-destructive size-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact color & icon pickers
// ---------------------------------------------------------------------------

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Color</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick tier color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded-md border bg-transparent p-0.5"
        />
        <div className="flex flex-wrap gap-1">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use color ${c}`}
              onClick={() => onChange(c)}
              className={cn(
                "size-6 rounded-full border-2 transition-transform hover:scale-110",
                value.toLowerCase() === c.toLowerCase()
                  ? "border-foreground"
                  : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function IconField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Icon</Label>
      <div className="flex flex-wrap gap-1">
        {ICON_PRESETS.map((icon) => (
          <button
            key={icon}
            type="button"
            aria-label={`Use icon ${icon}`}
            onClick={() => onChange(icon)}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border text-lg transition-all hover:scale-105",
              value === icon
                ? "border-primary ring-primary/30 ring-2"
                : "border-border hover:bg-muted/50",
            )}
          >
            <span aria-hidden="true">{icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progression ladder preview
// ---------------------------------------------------------------------------

function ProgressionLadder({ tiers }: { tiers: Tier[] }) {
  if (tiers.length === 0) {
    return (
      <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
        Add tiers to preview the journey.
      </div>
    );
  }
  // Highest tier at the top of the ladder.
  const ladder = [...tiers].reverse();
  return (
    <div className="rounded-2xl border p-4">
      <div className="space-y-0">
        {ladder.map((tier, i) => (
          <div key={tier.id} className="flex gap-3">
            {/* rail */}
            <div className="flex flex-col items-center">
              <span
                className="flex size-9 items-center justify-center rounded-full text-base shadow-sm"
                style={{ backgroundColor: `${tier.color}26` }}
              >
                {tier.icon || "⭐"}
              </span>
              {i < ladder.length - 1 && (
                <span
                  className="my-1 w-0.5 flex-1"
                  style={{ backgroundColor: `${tier.color}55`, minHeight: 24 }}
                />
              )}
            </div>
            <div className="pb-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{tier.name || "Tier"}</span>
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
              </div>
              <div className="text-muted-foreground text-xs">
                {thresholdText(tier)}
              </div>
              {tier.benefits.length > 0 && (
                <div className="mt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {tier.benefits.length} benefit
                    {tier.benefits.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
