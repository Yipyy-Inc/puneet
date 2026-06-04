"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOKABLE_SERVICE_TYPES } from "@/data/facility-loyalty-config";
import type { PointsScopeConfig } from "@/types/loyalty";

interface ScopeEditorProps {
  value: PointsScopeConfig;
  onChange: (v: PointsScopeConfig) => void;
}

type ScopeOption = PointsScopeConfig["scope"];

/** Convert a number input string to an optional number (undefined when blank). */
function toOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

export function ScopeEditor({ value, onChange }: ScopeEditorProps) {
  const showServices = value.scope === "services_only" || value.scope === "both";
  const showRetail = value.scope === "retail_only" || value.scope === "both";

  const serviceTypes = value.services?.serviceTypes ?? [];

  function toggleServiceType(type: string) {
    const current = value.services?.serviceTypes ?? [];
    const nextTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({
      ...value,
      services: {
        ...value.services,
        enabled: true,
        serviceTypes: nextTypes,
      },
    });
  }

  function setMinimumServiceAmount(raw: string) {
    onChange({
      ...value,
      services: {
        ...value.services,
        enabled: true,
        serviceTypes: value.services?.serviceTypes ?? [],
        minimumServiceAmount: toOptionalNumber(raw),
      },
    });
  }

  function setExcludeSaleItems(checked: boolean) {
    onChange({
      ...value,
      retail: {
        ...value.retail,
        enabled: true,
        excludeSaleItems: checked,
      },
    });
  }

  function setMinimumPurchaseAmount(raw: string) {
    onChange({
      ...value,
      retail: {
        ...value.retail,
        enabled: true,
        minimumPurchaseAmount: toOptionalNumber(raw),
      },
    });
  }

  function setExclusion(
    key: keyof NonNullable<PointsScopeConfig["exclusions"]>,
    checked: boolean,
  ) {
    onChange({
      ...value,
      exclusions: {
        ...value.exclusions,
        [key]: checked,
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Top-level toggle */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="scope-enabled"
              checked={value.enabled}
              onCheckedChange={(checked) =>
                onChange({ ...value, enabled: checked })
              }
            />
            <Label htmlFor="scope-enabled">Points scope enabled</Label>
          </div>

          <div className="space-y-2">
            <Label>Points Earning Scope</Label>
            <Select
              value={value.scope}
              onValueChange={(v: ScopeOption) =>
                onChange({ ...value, scope: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="services_only">Services Only</SelectItem>
                <SelectItem value="retail_only">Retail Only</SelectItem>
                <SelectItem value="both">Both Services & Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Service Rules */}
      {showServices && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Label className="text-base">Service Rules</Label>
            <div className="space-y-2">
              <Label>Eligible Service Types</Label>
              <div className="flex flex-wrap gap-2">
                {BOOKABLE_SERVICE_TYPES.map((service) => (
                  <Badge
                    key={service}
                    variant={
                      serviceTypes.includes(service) ? "default" : "outline"
                    }
                    className="cursor-pointer capitalize"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleServiceType(service)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleServiceType(service);
                      }
                    }}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-service-amount">
                Minimum Service Amount ($)
              </Label>
              <Input
                id="min-service-amount"
                type="number"
                value={value.services?.minimumServiceAmount ?? ""}
                onChange={(e) => setMinimumServiceAmount(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retail Rules */}
      {showRetail && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Label className="text-base">Retail Rules</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="exclude-sale-items"
                checked={value.retail?.excludeSaleItems ?? false}
                onCheckedChange={setExcludeSaleItems}
              />
              <Label htmlFor="exclude-sale-items">Exclude Sale Items</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-purchase-amount">
                Minimum Purchase Amount ($)
              </Label>
              <Input
                id="min-purchase-amount"
                type="number"
                value={value.retail?.minimumPurchaseAmount ?? ""}
                onChange={(e) => setMinimumPurchaseAmount(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exclusions */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label className="text-base">Exclusions</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="exclude-discounted"
                checked={value.exclusions?.discountedItems ?? false}
                onCheckedChange={(checked) =>
                  setExclusion("discountedItems", checked)
                }
              />
              <Label htmlFor="exclude-discounted">Exclude Discounted Items</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="exclude-gift-cards"
                checked={value.exclusions?.giftCards ?? false}
                onCheckedChange={(checked) =>
                  setExclusion("giftCards", checked)
                }
              />
              <Label htmlFor="exclude-gift-cards">Exclude Gift Cards</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="exclude-packages"
                checked={value.exclusions?.packages ?? false}
                onCheckedChange={(checked) =>
                  setExclusion("packages", checked)
                }
              />
              <Label htmlFor="exclude-packages">Exclude Packages</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="exclude-memberships"
                checked={value.exclusions?.memberships ?? false}
                onCheckedChange={(checked) =>
                  setExclusion("memberships", checked)
                }
              />
              <Label htmlFor="exclude-memberships">Exclude Memberships</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
