"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getEstimateSettings,
  saveEstimateSettings,
} from "@/data/estimate-settings";
import type { EstimateSettings } from "@/types/estimate-settings";

export function EstimateDefaultsSettings() {
  const [settings, setSettings] = useState<EstimateSettings>(() =>
    getEstimateSettings(),
  );

  const set = (patch: Partial<EstimateSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    saveEstimateSettings(settings);
    toast.success("Estimate defaults saved");
  };

  const numberPreview = `${settings.estimateNumberPrefix}${"1".padStart(
    Math.max(1, settings.minDigits),
    "0",
  )}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          Estimate Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Expiry Period */}
        <div className="space-y-1.5">
          <Label className="text-xs">Default expiry period</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Estimates expire after
            </span>
            <Input
              type="number"
              min={1}
              max={365}
              value={settings.defaultExpiryDays}
              onChange={(e) =>
                set({ defaultExpiryDays: Number(e.target.value) })
              }
              className="h-8 w-20 text-sm"
            />
            <span className="text-muted-foreground text-xs">days</span>
          </div>
        </div>

        {/* Default Deposit Requirement */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">
              Require a deposit when a customer accepts an estimate?
            </Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Customers pay the deposit as part of accepting their estimate.
            </p>
          </div>
          <Switch
            checked={settings.acceptanceRequiresDeposit}
            onCheckedChange={(v) => set({ acceptanceRequiresDeposit: v })}
          />
        </div>

        {/* Estimate Number Format */}
        <div className="space-y-2">
          <Label className="text-xs">Estimate number format</Label>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px]">
                Prefix
              </Label>
              <Input
                value={settings.estimateNumberPrefix}
                onChange={(e) => set({ estimateNumberPrefix: e.target.value })}
                placeholder="E"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px]">
                Sequential digits
              </Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={settings.minDigits}
                onChange={(e) => set({ minDigits: Number(e.target.value) })}
                className="h-8 w-24 text-sm"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Next estimate will look like{" "}
            <span className="text-foreground font-mono font-medium">
              {numberPreview}
            </span>
            . The sequential number is generated automatically.
          </p>
        </div>

        {/* Expiry Warning Email */}
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Expiry warning email</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Remind the customer before their estimate expires.
              </p>
            </div>
            <Switch
              checked={settings.expiryWarningEnabled}
              onCheckedChange={(v) => set({ expiryWarningEnabled: v })}
            />
          </div>
          {settings.expiryWarningEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                Send warning
              </span>
              <Input
                type="number"
                min={1}
                max={168}
                value={settings.expiryWarningHoursBefore}
                onChange={(e) =>
                  set({ expiryWarningHoursBefore: Number(e.target.value) })
                }
                className="h-8 w-20 text-sm"
              />
              <span className="text-muted-foreground text-xs">
                hours before expiry
              </span>
            </div>
          )}
        </div>

        {/* Auto-Convert on Acceptance */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">Auto-convert on acceptance</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Automatically create a booking when a customer accepts and pays
              the deposit.
            </p>
          </div>
          <Switch
            checked={settings.autoConvertOnAccept}
            onCheckedChange={(v) => set({ autoConvertOnAccept: v })}
          />
        </div>

        {/* Magic Link Expiry */}
        <div className="space-y-1.5">
          <Label className="text-xs">Magic link expiry</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Account setup links expire after
            </span>
            <Input
              type="number"
              min={1}
              max={720}
              value={settings.magicLinkExpiryHours}
              onChange={(e) =>
                set({ magicLinkExpiryHours: Number(e.target.value) })
              }
              className="h-8 w-20 text-sm"
            />
            <span className="text-muted-foreground text-xs">hours</span>
          </div>
        </div>

        {/* Welcome Email */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">Welcome email</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Send a welcome email when an account is auto-created from an
              estimate.
            </p>
          </div>
          <Switch
            checked={settings.sendWelcomeEmail}
            onCheckedChange={(v) => set({ sendWelcomeEmail: v })}
          />
        </div>

        {/* Allow Customer Acceptance */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">Allow customer acceptance</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              When off, customers can view their estimate but can&apos;t accept
              it themselves.
            </p>
          </div>
          <Switch
            checked={settings.allowCustomerAcceptance}
            onCheckedChange={(v) => set({ allowCustomerAcceptance: v })}
          />
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Save className="size-4" />
          Save Estimate Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
