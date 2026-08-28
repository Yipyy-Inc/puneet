"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TipConfig } from "@/types/facility";
import { activeTipTier, roundUpTip } from "@/lib/tips";

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
                "relative flex flex-col items-center rounded-xl border-2 py-2.5 text-center text-xs font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              {isPreferred && (
                <span className="bg-primary text-primary-foreground absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap">
                  Popular
                </span>
              )}
              {opt.type === "percentage" ? (
                <>
                  <span className="text-sm font-bold">{opt.value}%</span>
                  <span className="text-muted-foreground text-[10px]">
                    ${((subtotal * opt.value) / 100).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold">
                  ${opt.value.toFixed(2)}
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
            "flex flex-col items-center rounded-xl border-2 py-2.5 text-center text-xs font-medium transition-colors",
            !showCustom && tipAmount === 0
              ? "border-primary bg-primary/10 text-primary"
              : "hover:border-primary/40 hover:bg-muted/50",
          )}
        >
          <span className="text-sm font-bold">No</span>
          <span className="text-[10px]">Tip</span>
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
            "w-full rounded-xl border-2 py-2 text-center text-xs font-medium transition-colors",
            !showCustom && Math.abs(tipAmount - roundUp) < 0.01
              ? "border-primary bg-primary/10 text-primary"
              : "hover:border-primary/40 hover:bg-muted/50",
          )}
        >
          Round up to ${(subtotal + roundUp).toFixed(2)}
          <span className="text-muted-foreground ml-1">
            (+${roundUp.toFixed(2)})
          </span>
        </button>
      )}

      {/* Custom amount */}
      {!allowCustom ? null : !showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="text-muted-foreground hover:text-primary w-full text-center text-xs underline transition-colors"
        >
          Custom amount
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="0.00"
              value={customValue}
              className="h-9 pl-7"
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={handleCustomApply}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-medium"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustom(false);
              setCustomValue("");
            }}
            className="text-muted-foreground text-xs underline"
          >
            Cancel
          </button>
        </div>
      )}

      {tipAmount > 0 && (
        <p className="text-muted-foreground flex items-center justify-center gap-1 text-center text-[11px]">
          <Star className="size-3" />
          Tip added:{" "}
          <span className="text-foreground font-semibold">
            ${tipAmount.toFixed(2)}
          </span>
        </p>
      )}
    </div>
  );
}
