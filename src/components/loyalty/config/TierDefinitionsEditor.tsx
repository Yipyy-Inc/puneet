"use client";

import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  Tier,
  TierBenefit,
  TierThresholdType,
  TierBenefitType,
} from "@/types/loyalty";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";

const THRESHOLD_LABELS: Record<TierThresholdType, string> = {
  points: "Points",
  spend: "Spend ($)",
  visits: "Visits",
};

const BENEFIT_LABELS: Record<TierBenefitType, string> = {
  discount_pct: "Discount (%)",
  discount_fixed: "Discount ($)",
  credit: "Account Credit ($)",
  free_service: "Free Service",
  priority_booking: "Priority Booking",
  bonus_points_multiplier: "Points Multiplier",
  custom_text: "Custom Text",
};

function thresholdLabel(t: TierThresholdType): string {
  switch (t) {
    case "points":
      return "Points required";
    case "spend":
      return "Spend required ($)";
    case "visits":
      return "Visits required";
  }
}

function benefitValueIsNumeric(t: TierBenefitType): boolean {
  return (
    t === "discount_pct" ||
    t === "discount_fixed" ||
    t === "credit" ||
    t === "bonus_points_multiplier"
  );
}

function benefitValueLabel(t: TierBenefitType): string {
  switch (t) {
    case "discount_pct":
      return "Percent";
    case "discount_fixed":
    case "credit":
      return "Amount ($)";
    case "bonus_points_multiplier":
      return "Multiplier";
    case "free_service":
      return "Service";
    case "priority_booking":
      return "Label";
    case "custom_text":
      return "Text";
  }
}

function requiredNumber(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

export function TierDefinitionsEditor({
  value,
  onChange,
  facilityId,
}: {
  value: Tier[];
  onChange: (v: Tier[]) => void;
  facilityId: number;
}) {
  const counter = useRef(0);

  const updateTier = (index: number, patch: Partial<Tier>) => {
    onChange(value.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const removeTier = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addTier = () => {
    const nextSort =
      value.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
    const newTier: Tier = {
      id: `tier-${Date.now()}-${counter.current++}`,
      facilityId,
      name: "New Tier",
      thresholdType: "points",
      thresholdValue: 0,
      color: "#6366F1",
      icon: "⭐",
      sortOrder: nextSort,
      benefits: [],
    };
    onChange([...value, newTier]);
  };

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No tiers yet. Add a tier, or leave empty for a flat (tier-less)
          program.
        </p>
      )}

      {value.map((tier, index) => (
        <TierCard
          key={tier.id}
          tier={tier}
          onPatch={(patch) => updateTier(index, patch)}
          onRemove={() => removeTier(index)}
        />
      ))}

      <Button variant="outline" onClick={addTier} className="w-full">
        <Plus className="mr-2 size-4" /> Add Tier
      </Button>
    </div>
  );
}

function TierCard({
  tier,
  onPatch,
  onRemove,
}: {
  tier: Tier;
  onPatch: (patch: Partial<Tier>) => void;
  onRemove: () => void;
}) {
  const updateBenefit = (index: number, benefit: TierBenefit) => {
    onPatch({
      benefits: tier.benefits.map((b, i) => (i === index ? benefit : b)),
    });
  };

  const removeBenefit = (index: number) => {
    onPatch({ benefits: tier.benefits.filter((_, i) => i !== index) });
  };

  const addBenefit = () => {
    onPatch({
      benefits: [...tier.benefits, { type: "discount_pct", value: 0 }],
    });
  };

  return (
    <Card className="relative">
      <CardContent className="space-y-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 items-center justify-center rounded-lg text-lg shadow-sm"
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
            onClick={onRemove}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={tier.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              placeholder="e.g., Gold"
            />
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={tier.sortOrder}
              onChange={(e) =>
                onPatch({ sortOrder: requiredNumber(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Threshold Type</Label>
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
          <div className="space-y-2">
            <Label>{thresholdLabel(tier.thresholdType)}</Label>
            <Input
              type="number"
              value={tier.thresholdValue}
              onChange={(e) =>
                onPatch({ thresholdValue: requiredNumber(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              <Input
                value={tier.color}
                onChange={(e) => onPatch({ color: e.target.value })}
                className="font-mono"
              />
              <div
                className="size-9 shrink-0 rounded-sm border"
                style={{ backgroundColor: tier.color }}
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icon (emoji or key)</Label>
            <Input
              value={tier.icon}
              onChange={(e) => onPatch({ icon: e.target.value })}
              placeholder="e.g., 🥇 or crown"
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <Label>Benefits</Label>
          {tier.benefits.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No benefits — add perks members of this tier receive.
            </p>
          )}
          {tier.benefits.map((benefit, i) => (
            <BenefitRow
              key={i}
              benefit={benefit}
              onChange={(b) => updateBenefit(i, b)}
              onRemove={() => removeBenefit(i)}
            />
          ))}
          <Button variant="outline" size="sm" onClick={addBenefit}>
            <Plus className="mr-1 size-4" /> Add Benefit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitRow({
  benefit,
  onChange,
  onRemove,
}: {
  benefit: TierBenefit;
  onChange: (b: TierBenefit) => void;
  onRemove: () => void;
}) {
  const numeric = benefitValueIsNumeric(benefit.type);
  const all =
    benefit.appliesToServiceTypes === null ||
    benefit.appliesToServiceTypes === undefined;
  const selected = benefit.appliesToServiceTypes ?? [];

  const changeType = (type: TierBenefitType) => {
    const toNumeric = benefitValueIsNumeric(type);
    const value = toNumeric
      ? typeof benefit.value === "number"
        ? benefit.value
        : 0
      : typeof benefit.value === "string"
        ? benefit.value
        : "";
    onChange({ ...benefit, type, value });
  };

  const toggleService = (service: string) => {
    const next = selected.includes(service)
      ? selected.filter((s) => s !== service)
      : [...selected, service];
    onChange({ ...benefit, appliesToServiceTypes: next });
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select value={benefit.type} onValueChange={changeType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BENEFIT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Input
            type={numeric ? "number" : "text"}
            placeholder={benefitValueLabel(benefit.type)}
            value={
              numeric
                ? typeof benefit.value === "number"
                  ? benefit.value
                  : ""
                : typeof benefit.value === "string"
                  ? benefit.value
                  : ""
            }
            onChange={(e) =>
              onChange({
                ...benefit,
                value: numeric
                  ? requiredNumber(e.target.value)
                  : e.target.value,
              })
            }
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove benefit"
          onClick={onRemove}
        >
          <Trash2 className="text-destructive size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Applies to:</span>
        <Badge
          variant={all ? "default" : "outline"}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => onChange({ ...benefit, appliesToServiceTypes: null })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange({ ...benefit, appliesToServiceTypes: null });
            }
          }}
        >
          All
        </Badge>
        {!all &&
          BOOKABLE_SERVICE_TYPES.map((service) => (
            <Badge
              key={service}
              variant={selected.includes(service) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              role="button"
              tabIndex={0}
              onClick={() => toggleService(service)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleService(service);
                }
              }}
            >
              {service}
            </Badge>
          ))}
        {all && (
          <Badge
            variant="outline"
            className="text-muted-foreground cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onChange({ ...benefit, appliesToServiceTypes: [] })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange({ ...benefit, appliesToServiceTypes: [] });
              }
            }}
          >
            Limit…
          </Badge>
        )}
      </div>
    </div>
  );
}
