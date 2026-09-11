"use client";

import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatMoney } from "@/lib/i18n/format";
import { useState } from "react";
import { CreditCard, Banknote, Smartphone, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { DepositRule } from "@/types/deposit-rules";
import { computeDepositAmount } from "@/lib/settings/deposits";

export interface DepositPromptValue {
  collectNow: boolean;
  amount: number;
  method: "card" | "cash" | "terminal";
  ruleLabel: string;
  required: number;
}

interface BookingDepositPromptProps {
  rule: DepositRule;
  bookingTotal: number;
  value: DepositPromptValue;
  onChange: (value: DepositPromptValue) => void;
}

const METHODS = [
  { value: "card" as const, labelKey: "methodCardOnFile", Icon: CreditCard },
  { value: "cash" as const, labelKey: "methodCash", Icon: Banknote },
  { value: "terminal" as const, labelKey: "methodTerminal", Icon: Smartphone },
];

export function BookingDepositPrompt({
  rule,
  bookingTotal,
  value,
  onChange,
}: BookingDepositPromptProps) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const required = computeDepositAmount(rule, bookingTotal);
  const [customMode, setCustomMode] = useState(false);

  return (
    <div className="mx-1 mb-4 overflow-hidden rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-100/40">
      <div className="border-border flex items-start gap-3 border-b bg-white/60 px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <ShieldCheck className="size-4.5 text-emerald-700" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-emerald-950">
              {t("depositRequired")}
            </p>
            <Badge
              variant="outline"
              className="border-emerald-300 bg-white text-[10px] font-medium text-emerald-800"
            >
              {rule.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-800/80">
            {t("depositRuleBefore")}{" "}
            <span className="font-semibold tabular-nums">
              {formatMoney(required, locale)}
            </span>{" "}
            {t("depositRuleAfter")}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-950">
              {t("collectDepositNow")}
            </p>
            <p className="text-[11px] text-emerald-800/70">
              {t("collectDepositHelp")}
            </p>
          </div>
          <Switch
            checked={value.collectNow}
            onCheckedChange={(checked) =>
              onChange({
                ...value,
                collectNow: checked,
                amount: checked ? value.amount || required : 0,
              })
            }
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>

        {value.collectNow && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200/80 bg-white px-3 py-2">
              <span className="text-[10px] font-semibold tracking-wider text-emerald-900/70 uppercase">
                {t("amount")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  onChange({ ...value, amount: required });
                }}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  !customMode
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-transparent text-emerald-900/70 hover:bg-emerald-50",
                )}
              >
                {t("useRule").replace(
                  "{amount}",
                  formatMoney(required, locale),
                )}
              </button>
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  customMode
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-transparent text-emerald-900/70 hover:bg-emerald-50",
                )}
              >
                {t("custom")}
              </button>
              {customMode && (
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={value.amount}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="ml-auto h-7 w-24 text-right tabular-nums"
                  placeholder="0.00"
                />
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-emerald-900/70 uppercase">
                {t("paymentMethod")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map(({ value: m, labelKey, Icon }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ ...value, method: m })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border bg-white px-2 py-2 text-[11px] font-medium transition-all",
                      value.method === m
                        ? "border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                        : "border-emerald-200/70 text-emerald-900/70 hover:bg-emerald-50",
                    )}
                  >
                    <Icon className="size-4" />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
