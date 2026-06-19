"use client";

import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomServiceModule,
  CustomServiceBillingTrigger,
  CustomServicePaymentMethod,
  CustomServicePackage,
} from "@/types/facility";
import { cn } from "@/lib/utils";

type PricingConfig = CustomServiceModule["pricing"];

const BILLING_TRIGGERS: {
  value: CustomServiceBillingTrigger;
  label: string;
}[] = [
  { value: "at_booking", label: "At Booking (charge immediately)" },
  { value: "at_check_in", label: "At Check-In" },
  { value: "at_check_out", label: "At Check-Out" },
  { value: "invoice_after", label: "Invoice After Service" },
  { value: "deposit_balance", label: "Deposit Now + Balance at Check-Out" },
];

const PAYMENT_METHODS: {
  value: CustomServicePaymentMethod;
  label: string;
}[] = [
  { value: "card", label: "Credit/Debit Card (via Stripe)" },
  { value: "cash", label: "Cash" },
  { value: "gift_card", label: "Gift Card" },
  { value: "wallet", label: "Wallet" },
  { value: "package_credits", label: "Package Credits" },
];

interface PricingBillingOptionsProps {
  pricing: PricingConfig;
  onChange: (updates: Partial<PricingConfig>) => void;
}

export function PricingBillingOptions({
  pricing,
  onChange,
}: PricingBillingOptionsProps) {
  const packagePricing = pricing.packagePricing ?? {
    enabled: false,
    packages: [],
  };
  const paymentMethods = pricing.paymentMethods ?? [];

  const addPackage = () => {
    // Lint-safe unique id without Date.now()/Math.random().
    const nextNum =
      packagePricing.packages.reduce((max, p) => {
        const n = parseInt(p.id.replace("pkg-", ""), 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;
    const pkg: CustomServicePackage = {
      id: `pkg-${nextNum}`,
      name: "",
      sessions: 10,
      price: 0,
    };
    onChange({
      packagePricing: {
        ...packagePricing,
        packages: [...packagePricing.packages, pkg],
      },
    });
  };

  const updatePackage = (
    id: string,
    updates: Partial<CustomServicePackage>,
  ) => {
    onChange({
      packagePricing: {
        ...packagePricing,
        packages: packagePricing.packages.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      },
    });
  };

  const removePackage = (id: string) => {
    onChange({
      packagePricing: {
        ...packagePricing,
        packages: packagePricing.packages.filter((p) => p.id !== id),
      },
    });
  };

  const toggleMethod = (method: CustomServicePaymentMethod) => {
    onChange({
      paymentMethods: paymentMethods.includes(method)
        ? paymentMethods.filter((m) => m !== method)
        : [...paymentMethods, method],
    });
  };

  return (
    <>
      {/* Billing Trigger */}
      <div className="space-y-1.5">
        <Label htmlFor="billing-trigger" className="text-sm font-semibold">
          Billing Trigger
        </Label>
        <p className="text-muted-foreground text-xs">
          When payment is collected for this service.
        </p>
        <Select
          value={pricing.billingTrigger ?? "at_booking"}
          onValueChange={(v) =>
            onChange({ billingTrigger: v as CustomServiceBillingTrigger })
          }
        >
          <SelectTrigger id="billing-trigger" className="w-full sm:w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BILLING_TRIGGERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Package / Bundle Pricing */}
      <div className="space-y-3">
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="package-pricing"
              className="cursor-pointer text-sm font-medium"
            >
              Package / Bundle Pricing
            </Label>
            <p className="text-muted-foreground text-xs">
              Sell multi-session packages (e.g. a 10-session pool pass). They
              appear as purchasable options on the client portal.
            </p>
          </div>
          <Switch
            id="package-pricing"
            checked={packagePricing.enabled}
            onCheckedChange={(enabled) =>
              onChange({ packagePricing: { ...packagePricing, enabled } })
            }
          />
        </div>

        {packagePricing.enabled && (
          <div className="space-y-2">
            {packagePricing.packages.map((pkg) => (
              <div key={pkg.id} className="flex flex-wrap items-center gap-2">
                <Input
                  value={pkg.name}
                  onChange={(e) =>
                    updatePackage(pkg.id, { name: e.target.value })
                  }
                  placeholder="Package name (e.g. 10-Session Pool Pass)"
                  className="min-w-48 flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  value={pkg.sessions}
                  onChange={(e) =>
                    updatePackage(pkg.id, {
                      sessions: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-24"
                  placeholder="10"
                />
                <span className="text-muted-foreground shrink-0 text-xs">
                  sessions
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={pkg.price}
                  onChange={(e) =>
                    updatePackage(pkg.id, {
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-28"
                  placeholder="150.00"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removePackage(pkg.id)}
                >
                  <Trash2 className="text-destructive size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPackage}
            >
              <Plus className="size-3.5" />
              Add Package
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Payment Methods */}
      <div className="space-y-2">
        <div>
          <Label className="text-sm font-semibold">
            Payment Methods Accepted
          </Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Unchecked methods are not offered at checkout for this service.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_METHODS.map((method) => {
            const checked = paymentMethods.includes(method.value);
            return (
              <label
                key={method.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/30",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleMethod(method.value)}
                />
                <span className="text-sm font-medium">{method.label}</span>
              </label>
            );
          })}
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <span>
            All payments flow through Yipyy&apos;s payment infrastructure
            (Stripe). The Billing Trigger controls <strong>when</strong> the
            charge fires; the method is always platform-managed — no payment
            collection happens outside the platform.
          </span>
        </div>
      </div>
    </>
  );
}
