"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoyaltyTierConfig } from "@/types/loyalty";

type TierBenefit = LoyaltyTierConfig["benefits"][number];
type BenefitType = TierBenefit["type"];

const BENEFIT_TYPE_OPTIONS: { value: BenefitType; label: string }[] = [
  { value: "discount", label: "Discount" },
  { value: "bonus_points", label: "Bonus Points" },
  { value: "free_service", label: "Free Service" },
  { value: "priority", label: "Priority Access" },
  { value: "custom", label: "Custom" },
];

interface TiersEditorProps {
  value: LoyaltyTierConfig[];
  onChange: (v: LoyaltyTierConfig[]) => void;
}

export function TiersEditor({ value, onChange }: TiersEditorProps) {
  const updateTier = (index: number, patch: Partial<LoyaltyTierConfig>) => {
    onChange(value.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  };

  const removeTier = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addTier = () => {
    const newTier: LoyaltyTierConfig = {
      id: `tier-${Date.now()}`,
      name: "",
      displayName: "",
      minPoints: 0,
      color: "#6366F1",
      benefits: [],
    };
    onChange([...value, newTier]);
  };

  const updateBenefits = (
    tierIndex: number,
    benefits: TierBenefit[],
  ) => {
    updateTier(tierIndex, { benefits });
  };

  return (
    <div className="space-y-4">
      {value.map((tier, tierIndex) => (
        <Card key={tier.id} className="relative">
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove tier"
              onClick={() => removeTier(tierIndex)}
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <div
                className="size-4 rounded-full border"
                style={{ backgroundColor: tier.color }}
                aria-hidden="true"
              />
              <Label className="text-base">{tier.name || "New Tier"}</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={tier.name}
                  onChange={(e) =>
                    updateTier(tierIndex, { name: e.target.value })
                  }
                  placeholder="e.g., Gold"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={tier.displayName}
                  onChange={(e) =>
                    updateTier(tierIndex, { displayName: e.target.value })
                  }
                  placeholder="e.g., Gold Member"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Points</Label>
                <Input
                  type="number"
                  value={tier.minPoints}
                  onChange={(e) =>
                    updateTier(tierIndex, {
                      minPoints: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Points</Label>
                <Input
                  type="number"
                  value={tier.maxPoints ?? ""}
                  onChange={(e) =>
                    updateTier(tierIndex, {
                      maxPoints:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  value={tier.color}
                  onChange={(e) =>
                    updateTier(tierIndex, { color: e.target.value })
                  }
                  className="font-mono"
                  placeholder="#6366F1"
                />
                <div
                  className="size-10 shrink-0 rounded-sm border"
                  style={{ backgroundColor: tier.color }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Earning Multiplier</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={tier.earningMultiplier ?? ""}
                  onChange={(e) =>
                    updateTier(tierIndex, {
                      earningMultiplier:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  value={tier.discountPercentage ?? ""}
                  onChange={(e) =>
                    updateTier(tierIndex, {
                      discountPercentage:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <BenefitsList
              benefits={tier.benefits}
              onChange={(benefits) => updateBenefits(tierIndex, benefits)}
            />
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addTier} className="w-full">
        <Plus className="mr-2 size-4" /> Add Tier
      </Button>
    </div>
  );
}

function BenefitsList({
  benefits,
  onChange,
}: {
  benefits: TierBenefit[];
  onChange: (benefits: TierBenefit[]) => void;
}) {
  const updateBenefit = (index: number, patch: Partial<TierBenefit>) => {
    onChange(
      benefits.map((benefit, i) =>
        i === index ? { ...benefit, ...patch } : benefit,
      ),
    );
  };

  const removeBenefit = (index: number) => {
    onChange(benefits.filter((_, i) => i !== index));
  };

  const addBenefit = () => {
    onChange([...benefits, { type: "discount", value: "", description: "" }]);
  };

  return (
    <div className="space-y-2">
      <Label>Benefits</Label>
      {benefits.map((benefit, benefitIndex) => (
        <div key={benefitIndex} className="grid grid-cols-4 items-end gap-2">
          <Select
            value={benefit.type}
            onValueChange={(v: BenefitType) =>
              updateBenefit(benefitIndex, { type: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENEFIT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={String(benefit.value)}
            onChange={(e) =>
              updateBenefit(benefitIndex, { value: e.target.value })
            }
            placeholder="Value"
          />
          <Input
            value={benefit.description}
            onChange={(e) =>
              updateBenefit(benefitIndex, { description: e.target.value })
            }
            placeholder="Description"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove benefit"
            onClick={() => removeBenefit(benefitIndex)}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addBenefit}>
        <Plus className="mr-1 size-4" /> Add Benefit
      </Button>
    </div>
  );
}
