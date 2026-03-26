"use client";

import { useCallback } from "react";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CustomServiceModule, PricingModelType } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRICING_MODELS: {
  value: PricingModelType;
  label: string;
  description: string;
}[] = [
  {
    value: "flat_rate",
    label: "Flat Rate",
    description: "Same price for every booking regardless of duration or size.",
  },
  {
    value: "duration_based",
    label: "Duration Based",
    description:
      "Price varies by session length. Set tiers per duration option.",
  },
  {
    value: "per_pet",
    label: "Per Pet",
    description: "Base price multiplied by the number of pets in the booking.",
  },
  {
    value: "per_booking",
    label: "Per Booking",
    description: "Fixed price per booking event (e.g. parties, events).",
  },
  {
    value: "per_route",
    label: "Per Route",
    description: "Fixed price per transport route regardless of stops.",
  },
  {
    value: "dynamic",
    label: "Dynamic",
    description: "Base price with peak/off-peak adjustment rules.",
  },
  {
    value: "addon_only",
    label: "Add-On Only",
    description:
      "No standalone price — priced as an add-on to another service.",
  },
];

interface PricingStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function PricingStep({ data, onChange }: PricingStepProps) {
  const pricing = data.pricing;

  const updatePricing = useCallback(
    (updates: Partial<typeof pricing>) => {
      onChange({ pricing: { ...pricing, ...updates } });
    },
    [pricing, onChange],
  );

  const addDurationTier = useCallback(() => {
    const existing = pricing.durationTiers ?? [];
    updatePricing({
      durationTiers: [...existing, { durationMinutes: 60, price: 0 }],
    });
  }, [pricing.durationTiers, updatePricing]);

  const removeDurationTier = useCallback(
    (index: number) => {
      updatePricing({
        durationTiers: (pricing.durationTiers ?? []).filter(
          (_, i) => i !== index,
        ),
      });
    },
    [pricing.durationTiers, updatePricing],
  );

  const updateDurationTier = useCallback(
    (
      index: number,
      updates: Partial<{ durationMinutes: number; price: number }>,
    ) => {
      const next = [...(pricing.durationTiers ?? [])];
      next[index] = { ...next[index], ...updates };
      updatePricing({ durationTiers: next });
    },
    [pricing.durationTiers, updatePricing],
  );

  const addPeakRule = useCallback(() => {
    const existing = pricing.peakPricingRules ?? [];
    updatePricing({
      peakPricingRules: [
        ...existing,
        {
          id: `peak-${Date.now()}`,
          name: "Weekend",
          adjustment: 10,
          adjustmentType: "percentage" as const,
        },
      ],
    });
  }, [pricing.peakPricingRules, updatePricing]);

  const removePeakRule = useCallback(
    (id: string) => {
      updatePricing({
        peakPricingRules: (pricing.peakPricingRules ?? []).filter(
          (r) => r.id !== id,
        ),
      });
    },
    [pricing.peakPricingRules, updatePricing],
  );

  return (
    <div className="space-y-6">
      {/* Model selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Pricing Model</Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            How this service is charged.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Pricing model"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {PRICING_MODELS.map((model) => (
            <button
              key={model.value}
              type="button"
              role="radio"
              aria-checked={pricing.model === model.value}
              onClick={() => updatePricing({ model: model.value })}
              className={cn(
                `flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all`,
                pricing.model === model.value
                  ? "border-primary bg-primary/5"
                  : `border-border hover:border-border/80 hover:bg-accent/30`,
              )}
            >
              <DollarSign
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  pricing.model === model.value
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <div>
                <p
                  className={cn(
                    "text-sm/tight font-semibold",
                    pricing.model === model.value
                      ? "text-primary"
                      : "text-foreground",
                  )}
                >
                  {model.label}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {model.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Base Price */}
      {pricing.model !== "addon_only" && (
        <div className="space-y-1.5">
          <Label htmlFor="base-price">
            Base Price ($)
            {pricing.model === "duration_based" && (
              <span className="text-muted-foreground ml-1 text-xs font-normal">
                (fallback if no duration tier matches)
              </span>
            )}
          </Label>
          <Input
            id="base-price"
            type="number"
            min={0}
            step={0.5}
            value={pricing.basePrice}
            onChange={(e) =>
              updatePricing({ basePrice: parseFloat(e.target.value) || 0 })
            }
            className="w-full sm:w-36"
            placeholder="0.00"
          />
        </div>
      )}

      {/* Duration Tiers */}
      {pricing.model === "duration_based" && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Duration Tiers</Label>
          <p className="text-muted-foreground text-xs">
            Set the price for each available duration.
          </p>
          {(pricing.durationTiers ?? []).map((tier, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                step={5}
                value={tier.durationMinutes}
                onChange={(e) =>
                  updateDurationTier(i, {
                    durationMinutes: parseInt(e.target.value) || 0,
                  })
                }
                className="w-24"
                placeholder="60"
              />
              <span className="text-muted-foreground shrink-0 text-xs">
                min →
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">$</span>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={tier.price}
                onChange={(e) =>
                  updateDurationTier(i, {
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-28"
                placeholder="0.00"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeDurationTier(i)}
              >
                <Trash2 className="text-destructive size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDurationTier}
          >
            <Plus className="size-3.5" />
            Add Tier
          </Button>
        </div>
      )}

      {/* Dynamic Peak Rules */}
      {pricing.model === "dynamic" && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Peak Pricing Rules</Label>
          <p className="text-muted-foreground text-xs">
            Adjustments applied on top of the base price for specific periods.
          </p>
          {(pricing.peakPricingRules ?? []).map((rule) => (
            <div key={rule.id} className="flex items-center gap-2">
              <Input
                value={rule.name}
                onChange={(e) => {
                  const updated = (pricing.peakPricingRules ?? []).map((r) =>
                    r.id === rule.id ? { ...r, name: e.target.value } : r,
                  );
                  updatePricing({ peakPricingRules: updated });
                }}
                className="flex-1"
                placeholder="Rule name (e.g. Weekend)"
              />
              <Input
                type="number"
                value={rule.adjustment}
                onChange={(e) => {
                  const updated = (pricing.peakPricingRules ?? []).map((r) =>
                    r.id === rule.id
                      ? { ...r, adjustment: parseFloat(e.target.value) || 0 }
                      : r,
                  );
                  updatePricing({ peakPricingRules: updated });
                }}
                className="w-20"
                placeholder="10"
              />
              <span className="text-muted-foreground shrink-0 text-xs">%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removePeakRule(rule.id)}
              >
                <Trash2 className="text-destructive size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPeakRule}
          >
            <Plus className="size-3.5" />
            Add Rule
          </Button>
        </div>
      )}

      <Separator />

      {/* Tax & Options */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Tax & Billing Options</Label>
        <div className="space-y-3">
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="taxable"
                className="cursor-pointer text-sm font-medium"
              >
                Taxable
              </Label>
              <p className="text-muted-foreground text-xs">
                Sales tax is applied to this service.
              </p>
            </div>
            <Switch
              id="taxable"
              checked={pricing.taxable}
              onCheckedChange={(taxable) => updatePricing({ taxable })}
            />
          </div>
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="tip-allowed"
                className="cursor-pointer text-sm font-medium"
              >
                Tips Allowed
              </Label>
              <p className="text-muted-foreground text-xs">
                Clients can add a gratuity tip when paying.
              </p>
            </div>
            <Switch
              id="tip-allowed"
              checked={pricing.tipAllowed}
              onCheckedChange={(tipAllowed) => updatePricing({ tipAllowed })}
            />
          </div>
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="membership-discount"
                className="cursor-pointer text-sm font-medium"
              >
                Membership Discount Eligible
              </Label>
              <p className="text-muted-foreground text-xs">
                Clients with active memberships can use their discount on this
                service.
              </p>
            </div>
            <Switch
              id="membership-discount"
              checked={pricing.membershipDiscountEligible}
              onCheckedChange={(membershipDiscountEligible) =>
                updatePricing({ membershipDiscountEligible })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
