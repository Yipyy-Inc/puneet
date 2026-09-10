"use client";

import { CreditCard, DollarSign, Percent } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PaymentPreferences } from "./types";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface PaymentPreferencesCardProps {
  paymentPreferences: PaymentPreferences;
  setPaymentPreferences: (prefs: PaymentPreferences) => void;
  isEditing: boolean;
}

export function PaymentPreferencesCard({
  paymentPreferences,
  setPaymentPreferences,
  isEditing,
}: PaymentPreferencesCardProps) {
  const { t } = useCustomerText("settings");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          {t("paymentPreferences")}
        </CardTitle>
        <CardDescription>{t("autoTipHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5 pr-4">
            <Label className="text-sm">{t("autoTipLabel")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("autoTipSwitchHint")}
            </p>
          </div>
          <Switch
            checked={paymentPreferences.enabled}
            onCheckedChange={(checked) =>
              setPaymentPreferences({
                ...paymentPreferences,
                enabled: checked,
              })
            }
            disabled={!isEditing}
          />
        </div>

        <div
          className={cn(
            "rounded-lg border p-4 transition-opacity",
            !paymentPreferences.enabled && "opacity-50",
          )}
        >
          <Label className="text-sm">{t("autoTipping")}</Label>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
            <Select
              value={paymentPreferences.type}
              onValueChange={(value) =>
                setPaymentPreferences({
                  ...paymentPreferences,
                  type: value as "percentage" | "fixed",
                })
              }
              disabled={!isEditing || !paymentPreferences.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t("byPercentage")}</SelectItem>
                <SelectItem value="fixed">{t("fixedAmount")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              {paymentPreferences.type === "fixed" && (
                <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              )}
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={paymentPreferences.type === "percentage" ? 1 : 0.5}
                value={paymentPreferences.value}
                onChange={(e) =>
                  setPaymentPreferences({
                    ...paymentPreferences,
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                disabled={!isEditing || !paymentPreferences.enabled}
                className={cn(
                  paymentPreferences.type === "fixed" ? "pr-12 pl-9" : "pr-9",
                )}
              />
              <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                {paymentPreferences.type === "percentage" ? (
                  <Percent className="size-4" />
                ) : (
                  "USD"
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
