"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiscountStackingConfig } from "@/types/loyalty";

type StackingBehavior = DiscountStackingConfig["stackingBehavior"];
type TierPriority = "first" | "last" | "custom";
type RedemptionPriority = "before_discounts" | "after_discounts";

interface StackingEditorProps {
  value: DiscountStackingConfig;
  onChange: (v: DiscountStackingConfig) => void;
}

export function StackingEditor({ value, onChange }: StackingEditorProps) {
  const tier = value.tierDiscountStacking;
  const points = value.pointsRedemptionStacking;

  const update = (patch: Partial<DiscountStackingConfig>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Discount Stacking Rules</Label>
          <p className="text-muted-foreground text-sm">
            Control how loyalty discounts combine with other offers
          </p>
        </div>
        <Switch
          id="stackingEnabled"
          checked={value.enabled}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
      </div>

      {value.enabled && (
        <>
          <div className="space-y-2">
            <Label>Stacking Behavior</Label>
            <Select
              value={value.stackingBehavior}
              onValueChange={(v: StackingBehavior) =>
                update({ stackingBehavior: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_stacking">No Stacking</SelectItem>
                <SelectItem value="stack_with_promos">
                  Stack with Promo Codes Only
                </SelectItem>
                <SelectItem value="stack_with_member">
                  Stack with Member Discounts Only
                </SelectItem>
                <SelectItem value="stack_all">Stack All Discounts</SelectItem>
                <SelectItem value="best_discount_only">
                  Best Discount Only
                </SelectItem>
                <SelectItem value="custom">Custom Rules</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <Label className="text-base">Tier Discount Stacking</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tierStackEnabled"
                  checked={tier?.canStackWithOtherDiscounts ?? false}
                  onCheckedChange={(checked) =>
                    update({
                      tierDiscountStacking: {
                        enabled: true,
                        canStackWithOtherDiscounts: checked,
                        stackingPriority: tier?.stackingPriority ?? "first",
                      },
                    })
                  }
                />
                <Label htmlFor="tierStackEnabled">
                  Allow Tier Discounts to Stack with Other Discounts
                </Label>
              </div>
              {tier?.canStackWithOtherDiscounts && (
                <div className="space-y-2">
                  <Label>Tier Discount Priority</Label>
                  <Select
                    value={tier.stackingPriority}
                    onValueChange={(v: TierPriority) =>
                      update({
                        tierDiscountStacking: {
                          enabled: true,
                          canStackWithOtherDiscounts: true,
                          stackingPriority: v,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">Apply First</SelectItem>
                      <SelectItem value="last">Apply Last</SelectItem>
                      <SelectItem value="custom">Custom Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <Label className="text-base">Points Redemption Stacking</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="pointsWithDiscounts"
                    checked={points?.canUseWithDiscounts ?? false}
                    onCheckedChange={(checked) =>
                      update({
                        pointsRedemptionStacking: {
                          enabled: true,
                          canUseWithDiscounts: checked,
                          canUseWithPromoCodes:
                            points?.canUseWithPromoCodes ?? false,
                          redemptionPriority:
                            points?.redemptionPriority ?? "before_discounts",
                        },
                      })
                    }
                  />
                  <Label htmlFor="pointsWithDiscounts">
                    Can Use with Discounts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="pointsWithPromos"
                    checked={points?.canUseWithPromoCodes ?? false}
                    onCheckedChange={(checked) =>
                      update({
                        pointsRedemptionStacking: {
                          enabled: true,
                          canUseWithDiscounts:
                            points?.canUseWithDiscounts ?? false,
                          canUseWithPromoCodes: checked,
                          redemptionPriority:
                            points?.redemptionPriority ?? "before_discounts",
                        },
                      })
                    }
                  />
                  <Label htmlFor="pointsWithPromos">
                    Can Use with Promo Codes
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Redemption Priority</Label>
                <Select
                  value={points?.redemptionPriority ?? "before_discounts"}
                  onValueChange={(v: RedemptionPriority) =>
                    update({
                      pointsRedemptionStacking: {
                        enabled: true,
                        canUseWithDiscounts:
                          points?.canUseWithDiscounts ?? false,
                        canUseWithPromoCodes:
                          points?.canUseWithPromoCodes ?? false,
                        redemptionPriority: v,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before_discounts">
                      Apply Before Other Discounts
                    </SelectItem>
                    <SelectItem value="after_discounts">
                      Apply After Other Discounts
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
