"use client";

import { Smartphone } from "lucide-react";

import { cloverTipSuggestions } from "@/lib/tips";
import type { TipConfig } from "@/types/facility";

// ============================================================================
// What the card reader will draw, and why there is no button here.
//
// ── THERE IS NOTHING TO SYNC ──────────────────────────────────────────────
//
// The specification asked for a "Sync tip settings to Clover" button, a
// last-synced timestamp, a red/amber/green indicator and a "changes pending
// sync" banner. None of that is built, deliberately.
//
// The terminal route reads `tip_config` out of Postgres on EVERY payment and
// hands it to the device in the same request — see the `read-tip` call in
// app/api/payments/clover/terminal/route.ts. There is no second copy to push
// and nothing that can drift, so a sync button would add a way for the device
// and this screen to disagree, plus a failure state to design, plus a banner
// nagging about a change that has already taken effect.
//
// It is also where this beats the product the brief was measured against:
// MoeGo's own help page says Smart Reader devices "require separate
// configuration due to hardware constraints" — the duplicate configuration the
// specification was trying to solve. Yipyy does not have it.
//
// ── AND THE OTHER THING THE SPEC GOT WRONG ────────────────────────────────
//
// It said only percentages can reach the terminal, and that fixed amounts would
// need converting to "the nearest percentage equivalent". Clover's read-tip
// endpoint takes an `amount` in CENTS, and lib/tips.ts has always sent fixed
// tips exactly. Nothing is rounded and nothing is approximated.
// ============================================================================

/** The ticket the preview is drawn against, matching the settings preview. */
export function CloverTipPanel({
  config,
  previewSubtotal,
}: {
  config: TipConfig;
  previewSubtotal: number;
}) {
  // The SAME function the terminal route calls. If this panel is right, the
  // device is right, because there is only one answer being computed.
  const suggestions = cloverTipSuggestions(config, previewSubtotal);

  return (
    <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <Smartphone className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold">On your Clover terminal</p>
          <p className="text-muted-foreground text-[11px]/relaxed">
            These options are sent to the card reader with each payment, so
            there is nothing to sync and nothing to set up on the device.
          </p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-muted-foreground text-[11px]">
          Tipping is off, so the terminal will not ask for one.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <span
                key={i}
                className="bg-background rounded-md border px-2 py-1 text-[11px] font-medium"
              >
                {s.percentage !== undefined
                  ? `${s.percentage}%`
                  : `$${((s.amount ?? 0) / 100).toFixed(2)}`}
                {s.name ? ` · ${s.name}` : ""}
              </span>
            ))}
            {/* Not ours to configure, and not optional: Clover's documentation
                for read-tip states that "custom tip" and "no tip" are always
                offered. Drawing them here as greyed-out chips is the honest
                version of the spec's "add a fourth, non-editable No Tip card". */}
            <span className="text-muted-foreground rounded-md border border-dashed px-2 py-1 text-[11px]">
              Custom
            </span>
            <span className="text-muted-foreground rounded-md border border-dashed px-2 py-1 text-[11px]">
              No tip
            </span>
          </div>
          <p className="text-muted-foreground text-[10px]">
            Shown for a ${previewSubtotal.toFixed(2)} ticket. Custom and No tip
            are added by Clover itself and cannot be turned off.
          </p>
        </>
      )}
    </div>
  );
}
