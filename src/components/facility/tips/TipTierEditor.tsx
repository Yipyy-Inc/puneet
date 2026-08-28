"use client";

import { DollarSign, MessageSquare, Percent, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TipOption, TipTierConfig } from "@/types/facility";

// ============================================================================
// The three options a customer is offered, and what they come to in money.
//
// ── WHY THE DOLLAR PREVIEW IS THE POINT OF THIS FILE ──────────────────────
//
// "18%" is not a decision anybody can check. On a $60 groom it is $10.80; on a
// $400 boarding stay it is $72, and a facility setting one number for both had
// no way to see that until a customer did. The preview turns an abstract
// percentage into the figure that will actually appear on the screen.
//
// It runs off the SAME arithmetic the customer's screen and the Clover terminal
// use — percentage of the PRE-TAX subtotal — rather than a second formula that
// could drift from them. If this preview and the terminal ever disagree, one of
// them is lying to a facility about their own prices.
//
// ── EXTRACTED FROM TipSettings.tsx ────────────────────────────────────────
//
// It was a local component in a 643-line file that is now growing four cards.
// Nothing about it changed except the preview.
// ============================================================================

/** What one option comes to on a given bill. Dollars in, dollars out. */
export function tipOptionAmount(option: TipOption, subtotal: number): number {
  return option.type === "percentage"
    ? (subtotal * option.value) / 100
    : option.value;
}

export function TipTierEditor({
  tier,
  onChange,
  disabled,
  previewSubtotal,
}: {
  tier: TipTierConfig;
  onChange: (next: TipTierConfig) => void;
  disabled: boolean;
  /** The ticket the preview is calculated against. */
  previewSubtotal: number;
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

            {/* ── What it comes to ──────────────────────────────────────
                A fixed amount is already the answer, so saying "on a $60
                ticket: $5.00" about a $5 option would be noise dressed as
                information. Only a percentage needs converting. */}
            <p className="text-muted-foreground text-[10px]">
              {opt.type === "percentage" ? (
                <>
                  On ${previewSubtotal.toFixed(2)}:{" "}
                  <span className="text-foreground font-semibold">
                    ${tipOptionAmount(opt, previewSubtotal).toFixed(2)}
                  </span>
                </>
              ) : (
                <>Flat amount, whatever the ticket</>
              )}
            </p>

            {/* Label input */}
            <Input
              type="text"
              placeholder="e.g. Good job"
              value={opt.label ?? ""}
              disabled={disabled}
              maxLength={32}
              className="h-8 text-xs"
              onChange={(e) =>
                setOption(idx, {
                  ...opt,
                  label: e.target.value || undefined,
                })
              }
            />

            {/* Preview pill — the button as the customer sees it */}
            <div className="bg-muted flex h-7 items-center justify-center rounded-md px-2">
              <span className="truncate text-[11px] font-medium">
                {opt.type === "percentage" ? `${opt.value}%` : `$${opt.value}`}
                {opt.label ? ` · ${opt.label}` : ""}
              </span>
            </div>

            {!disabled && tier.preferredIndex !== idx && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...tier, preferredIndex: idx as 0 | 1 | 2 })
                }
                className="text-muted-foreground hover:text-primary w-full text-center text-[10px] underline"
              >
                Set as preferred
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <MessageSquare className="size-3" />
        The label is shown to customers alongside the tip amount (e.g.&nbsp;
        <span className="font-medium">20% · Fantastic job</span>).
      </p>
    </div>
  );
}
