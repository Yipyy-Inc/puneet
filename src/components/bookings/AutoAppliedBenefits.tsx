"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Check,
  Gift,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  evaluateBenefits,
  type BenefitKind,
  type AppliedBenefit,
} from "@/lib/benefits-engine";
import type { Client } from "@/types/client";
import type { Invoice } from "@/types/booking";

interface AutoAppliedBenefitsProps {
  client: Pick<Client, "membership" | "packages" | "storeCredit"> | null;
  invoice: Invoice;
}

const TONE_CLASSES: Record<
  AppliedBenefit["badgeTone"],
  { border: string; bg: string; fg: string; icon: typeof Gift }
> = {
  emerald: {
    border: "border-emerald-300",
    bg: "bg-emerald-50",
    fg: "text-emerald-800",
    icon: Gift,
  },
  blue: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    fg: "text-blue-800",
    icon: Award,
  },
  violet: {
    border: "border-violet-300",
    bg: "bg-violet-50",
    fg: "text-violet-800",
    icon: Wallet,
  },
  amber: {
    border: "border-amber-300",
    bg: "bg-amber-50",
    fg: "text-amber-800",
    icon: Sparkles,
  },
};

export function AutoAppliedBenefits({
  client,
  invoice,
}: AutoAppliedBenefitsProps) {
  const [disabledKinds, setDisabledKinds] = useState<Set<BenefitKind>>(
    new Set(),
  );

  // Recompute every time the invoice or client changes. The engine is pure —
  // it never mutates the invoice, so we can render the result inline.
  const evaluation = useMemo(() => {
    if (!client)
      return { applied: [], totalSavings: 0, adjustedTotal: invoice.total };
    return evaluateBenefits(client, invoice, { disabledKinds });
  }, [client, invoice, disabledKinds]);

  // Notify on transition from Estimate → Open: the system has just auto-applied
  // benefits. We mirror that as a toast the first time we render in "open" with
  // benefits attached.
  const [hasAnnounced, setHasAnnounced] = useState(false);
  useEffect(() => {
    if (hasAnnounced) return;
    if (invoice.status === "open" && evaluation.applied.length > 0) {
      toast.success(
        `${evaluation.applied.length} benefit${evaluation.applied.length > 1 ? "s" : ""} applied automatically — $${evaluation.totalSavings.toFixed(2)} saved`,
      );
      setHasAnnounced(true);
    }
  }, [invoice.status, evaluation, hasAnnounced]);

  if (invoice.status === "closed") return null;
  if (!client) return null;

  const noBenefits = evaluation.applied.length === 0 && disabledKinds.size === 0;
  if (noBenefits) {
    return (
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Available Benefits
        </p>
        <div className="text-muted-foreground rounded-md border border-dashed px-2.5 py-2 text-[11px]">
          No active benefits for this client
        </div>
        <p className="text-muted-foreground/70 text-[9px] italic">
          Order: Package → Membership → Discount → Store Credit → Tax
        </p>
      </div>
    );
  }

  const toggleKind = (kind: BenefitKind, label: string) => {
    setDisabledKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
        toast.success(`${label} re-applied`);
      } else {
        next.add(kind);
        toast(`${label} removed`, {
          description: "Click again to re-apply",
        });
      }
      return next;
    });
  };

  const allKinds: { kind: BenefitKind; label: string }[] = [
    { kind: "package_credit", label: "Package Credit" },
    { kind: "membership_discount", label: "Membership Discount" },
    { kind: "store_credit", label: "Store Credit" },
  ];

  const disabledList = allKinds.filter((k) => disabledKinds.has(k.kind));

  return (
    <div className="space-y-2">
      {/* Banner — only when at least one benefit is active */}
      {evaluation.applied.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-50 to-white px-3 py-2.5">
          <div className="flex items-start gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Sparkles className="size-3.5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-900">
                {evaluation.applied.length} benefit
                {evaluation.applied.length > 1 ? "s" : ""} applied automatically
              </p>
              <p className="text-[11px] text-emerald-800/80">
                <span className="font-semibold font-[tabular-nums]">
                  ${evaluation.totalSavings.toFixed(2)} saved
                </span>{" "}
                · adjusted total{" "}
                <span className="font-semibold font-[tabular-nums]">
                  ${evaluation.adjustedTotal.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Applied benefits — toggle off to remove */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Applied Benefits
          </p>
          <Badge
            variant="outline"
            className="border-emerald-200 bg-white text-[9px] font-medium text-emerald-700"
          >
            Auto
          </Badge>
        </div>
        <div className="space-y-1.5">
          {evaluation.applied.map((benefit) => {
            const tone = TONE_CLASSES[benefit.badgeTone];
            const Icon = tone.icon;
            return (
              <button
                type="button"
                key={benefit.kind}
                onClick={() => toggleKind(benefit.kind, benefit.label)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all",
                  tone.border,
                  tone.bg,
                  "hover:brightness-95",
                )}
                title="Click to remove this benefit"
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full bg-white/70",
                  )}
                >
                  <Check className={cn("size-3", tone.fg)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("size-3", tone.fg)} />
                    <p className={cn("text-xs font-medium", tone.fg)}>
                      {benefit.label}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-[10px] opacity-80",
                      tone.fg,
                    )}
                  >
                    {benefit.description}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-xs font-semibold font-[tabular-nums]",
                      tone.fg,
                    )}
                  >
                    -${benefit.savings.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground/60 text-[9px] opacity-0 transition-opacity group-hover:opacity-100">
                    click to remove
                  </p>
                </div>
              </button>
            );
          })}

          {/* Removed benefits — show as muted with a re-apply affordance */}
          {disabledList.map(({ kind, label }) => (
            <button
              type="button"
              key={`disabled-${kind}`}
              onClick={() => toggleKind(kind, label)}
              className="group bg-muted/30 hover:bg-muted/50 flex w-full items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-left transition-colors"
              title="Click to re-apply this benefit"
            >
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-200">
                <X className="size-3 text-zinc-500" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-[11px] font-medium line-through">
                  {label}
                </p>
                <p className="text-muted-foreground/70 text-[9px]">
                  Removed by staff — click to re-apply
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground/70 text-[9px] italic">
        Order: Package → Membership → Discount → Store Credit → Tax
      </p>
    </div>
  );
}
