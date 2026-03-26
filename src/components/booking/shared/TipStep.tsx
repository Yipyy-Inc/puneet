"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TipSuggestion {
  type: "percent" | "fixed";
  label: string;
  value: number;
}

export interface TipStepConfig {
  enabled: boolean;
  mode: "percent" | "fixed";
  /** Percent suggestions (e.g. [15, 20, 25]) or fixed amounts */
  percentSuggestions?: number[];
  fixedSuggestions?: number[];
  recommendedIndex?: number;
  maxTipPercent?: number;
  maxTipAmount?: number;
}

interface TipStepProps {
  config: TipStepConfig;
  /** Current tip amount in dollars */
  tipAmount: number;
  /** Current percent (when a percent suggestion is selected) */
  tipPercentage: number | null;
  /** Custom amount string for the input */
  customTipInput: string;
  onTipAmountChange: (amount: number) => void;
  onTipPercentageSelect: (percent: number | null) => void;
  onCustomInputChange: (value: string) => void;
  /** Subtotal or service total used for percent calculation */
  subtotal: number;
  /** Optional "No tip" / skip label */
  noTipLabel?: string;
  onNoTip?: () => void;
  /** Title and description overrides */
  title?: string;
  description?: string;
}

export function TipStep({
  config,
  tipAmount,
  tipPercentage,
  customTipInput,
  onTipAmountChange,
  onTipPercentageSelect,
  onCustomInputChange,
  subtotal,
  noTipLabel = "No tip",
  onNoTip,
  title = "Tip Your Care Team",
  description = "Your tip goes directly to the team who will care for your pet. Any amount is appreciated and helps support our staff.",
}: TipStepProps) {
  if (!config.enabled) {
    return null;
  }

  const isPercentMode = config.mode === "percent";
  const suggestions: TipSuggestion[] = isPercentMode
    ? (config.percentSuggestions ?? [15, 20, 25]).map((v) => ({
        type: "percent" as const,
        label: `${v}%`,
        value: v,
      }))
    : (config.fixedSuggestions ?? [5, 10, 15, 20]).map((v) => ({
        type: "fixed" as const,
        label: `$${v}`,
        value: v,
      }));

  const recommendedIndex = config.recommendedIndex ?? 1;
  const maxPct = config.maxTipPercent ?? 50;
  const maxAmount = config.maxTipAmount ?? 500;

  const handlePercent = (pct: number) => {
    onTipPercentageSelect(pct);
    const amount = Math.min((subtotal * pct) / 100, (subtotal * maxPct) / 100);
    onTipAmountChange(Math.round(amount * 100) / 100);
  };

  const handleFixed = (amount: number) => {
    onTipPercentageSelect(null);
    onTipAmountChange(Math.min(amount, maxAmount));
  };

  const handleCustom = (raw: string) => {
    onTipPercentageSelect(null);
    onCustomInputChange(raw);
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && n >= 0) {
      onTipAmountChange(Math.min(n, maxAmount));
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="text-muted-foreground mx-auto max-w-md">{description}</p>
      </div>
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-muted-foreground mb-3 text-sm font-medium">
              Select an amount
            </p>
            <div className="grid grid-cols-3 gap-3">
              {suggestions.map((s, idx) => {
                const isPercent = s.type === "percent";
                const isSelected = isPercent
                  ? tipPercentage === s.value
                  : tipAmount === s.value && tipPercentage === null;
                const isRecommended = recommendedIndex === idx;
                return (
                  <Button
                    key={s.label}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="lg"
                    className={`relative h-14 text-base font-semibold ${
                      isRecommended && !isSelected
                        ? "ring-primary ring-2 ring-offset-2"
                        : ""
                    } `}
                    onClick={() =>
                      isPercent ? handlePercent(s.value) : handleFixed(s.value)
                    }
                  >
                    {s.label}
                    {isRecommended && (
                      <span className="bg-primary text-primary-foreground absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-sm px-1.5 py-0.5 text-[10px] font-normal">
                        Recommended
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Or enter a custom amount</Label>
            <div className="flex gap-2">
              <span className="bg-muted/50 text-muted-foreground flex items-center rounded-md border px-3 text-sm">
                $
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={customTipInput}
                onChange={(e) => handleCustom(e.target.value)}
                className="text-base"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          {tipAmount > 0 && (
            <p className="text-center text-sm font-medium text-green-600">
              Thank you! Your ${tipAmount.toFixed(2)} tip will go directly to
              the team.
            </p>
          )}
          {onNoTip && (
            <div className="text-center">
              <button
                type="button"
                onClick={onNoTip}
                className="text-muted-foreground hover:text-foreground text-sm underline"
              >
                {noTipLabel}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
