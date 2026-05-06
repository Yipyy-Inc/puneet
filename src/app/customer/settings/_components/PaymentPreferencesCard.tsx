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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-5" />
          Payment Preferences
        </CardTitle>
        <CardDescription>
          Set a default tip to apply automatically when a card on file is
          charged. Skips the tip prompt at checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5 pr-4">
            <Label className="text-sm">
              Apply the tip to my account automatically when processing the
              payment
            </Label>
            <p className="text-muted-foreground text-xs">
              When enabled, the tip below is added to every payment without
              showing a prompt.
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
          <Label className="text-sm">Auto tipping</Label>
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
                <SelectItem value="percentage">By percentage</SelectItem>
                <SelectItem value="fixed">Fixed amount</SelectItem>
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
                    value:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                disabled={!isEditing || !paymentPreferences.enabled}
                className={cn(
                  paymentPreferences.type === "fixed"
                    ? "pl-9 pr-12"
                    : "pr-9",
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
