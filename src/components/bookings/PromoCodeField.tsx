"use client";

import { useState } from "react";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PromoCodeRefused, useApplyPromoCode } from "@/lib/api/promo-codes";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// A promo code at the booking checkout.
//
// Nothing on a checkout took a code. This puts one on the bill BEFORE the
// money moves, through redeem_promo_code: the database decides whether the
// code applies and writes the negative line and the use together, so the
// amount due above comes down on the refetch and every tender — the terminal
// included, which charges `amount_due` server-side — charges the discounted
// bill. A refusal says why, in the viewer's language.
// ============================================================================

export function PromoCodeField({ bookingRef }: { bookingRef: number }) {
  const { t, fill, locale } = useStaffText("promoCodes");
  const apply = useApplyPromoCode();
  const [code, setCode] = useState("");

  const submit = () => {
    const entered = code.trim();
    if (!entered || apply.isPending) return;
    apply.mutate(
      { bookingRef, code: entered },
      {
        onSuccess: (result) => {
          toast.success(
            fill("appliedToBill", {
              code: result.code,
              amount: formatMoney(Number(result.amount), locale),
            }),
          );
          setCode("");
        },
        onError: (error) => {
          const reason =
            error instanceof PromoCodeRefused ? error.reason : null;
          const said = reason ? t(reason) : "";
          toast.error(t("notApplied"), {
            // An unknown reason key comes back as itself; show the
            // database's own sentence instead of a key.
            description:
              said && said !== reason
                ? said
                : error instanceof Error
                  ? error.message
                  : undefined,
          });
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="checkout-promo-code">{t("promoLabel")}</Label>
      <div className="flex gap-2">
        <Input
          id="checkout-promo-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="font-mono"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          onClick={submit}
          disabled={!code.trim() || apply.isPending}
        >
          {apply.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Tag className="mr-2 size-4" />
          )}
          {t("applyCode")}
        </Button>
      </div>
    </div>
  );
}
