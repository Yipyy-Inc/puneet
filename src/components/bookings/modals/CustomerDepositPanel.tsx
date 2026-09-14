"use client";

import { ShieldCheck } from "lucide-react";

import { formatMoney } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { DepositRule } from "@/types/deposit-rules";

export interface CustomerDepositPanelProps {
  rule: DepositRule;
  depositAmount: number;
}

/**
 * What a customer is told about a deposit on the confirm step.
 *
 * It used to make them pick a card on file — or type one in, which invented a
 * card in the browser — before they could send the request. Nothing read the
 * choice: the server charged no card, and a customer's booking arrives with no
 * price until the facility quotes it (private.enforce_booking_integrity). So
 * the panel says what happens and asks for nothing.
 */
export function CustomerDepositPanel({
  rule,
  depositAmount,
}: CustomerDepositPanelProps) {
  const t = useShellText("booking");
  const locale = useShellLocale();

  return (
    <div className="bg-card flex items-start gap-3 rounded-2xl border p-4">
      <ShieldCheck
        className="mt-0.5 size-5 shrink-0 text-amber-700"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t("depositRequired")}</p>
        <p className="text-muted-foreground text-sm">
          {t("depositOnConfirm")
            .replace("{rule}", rule.label)
            .replace("{amount}", formatMoney(depositAmount, locale))}
        </p>
      </div>
    </div>
  );
}
