"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStaffText } from "@/lib/staff/use-staff-text";

/**
 * Add a fee to the sale on the till — a line of its own, with no product.
 *
 * The till's "Add fee" button used to call only toast.success("Fee added to
 * cart"), and nothing reached the cart. Nothing new was needed underneath it:
 * `record_retail_sale` already takes a line with no productId (it just skips
 * the stock movement), and the add-to-booking path already skips product-less
 * lines. What was missing was a way to make one.
 *
 * A fee is TAXED like a product. The till's tax pass exempts a line only when a
 * real product says it is exempt, and a line with no product says nothing. That
 * is the safe default: most fees attract GST/QST, and an untaxed fee
 * under-collects tax, which is the more expensive mistake to find later.
 *
 * The amount is checked here, not by `min` / `step`. Those are HTML attributes
 * and stop nobody typing — which is how the cart discount beside this button
 * could be given 150% and -$50.
 */
export function AddFeeDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (fee: { label: string; amount: number }) => void;
}) {
  const { t } = useStaffText("retailStore");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const value = Number(amount);
  const valid = label.trim().length > 0 && Number.isFinite(value) && value > 0;

  const close = (next: boolean) => {
    if (!next) {
      setLabel("");
      setAmount("");
    }
    onOpenChange(next);
  };

  const add = () => {
    if (!valid) return;
    onAdd({ label: label.trim(), amount: Math.round(value * 100) / 100 });
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("feeTitle")}</DialogTitle>
          <DialogDescription>{t("feeDescription")}</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="retail-fee-label">{t("feeLabel")}</Label>
            <Input
              id="retail-fee-label"
              value={label}
              maxLength={80}
              placeholder={t("feeLabelPlaceholder")}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="retail-fee-amount">{t("feeAmount")}</Label>
            <Input
              id="retail-fee-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
            >
              {t("feeCancel")}
            </Button>
            <Button type="submit" disabled={!valid}>
              {t("feeAdd")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
