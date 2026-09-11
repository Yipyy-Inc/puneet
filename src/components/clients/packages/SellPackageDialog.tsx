"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import {
  usePurchasePackage,
  useServicePackages,
} from "@/lib/api/customer-packages";
import { formatMoney } from "@/lib/i18n/format";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Sell a package at the desk.
//
// A client could buy a package from their portal; staff could not sell one
// from the facility side at all — `usePurchasePackage` had one caller, the
// customer's own checkout. The sale is two writes, in order:
//
//   1. purchase_package (POST /api/packages/owned) — the client owns the
//      passes, at the catalogue price; financial_take_payment decides.
//   2. record_payment (POST /api/payments) — the money, in the tender the
//      staff member took, with the facility's own tax.
//
// Not one transaction: if the payment is refused after the passes were
// granted, the dialog says so plainly rather than pretend, and the passes
// show on the client file for someone to settle.
// ============================================================================

type Tender = "cash" | "terminal" | "e-transfer";

export function SellPackageDialog({
  open,
  onOpenChange,
  clientRef,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRef: number;
  clientName: string;
}) {
  const { t, fill, locale } = useStaffText("sellPackage");
  const queryClient = useQueryClient();
  const { data: catalogue } = useServicePackages();
  const { mutateAsync: purchase } = usePurchasePackage();
  const taxConfig = useFacilitySettings().settings.tax_config
    .value as TaxConfig;
  const [packageId, setPackageId] = useState("");
  const [tender, setTender] = useState<Tender>("cash");
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () => (catalogue ?? []).filter((p) => p.status === "active"),
    [catalogue],
  );
  const chosen = options.find((p) => p.id === packageId);
  const priceCents = Math.round((chosen?.packagePrice ?? 0) * 100);
  const taxCents = chosen ? computeTax(priceCents, taxConfig).totalCents : 0;
  const includesTax = taxConfig.pricesIncludeTax;
  const totalCents = includesTax ? priceCents : priceCents + taxCents;

  async function sell() {
    if (!chosen || saving) return;
    setSaving(true);
    try {
      await purchase({ clientId: clientRef, packageId: chosen.id });
    } catch (error) {
      toast.error(t("notSold"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setSaving(false);
      return;
    }
    const total = totalCents / 100;
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRef,
        method: tender,
        subtotal: (includesTax ? priceCents - taxCents : priceCents) / 100,
        tax: taxCents / 100,
        tip: 0,
        amountCharged: total,
        grandTotal: total,
        ...(tender === "cash" ? { cashReceived: total } : {}),
        serviceLabel: chosen.name,
        note: fill("paymentNote", { name: chosen.name }),
      }),
    });
    setSaving(false);
    void queryClient.invalidateQueries({ queryKey: ["payments"] });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(t("soldUnpaid"), { description: body?.error });
      onOpenChange(false);
      return;
    }
    toast.success(
      fill("sold", {
        name: chosen.name,
        client: clientName,
        total: formatMoney(total, locale),
      }),
    );
    setPackageId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fill("title", { client: clientName })}</DialogTitle>
          <DialogDescription>{t("intro")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("package")}</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue placeholder={t("pickPackage")} />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    {t("noPackages")}
                  </div>
                ) : (
                  options.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatMoney(p.packagePrice, locale)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("tender")}</Label>
            <Select
              value={tender}
              onValueChange={(v) => setTender(v as Tender)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("cash")}</SelectItem>
                <SelectItem value="terminal">{t("terminal")}</SelectItem>
                <SelectItem value="e-transfer">{t("eTransfer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {chosen && (
            <dl className="grid grid-cols-2 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">{t("price")}</dt>
              <dd className="text-right">
                {formatMoney(chosen.packagePrice, locale)}
              </dd>
              <dt className="text-muted-foreground">
                {includesTax ? t("taxIncluded") : t("tax")}
              </dt>
              <dd className="text-right">
                {formatMoney(taxCents / 100, locale)}
              </dd>
              <dt className="font-semibold">{t("total")}</dt>
              <dd className="text-right font-semibold">
                {formatMoney(totalCents / 100, locale)}
              </dd>
            </dl>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void sell()} disabled={!chosen || saving}>
            {chosen
              ? fill("sellNamed", {
                  total: formatMoney(totalCents / 100, locale),
                })
              : t("sell")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
