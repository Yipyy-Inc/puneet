"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { RewardTypeConfig, RewardType } from "@/types/loyalty";

const ALL_TYPES: RewardType[] = [
  "discount_code",
  "credit_balance",
  "auto_apply",
  "free_service",
  "product_discount",
  "custom",
];

const TYPE_LABELS: Record<RewardType, string> = {
  discount_code: "Discount Code",
  credit_balance: "Account Credit",
  auto_apply: "Auto-Apply Reward",
  free_service: "Free Service",
  product_discount: "Product Discount",
  custom: "Custom",
};

type ApplicableScope = "services" | "retail" | "both";
const APPLICABLE_SCOPES: ApplicableScope[] = ["services", "retail", "both"];
const SCOPE_LABELS: Record<ApplicableScope, string> = {
  services: "Services",
  retail: "Retail",
  both: "Both",
};

interface RewardTypesEditorProps {
  value: RewardTypeConfig[];
  onChange: (v: RewardTypeConfig[]) => void;
}

export function RewardTypesEditor({ value, onChange }: RewardTypesEditorProps) {
  // Build the lookup of existing entries (or a disabled default) by type.
  const entryFor = (type: RewardType): RewardTypeConfig =>
    value.find((e) => e.type === type) ?? { type, enabled: false };

  // Apply an edit to a single type and emit the full ALL_TYPES array.
  const updateType = (type: RewardType, next: RewardTypeConfig) => {
    onChange(
      ALL_TYPES.map((t) => (t === type ? next : entryFor(t))),
    );
  };

  return (
    <div className="space-y-4">
      {ALL_TYPES.map((type) => {
        const entry = entryFor(type);
        return (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-base">{TYPE_LABELS[type]}</CardTitle>
              <Switch
                checked={entry.enabled}
                aria-label={`Enable ${TYPE_LABELS[type]}`}
                onCheckedChange={(enabled) =>
                  updateType(type, { ...entry, enabled })
                }
              />
            </CardHeader>

            {entry.enabled ? (
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${type}-expiry`}>
                      Default Expiry (days)
                    </Label>
                    <Input
                      id={`${type}-expiry`}
                      type="number"
                      value={entry.defaultExpiryDays ?? ""}
                      onChange={(e) =>
                        updateType(type, {
                          ...entry,
                          defaultExpiryDays:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applicable To</Label>
                  <div className="flex flex-wrap gap-2">
                    {APPLICABLE_SCOPES.map((scope) => {
                      const active = entry.applicableTo?.includes(scope);
                      return (
                        <Badge
                          key={scope}
                          role="button"
                          tabIndex={0}
                          variant={active ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer select-none",
                            !active && "hover:bg-accent",
                          )}
                          onClick={() =>
                            updateType(type, {
                              ...entry,
                              applicableTo: toggleScope(
                                entry.applicableTo,
                                scope,
                              ),
                            })
                          }
                        >
                          {SCOPE_LABELS[scope]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Restrictions</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${type}-min-purchase`}
                        className="text-muted-foreground text-xs font-normal"
                      >
                        Minimum Purchase
                      </Label>
                      <Input
                        id={`${type}-min-purchase`}
                        type="number"
                        value={entry.restrictions?.minimumPurchase ?? ""}
                        onChange={(e) =>
                          updateType(type, {
                            ...entry,
                            restrictions: cleanRestrictions({
                              ...entry.restrictions,
                              minimumPurchase:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            }),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${type}-max-discount`}
                        className="text-muted-foreground text-xs font-normal"
                      >
                        Maximum Discount
                      </Label>
                      <Input
                        id={`${type}-max-discount`}
                        type="number"
                        value={entry.restrictions?.maximumDiscount ?? ""}
                        onChange={(e) =>
                          updateType(type, {
                            ...entry,
                            restrictions: cleanRestrictions({
                              ...entry.restrictions,
                              maximumDiscount:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            }),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor={`${type}-no-combine`}
                      className="font-normal"
                    >
                      Cannot combine with other rewards
                    </Label>
                    <Switch
                      id={`${type}-no-combine`}
                      checked={
                        entry.restrictions?.cannotCombineWithOtherRewards ??
                        false
                      }
                      onCheckedChange={(checked) =>
                        updateType(type, {
                          ...entry,
                          restrictions: cleanRestrictions({
                            ...entry.restrictions,
                            cannotCombineWithOtherRewards: checked,
                          }),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

/** Toggle a scope literal in/out of the applicableTo array, keeping it typed. */
function toggleScope(
  current: ApplicableScope[] | undefined,
  scope: ApplicableScope,
): ApplicableScope[] | undefined {
  const set = current ?? [];
  const next = set.includes(scope)
    ? set.filter((s) => s !== scope)
    : [...set, scope];
  return next.length > 0 ? next : undefined;
}

/** Drop a restrictions object entirely when every field is empty/false. */
function cleanRestrictions(
  r: RewardTypeConfig["restrictions"],
): RewardTypeConfig["restrictions"] {
  if (!r) return undefined;
  const hasValue =
    r.minimumPurchase !== undefined ||
    r.maximumDiscount !== undefined ||
    r.cannotCombineWithOtherRewards === true;
  return hasValue ? r : undefined;
}
