"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  Globe,
  CreditCard,
  Wallet,
  Shield,
  Palette,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { giftCardSettings } from "@/data/gift-cards";

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

export function GiftCardSettingsPanel({ facilityId }: GiftCardSettingsPanelProps) {
  const settings = giftCardSettings.find((s) => s.facilityId === facilityId);

  const [digitalEnabled, setDigitalEnabled] = useState(settings?.digitalEnabled ?? true);
  const [physicalEnabled, setPhysicalEnabled] = useState(settings?.physicalEnabled ?? true);
  const [expiryEnabled, setExpiryEnabled] = useState(settings?.expiryEnabled ?? true);
  const [expiryDays, setExpiryDays] = useState(settings?.expiryDays ?? 365);
  const [partialRedemption, setPartialRedemption] = useState(settings?.partialRedemptionAllowed ?? true);
  const [pinThreshold, setPinThreshold] = useState(settings?.pinRequiredAbove ?? 200);
  const [multiLocation, setMultiLocation] = useState(settings?.multiLocationRedemption ?? false);
  const [refundsAllowed, setRefundsAllowed] = useState(settings?.refundsAllowed ?? true);
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
  const [primaryColor, setPrimaryColor] = useState(settings?.emailBranding.primaryColor ?? "#7C3AED");
  const [footerText, setFooterText] = useState(settings?.emailBranding.footerText ?? "");
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
          <CardDescription>Enable which gift card formats your facility offers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Digital Gift Cards</Label>
              <p className="text-muted-foreground text-xs">
                Customers purchase online and receive a branded email
              </p>
            </div>
            <Switch checked={digitalEnabled} onCheckedChange={setDigitalEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Physical Gift Cards</Label>
              <p className="text-muted-foreground text-xs">
                Staff activates pre-printed cards at POS
              </p>
            </div>
            <Switch checked={physicalEnabled} onCheckedChange={setPhysicalEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Redemption rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            Redemption Rules
          </CardTitle>
          <CardDescription>Control how and when gift cards can be redeemed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Partial Redemption</Label>
              <p className="text-muted-foreground text-xs">
                Allow customers to redeem only part of a card balance
              </p>
            </div>
            <Switch checked={partialRedemption} onCheckedChange={setPartialRedemption} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Multi-Location Redemption</Label>
              <p className="text-muted-foreground text-xs">
                Allow cards issued here to be redeemed at group locations
              </p>
            </div>
            <Switch checked={multiLocation} onCheckedChange={setMultiLocation} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Allow Refunds</Label>
              <p className="text-muted-foreground text-xs">
                Staff can void and refund unsused gift cards
              </p>
            </div>
            <Switch checked={refundsAllowed} onCheckedChange={setRefundsAllowed} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Card Expiry</Label>
              <p className="text-muted-foreground text-xs">
                Gift cards expire after the set number of days
              </p>
            </div>
            <Switch checked={expiryEnabled} onCheckedChange={setExpiryEnabled} />
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
              <span className="text-muted-foreground text-sm">days after issue</span>
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
          <CardDescription>PIN requirement for high-value card redemptions</CardDescription>
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
            Choose which services customers can pay for using their wallet balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICE_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer font-normal">{label}</Label>
                  {!walletRules[key] && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
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

      {/* Email branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" />
            Email Branding
          </CardTitle>
          <CardDescription>
            Customize the gift card delivery email with your facility&apos;s look
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="size-10 cursor-pointer rounded-lg border p-0.5"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
              <div
                className="h-8 w-16 rounded-md"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email Footer Text</Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Thank you for choosing us — where every tail tells a happy story."
            />
          </div>

          {/* Preview */}
          <div
            className="rounded-xl border p-4 text-sm"
            style={{ borderColor: primaryColor + "40" }}
          >
            <div
              className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Globe className="size-4" />
              <span className="font-semibold">Email Preview</span>
            </div>
            <div className="space-y-1 text-center">
              <p className="font-bold" style={{ color: primaryColor }}>
                You&apos;ve received a Gift Card! 🎁
              </p>
              <p className="text-muted-foreground text-xs">Your balance: $100.00</p>
              <p className="text-muted-foreground mt-3 text-xs italic">
                {footerText || "Footer text will appear here"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
