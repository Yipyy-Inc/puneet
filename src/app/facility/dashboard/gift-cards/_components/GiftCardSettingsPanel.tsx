"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  Save,
  CreditCard,
  Wallet,
  Shield,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { giftCardSettings } from "@/data/gift-cards";
import { getLocationsByFacility } from "@/data/locations";
import { EmailBrandingCard } from "./EmailBrandingCard";

const SERVICE_TOGGLES = [
  { key: "boarding", label: "Boarding" },
  { key: "daycare", label: "Daycare" },
  { key: "grooming", label: "Grooming" },
  { key: "training", label: "Training" },
  { key: "retail", label: "Retail / POS" },
  { key: "packages", label: "Packages & Memberships" },
  { key: "deposits", label: "Deposits" },
  { key: "addons", label: "Add-Ons" },
  { key: "tips", label: "Tips" },
] as const;

interface GiftCardSettingsPanelProps {
  facilityId: number;
}

export function GiftCardSettingsPanel({
  facilityId,
}: GiftCardSettingsPanelProps) {
  const settings = giftCardSettings.find((s) => s.facilityId === facilityId);
  const facilityLocations = getLocationsByFacility(facilityId);
  const isMultiLocation = facilityLocations.length > 1;
  const brandName =
    facilityLocations
      .find((l) => l.isPrimary)
      ?.name.split(/[–-]/)[0]
      .trim() ?? "Your Facility";

  const [digitalEnabled, setDigitalEnabled] = useState(
    settings?.digitalEnabled ?? true,
  );
  const [physicalEnabled, setPhysicalEnabled] = useState(
    settings?.physicalEnabled ?? true,
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    settings?.lowStockThreshold ?? 50,
  );
  const [expiryEnabled, setExpiryEnabled] = useState(
    settings?.expiryEnabled ?? false,
  );
  const [expiryDays, setExpiryDays] = useState(settings?.expiryDays ?? 365);
  const [partialRedemption, setPartialRedemption] = useState(
    settings?.partialRedemptionAllowed ?? true,
  );
  const [pinThreshold, setPinThreshold] = useState(
    settings?.pinRequiredAbove ?? 200,
  );
  const [redemptionScope, setRedemptionScope] = useState(
    settings?.redemptionLocationScope ?? "this_location",
  );
  const [redemptionLocationIds, setRedemptionLocationIds] = useState<string[]>(
    settings?.redemptionLocationIds ?? facilityLocations.map((l) => l.id),
  );

  const toggleRedemptionLocation = (id: string) => {
    setRedemptionLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const [refundToGiftCard, setRefundToGiftCard] = useState(
    settings?.refundToGiftCard ?? true,
  );
  const [allowCancellation, setAllowCancellation] = useState(
    settings?.allowGiftCardCancellation ?? true,
  );
  const [walletRules, setWalletRules] = useState(
    settings?.walletUsageRules ?? {
      boarding: true,
      daycare: true,
      grooming: true,
      training: true,
      retail: true,
      packages: true,
      deposits: true,
      addons: true,
      tips: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleWalletRule = (key: keyof typeof walletRules) => {
    setWalletRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Card types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Card Types
          </CardTitle>
          <CardDescription>
            Enable which gift card formats your facility offers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Digital Gift Cards</Label>
              <p className="text-muted-foreground text-xs">
                Customers purchase online and receive a branded email
              </p>
            </div>
            <Switch
              checked={digitalEnabled}
              onCheckedChange={setDigitalEnabled}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Physical Gift Cards</Label>
              <p className="text-muted-foreground text-xs">
                Staff activates pre-printed cards at POS
              </p>
            </div>
            <Switch
              checked={physicalEnabled}
              onCheckedChange={setPhysicalEnabled}
            />
          </div>
          {physicalEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="font-medium">Low-Stock Warning</Label>
                <p className="text-muted-foreground text-xs">
                  Show an amber alert on the dashboard when available blank
                  cards fall below this count
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={lowStockThreshold}
                    onChange={(e) =>
                      setLowStockThreshold(parseInt(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">
                    cards remaining
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Redemption rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            Redemption Rules
          </CardTitle>
          <CardDescription>
            Control how and when gift cards can be redeemed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Partial Redemption</Label>
              <p className="text-muted-foreground text-xs">
                Allow customers to redeem only part of a card balance
              </p>
            </div>
            <Switch
              checked={partialRedemption}
              onCheckedChange={setPartialRedemption}
            />
          </div>
          {isMultiLocation && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label className="font-medium">
                    Multi-Location Redemption
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Choose where gift cards issued here can be redeemed
                  </p>
                </div>
                <RadioGroup
                  value={redemptionScope}
                  onValueChange={(v) =>
                    setRedemptionScope(
                      v as "this_location" | "all_locations" | "selected",
                    )
                  }
                >
                  <label
                    htmlFor="redeem-this"
                    data-active={redemptionScope === "this_location"}
                    className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <RadioGroupItem
                      value="this_location"
                      id="redeem-this"
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">This location only</p>
                      <p className="text-muted-foreground text-xs">
                        A card issued here can only be redeemed at this
                        location.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="redeem-all"
                    data-active={redemptionScope === "all_locations"}
                    className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <RadioGroupItem
                      value="all_locations"
                      id="redeem-all"
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">All my locations</p>
                      <p className="text-muted-foreground text-xs">
                        Cards can be redeemed at any of your{" "}
                        {facilityLocations.length} locations.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="redeem-selected"
                    data-active={redemptionScope === "selected"}
                    className="data-[active=true]:border-primary data-[active=true]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <RadioGroupItem
                      value="selected"
                      id="redeem-selected"
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          Selected locations
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Choose which locations can redeem these cards.
                        </p>
                      </div>
                      {redemptionScope === "selected" && (
                        <div className="bg-background space-y-1.5 rounded-md border p-3">
                          {facilityLocations.map((loc) => (
                            <label
                              key={loc.id}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={redemptionLocationIds.includes(loc.id)}
                                onCheckedChange={() =>
                                  toggleRedemptionLocation(loc.id)
                                }
                              />
                              <span>{loc.name}</span>
                              {loc.isPrimary && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Primary
                                </Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <Label className="font-medium">Refund to Gift Card</Label>
              <p className="text-muted-foreground text-xs">
                When a service is refunded, staff can issue the refund as gift
                card credit instead of back to the original payment.
              </p>
            </div>
            <Switch
              checked={refundToGiftCard}
              onCheckedChange={setRefundToGiftCard}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <Label className="font-medium">
                Allow Gift Card Cancellation
              </Label>
              <p className="text-muted-foreground text-xs">
                A customer can request a refund of an unused gift card for cash.
              </p>
            </div>
            <Switch
              checked={allowCancellation}
              onCheckedChange={setAllowCancellation}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <Label className="flex items-center gap-1.5 font-medium">
                Set card expiry
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Info className="size-3.5" />
                      <span className="sr-only">Expiry regulation note</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Check your local consumer protection regulations regarding
                    gift card expiry dates.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-muted-foreground text-xs">
                {expiryEnabled
                  ? "Gift cards expire after the set number of days"
                  : "Cards do not expire."}
              </p>
            </div>
            <Switch
              checked={expiryEnabled}
              onCheckedChange={setExpiryEnabled}
            />
          </div>
          {expiryEnabled && (
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={30}
                max={1825}
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 365)}
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                days after issue
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4" />
            Security
          </CardTitle>
          <CardDescription>
            PIN requirement for high-value card redemptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Require PIN for cards above</Label>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">$</span>
            <Input
              type="number"
              min={50}
              max={500}
              step={25}
              value={pinThreshold}
              onChange={(e) => setPinThreshold(parseInt(e.target.value) || 200)}
              className="w-24"
            />
            <span className="text-muted-foreground text-sm">
              Cards above this value require a PIN to redeem
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Wallet usage rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" />
            Wallet Usage Rules
          </CardTitle>
          <CardDescription>
            Choose which services customers can pay for using their wallet
            balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICE_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer font-normal">{label}</Label>
                  {!walletRules[key] && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground text-xs"
                    >
                      Off
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={walletRules[key]}
                  onCheckedChange={() => toggleWalletRule(key)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <EmailBrandingCard
        brandName={brandName}
        branding={settings?.emailBranding}
        customDesign={settings?.customCardDesign}
      />

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="mr-2 size-4 text-green-400" />
            Saved!
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
