"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHydrated } from "@/hooks/use-hydrated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Target,
  Layers,
  Settings2,
  Hourglass,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  XCircle,
  TrendingDown,
  BadgePercent,
  Coins,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpirationEditor } from "@/components/loyalty/config/ExpirationEditor";
import { ScopeEditor } from "@/components/loyalty/config/ScopeEditor";
import { StackingEditor } from "@/components/loyalty/config/StackingEditor";
import { GeneralSettingsEditor } from "@/components/loyalty/config/GeneralSettingsEditor";
import {
  PointsExpiryEditor,
  type PointsExpiryValue,
} from "@/components/loyalty/config/PointsExpiryEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { summarizeExpiry } from "@/lib/loyalty/points-expiry";
import type {
  PointsExpirationConfig,
  PointsScopeConfig,
  DiscountStackingConfig,
  FacilityLoyaltyConfig,
} from "@/types/loyalty";

// Captured once at module load; only used for the client-side expiry preview
// (gated behind hydration), so it never affects server-rendered markup.
const NOW_ISO = new Date().toISOString();

export default function AdvancedPage() {
  const { config, updateConfig, facilityId } = useLoyaltyProgram();
  const { data: accounts = [] } = useQuery(loyaltyQueries.accounts(facilityId));

  const [expiry, setExpiry] = useState<PointsExpiryValue>(() => ({
    enabled: config.pointsExpiryEnabled ?? false,
    days: config.pointsExpiryDays ?? 365,
  }));
  const [expiration, setExpiration] = useState<PointsExpirationConfig>(
    () => config.pointsExpiration,
  );
  const [scope, setScope] = useState<PointsScopeConfig>(
    () => config.pointsScope,
  );
  const [stacking, setStacking] = useState<DiscountStackingConfig>(
    () => config.discountStacking,
  );
  const [settings, setSettings] = useState<FacilityLoyaltyConfig["settings"]>(
    () => config.settings,
  );
  const [tierDowngrade, setTierDowngrade] = useState<boolean>(
    () => config.tierDowngradeEnabled ?? false,
  );
  const [discountStrategy, setDiscountStrategy] = useState<
    "highest_value" | "most_specific"
  >(() => config.discountSelectionStrategy ?? "highest_value");
  const [redemptionRate, setRedemptionRate] = useState<number>(
    () => config.redemptionRate ?? 100,
  );
  const [showAdvancedExpiry, setShowAdvancedExpiry] = useState(false);

  // Gate the preview behind hydration so SSR and first client render match.
  const hydrated = useHydrated();
  const preview =
    hydrated && expiry.enabled
      ? summarizeExpiry(accounts, expiry.enabled, expiry.days, NOW_ISO)
      : null;

  const dirty =
    expiry.enabled !== (config.pointsExpiryEnabled ?? false) ||
    expiry.days !== (config.pointsExpiryDays ?? 365) ||
    JSON.stringify(expiration) !== JSON.stringify(config.pointsExpiration) ||
    JSON.stringify(scope) !== JSON.stringify(config.pointsScope) ||
    JSON.stringify(stacking) !== JSON.stringify(config.discountStacking) ||
    JSON.stringify(settings) !== JSON.stringify(config.settings) ||
    tierDowngrade !== (config.tierDowngradeEnabled ?? false) ||
    discountStrategy !==
      (config.discountSelectionStrategy ?? "highest_value") ||
    redemptionRate !== (config.redemptionRate ?? 100);

  const handleReset = () => {
    setExpiry({
      enabled: config.pointsExpiryEnabled ?? false,
      days: config.pointsExpiryDays ?? 365,
    });
    setExpiration(config.pointsExpiration);
    setScope(config.pointsScope);
    setStacking(config.discountStacking);
    setSettings(config.settings);
    setTierDowngrade(config.tierDowngradeEnabled ?? false);
    setDiscountStrategy(config.discountSelectionStrategy ?? "highest_value");
    setRedemptionRate(config.redemptionRate ?? 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Advanced</h2>
        <p className="text-muted-foreground text-sm">
          Points expiry, earning scope, discount stacking, and general
          redemption settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-violet-500" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GeneralSettingsEditor value={settings} onChange={setSettings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hourglass className="size-5 text-amber-500" />
            Points Expiry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PointsExpiryEditor value={expiry} onChange={setExpiry} />

          {preview && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <XCircle className="size-4 text-red-500" />
                <span>
                  <span className="font-semibold tabular-nums">
                    {preview.wouldExpire}
                  </span>{" "}
                  member{preview.wouldExpire === 1 ? "" : "s"} would expire
                  today
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <AlertTriangle className="size-4 text-amber-500" />
                <span>
                  <span className="font-semibold tabular-nums">
                    {preview.inWarningWindow}
                  </span>{" "}
                  in the 30-day warning window
                </span>
              </div>
            </div>
          )}

          {/* Advanced expiration rules (rich, legacy) */}
          <div className="rounded-lg border">
            <button
              type="button"
              onClick={() => setShowAdvancedExpiry((s) => !s)}
              className="hover:bg-muted/40 flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors"
            >
              {showAdvancedExpiry ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              Advanced expiration rules
              <span className="text-muted-foreground ml-auto text-xs font-normal">
                Time / activity / tier-based policies
              </span>
            </button>
            {showAdvancedExpiry && (
              <div className="border-t p-4">
                <ExpirationEditor value={expiration} onChange={setExpiration} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-emerald-500" />
            Earning Scope
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScopeEditor value={scope} onChange={setScope} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-5 text-indigo-500" />
            Discount Stacking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StackingEditor value={stacking} onChange={setStacking} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="size-5 text-rose-500" />
            Tiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="tier-downgrade">Allow tier downgrades</Label>
              <p className="text-muted-foreground text-sm">
                When off (default), members keep the highest tier they&apos;ve
                earned even if their points, spend, or visits later fall below
                the threshold — for example after you raise a tier&apos;s
                requirement. Turn on to let a member&apos;s tier drop when their
                metric falls.
              </p>
            </div>
            <Switch
              id="tier-downgrade"
              checked={tierDowngrade}
              onCheckedChange={setTierDowngrade}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgePercent className="size-5 text-emerald-500" />
            Loyalty Discount Vouchers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>
              When a customer holds multiple active discount vouchers
            </Label>
            <p className="text-muted-foreground text-sm">
              Only one loyalty discount is auto-applied per invoice at checkout.
              Choose which voucher wins.
            </p>
            <Select
              value={discountStrategy}
              onValueChange={(v) =>
                setDiscountStrategy(v as "highest_value" | "most_specific")
              }
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="highest_value">
                  Highest value — biggest discount
                </SelectItem>
                <SelectItem value="most_specific">
                  Most specific — prefer a service-matched voucher
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-5 text-amber-500" />
            Points Redemption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="redemption-rate">Points per $1 of credit</Label>
            <p className="text-muted-foreground text-sm">
              How many points a customer spends for $1 of account credit when
              they self-redeem from the portal (e.g. 100 → 100 points = $1).
            </p>
            <Input
              id="redemption-rate"
              type="number"
              min={1}
              step={1}
              value={redemptionRate}
              onChange={(e) =>
                setRedemptionRate(
                  Math.max(1, Math.floor(Number(e.target.value) || 0)),
                )
              }
              className="max-w-37 tabular-nums"
            />
            <p className="text-muted-foreground text-xs">
              100 points ={" "}
              <span className="font-medium tabular-nums">
                ${(100 / (redemptionRate || 100)).toFixed(2)}
              </span>{" "}
              credit
            </p>
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateConfig({
            ...config,
            pointsExpiryEnabled: expiry.enabled,
            pointsExpiryDays: expiry.days,
            pointsExpiration: expiration,
            pointsScope: scope,
            discountStacking: stacking,
            settings,
            tierDowngradeEnabled: tierDowngrade,
            discountSelectionStrategy: discountStrategy,
            redemptionRate,
          });
          toast.success("Advanced settings saved");
        }}
        onReset={handleReset}
      />
    </div>
  );
}
