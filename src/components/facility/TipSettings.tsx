"use client";

import { useState } from "react";
import { DollarSign, Percent, Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import type { TipConfig, TipOption, TipTierConfig } from "@/types/facility";

// ── Tier editor: 3 options + preferred selector ───────────────────────────────

function TierEditor({
  tier,
  onChange,
  disabled,
}: {
  tier: TipTierConfig;
  onChange: (next: TipTierConfig) => void;
  disabled: boolean;
}) {
  const setOption = (idx: number, next: TipOption) => {
    const options = [...tier.options] as TipTierConfig["options"];
    options[idx] = next;
    onChange({ ...tier, options });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {tier.options.map((opt, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Option {idx + 1}
              </span>
              {tier.preferredIndex === idx && (
                <Badge variant="secondary" className="gap-0.5 text-[9px]">
                  <Star className="size-2" /> Preferred
                </Badge>
              )}
            </div>
            {/* Type toggle */}
            <div className="flex overflow-hidden rounded-md border text-xs">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOption(idx, { ...opt, type: "percentage" })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 py-1 transition-colors",
                  opt.type === "percentage"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <Percent className="size-3" /> %
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOption(idx, { ...opt, type: "fixed" })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 py-1 transition-colors",
                  opt.type === "fixed"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <DollarSign className="size-3" /> $
              </button>
            </div>
            {/* Value input */}
            <Input
              type="number"
              min={0}
              max={opt.type === "percentage" ? 100 : 9999}
              step={opt.type === "percentage" ? 1 : 0.5}
              value={opt.value}
              disabled={disabled}
              className="h-8 text-sm"
              onChange={(e) =>
                setOption(idx, {
                  ...opt,
                  value: parseFloat(e.target.value) || 0,
                })
              }
            />
            {/* Mark as preferred */}
            {!disabled && tier.preferredIndex !== idx && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...tier,
                    preferredIndex: idx as 0 | 1 | 2,
                  })
                }
                className="text-muted-foreground hover:text-primary w-full text-center text-[10px] underline"
              >
                Set as preferred
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TipSettings() {
  const { tipConfig, updateTipConfig } = useSettings();
  const [local, setLocal] = useState<TipConfig>(tipConfig);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    updateTipConfig(local);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocal(tipConfig);
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Tip Settings</p>
          <p className="text-muted-foreground text-xs">
            Configure tip options shown when confirming a booking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Enable / disable */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable tipping</p>
            <p className="text-muted-foreground text-xs">
              Show tip selection on the booking confirmation step
            </p>
          </div>
          <Switch
            checked={local.enabled}
            disabled={!isEditing}
            onCheckedChange={(v) => setLocal({ ...local, enabled: v })}
          />
        </div>

        {local.enabled && (
          <>
            {/* Mode selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tip mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setLocal({ ...local, mode: "general" })}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    local.mode === "general"
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50",
                    !isEditing && "cursor-default",
                  )}
                >
                  <p className="font-medium">General</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    One set of tip options for all transactions
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setLocal({ ...local, mode: "smart" })}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    local.mode === "smart"
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50",
                    !isEditing && "cursor-default",
                  )}
                >
                  <p className="font-medium">Smart Tips</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Different options based on ticket amount
                  </p>
                </button>
              </div>
            </div>

            {/* General mode */}
            {local.mode === "general" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tip options</Label>
                <TierEditor
                  tier={local.general}
                  disabled={!isEditing}
                  onChange={(tier) => setLocal({ ...local, general: tier })}
                />
              </div>
            )}

            {/* Smart Tips mode */}
            {local.mode === "smart" && (
              <div className="space-y-5">
                {/* Threshold */}
                <div className="flex items-center gap-3">
                  <Label className="shrink-0 text-sm font-medium">
                    Threshold — if ticket is less than
                  </Label>
                  <div className="relative w-28">
                    <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={local.smart.thresholdAmount}
                      disabled={!isEditing}
                      className="h-8 pl-6 text-sm"
                      onChange={(e) =>
                        setLocal({
                          ...local,
                          smart: {
                            ...local.smart,
                            thresholdAmount: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                  <span className="text-muted-foreground text-sm">
                    use fixed amounts; otherwise use percentages
                  </span>
                </div>

                {/* Below threshold */}
                <div className="rounded-lg border p-3">
                  <p className="mb-3 text-xs font-semibold">
                    Below ${local.smart.thresholdAmount} — Fixed amounts
                  </p>
                  <TierEditor
                    tier={local.smart.belowThreshold}
                    disabled={!isEditing}
                    onChange={(tier) =>
                      setLocal({
                        ...local,
                        smart: { ...local.smart, belowThreshold: tier },
                      })
                    }
                  />
                </div>

                {/* Above threshold */}
                <div className="rounded-lg border p-3">
                  <p className="mb-3 text-xs font-semibold">
                    ${local.smart.thresholdAmount}+ — Percentages
                  </p>
                  <TierEditor
                    tier={local.smart.aboveThreshold}
                    disabled={!isEditing}
                    onChange={(tier) =>
                      setLocal({
                        ...local,
                        smart: { ...local.smart, aboveThreshold: tier },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
