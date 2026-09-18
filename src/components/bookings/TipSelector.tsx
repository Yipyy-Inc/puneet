"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TipConfig } from "@/types/facility";
import { activeTipTier, roundUpTip } from "@/lib/tips";
import { formatMoney, formatPercent } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

// Chosen is a 2px ring, never a tint (§6 rules 1 and 2).
const CHOSEN =
  "border-primary text-primary shadow-[inset_0_0_0_2px_var(--primary)]";

interface TipSelectorProps {
  tipConfig: TipConfig;
  subtotal: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
  /** Optional wrapper class */
  className?: string;
}

export function TipSelector({
  tipConfig,
  subtotal,
  tipAmount,
  onTipChange,
  className,
}: TipSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  // Shared by the till and the customer's pay page; both read the same
  // app language.
  const { t, fill, locale } = useStaffText("tipSelector");
  const money = (value: number) => formatMoney(value, locale);

  // ── THE FACILITY DECIDES WHETHER THESE EXIST ───────────────────────────
  //
  // Both were rendered unconditionally, so a facility that turned them off in
  // Settings saw them anyway. `?? true` rather than a required field: every
  // facility already has a `tip_config` row written before these existed, and
  // the old behaviour was to show both.
  //
  // The terminal is not governed by either — Clover's own documentation says
  // the device always offers "custom tip" and "no tip" itself.
  const allowCustom = tipConfig.customTip ?? true;
  const roundUp = (tipConfig.roundUp ?? true) ? roundUpTip(subtotal) : null;

  // The same rule the Clover terminal uses — see lib/tips.ts. It moved out of
  // here so a server route could reach it; a second copy would be a second
  // thing to keep in step with this one.
  const tier = activeTipTier(tipConfig, subtotal);

  const calcTip = (idx: number) => {
    const opt = tier.options[idx];
    return opt.type === "percentage" ? (subtotal * opt.value) / 100 : opt.value;
  };

  const handlePreset = (idx: number) => {
    setShowCustom(false);
    setCustomValue("");
    const amount = calcTip(idx);
    onTipChange(Math.abs(tipAmount - amount) < 0.01 ? 0 : amount);
  };

  const handleNoTip = () => {
    setShowCustom(false);
    setCustomValue("");
    onTipChange(0);
  };

  const handleRoundUp = () => {
    if (roundUp === null) return;
    setShowCustom(false);
    setCustomValue("");
    onTipChange(Math.abs(tipAmount - roundUp) < 0.01 ? 0 : roundUp);
  };

  const handleCustomApply = () => {
    const val = parseFloat(customValue);
    if (!isNaN(val) && val >= 0) {
      onTipChange(val);
      setShowCustom(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preset + No Tip buttons */}
      <div className="grid grid-cols-4 gap-2">
        {([0, 1, 2] as const).map((idx) => {
          const amount = calcTip(idx);
          const isSelected = !showCustom && Math.abs(tipAmount - amount) < 0.01;
          const isPreferred = tier.preferredIndex === idx;
          const opt = tier.options[idx];

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handlePreset(idx)}
              className={cn(
                "border-line relative flex min-h-12 flex-col items-center justify-center rounded-2xl border py-2.5 text-center text-xs font-semibold",
                isSelected ? CHOSEN : "text-body-ink",
              )}
              aria-pressed={isSelected}
            >
              {isPreferred && (
                <span className="bg-primary absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-white">
                  {t("popular")}
                </span>
              )}
              {opt.type === "percentage" ? (
                <>
                  <span className="text-sm font-bold tabular-nums">
                    {formatPercent(opt.value, locale)}
                  </span>
                  <span className="text-ink-secondary text-xs tabular-nums">
                    {money((subtotal * opt.value) / 100)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold tabular-nums">
                  {money(opt.value)}
                </span>
              )}
            </button>
          );
        })}

        {/* No tip */}
        <button
          type="button"
          onClick={handleNoTip}
          className={cn(
            "border-line flex min-h-12 flex-col items-center justify-center rounded-2xl border py-2.5 text-center text-sm font-bold",
            !showCustom && tipAmount === 0 ? CHOSEN : "text-body-ink",
          )}
          aria-pressed={!showCustom && tipAmount === 0}
        >
          {t("noTip")}
        </button>
      </div>

      {/* ── Round up ──────────────────────────────────────────────────────
          Only when there IS something to round: `roundUpTip` returns null on a
          whole-dollar bill, and an option that adds nothing is worse than no
          option. */}
      {roundUp !== null && (
        <button
          type="button"
          onClick={handleRoundUp}
          className={cn(
            "border-line min-h-10 w-full rounded-full border py-2 text-center text-sm font-semibold",
            !showCustom && Math.abs(tipAmount - roundUp) < 0.01
              ? CHOSEN
              : "text-body-ink",
          )}
        >
          {fill("roundUp", {
            total: money(subtotal + roundUp),
            tip: money(roundUp),
          })}
        </button>
      )}

      {/* Custom amount */}
      {!allowCustom ? null : !showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="text-primary min-h-10 w-full text-center text-sm font-semibold hover:underline"
        >
          {t("customAmount")}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              aria-label={t("customAmount")}
              type="number"
              min={0}
              step={0.5}
              placeholder="0.00"
              value={customValue}
              className="tabular-nums"
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
              autoFocus
            />
          </div>
          <Button size="sm" onClick={handleCustomApply}>
            {t("apply")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowCustom(false);
              setCustomValue("");
            }}
          >
            {t("keep")}
          </Button>
        </div>
      )}

      {tipAmount > 0 && (
        <p className="text-ink-secondary flex items-center justify-center gap-1 text-center text-xs">
          <Star className="size-4" />
          {fill("added", { amount: money(tipAmount) })}
        </p>
      )}
    </div>
  );
}
