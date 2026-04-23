"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Heart, PawPrint, Sparkles, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TipConfig } from "@/types/facility";

interface TipWizardContentProps {
  tipConfig: TipConfig;
  subtotal: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
  petName?: string;
  serviceLabel?: string;
  staff?: Array<{ name: string; avatarUrl?: string; role?: string }>;
  contextTitle?: string;
  contextSubtitle?: string;
}

type StaffMember = { name: string; avatarUrl?: string; role?: string };

const FALLBACK_STAFF: StaffMember[] = [
  {
    name: "Sarah",
    role: "Lead caregiver",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    name: "Mike",
    role: "Play attendant",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=faces&auto=format&q=80",
  },
  {
    name: "Jess",
    role: "Care team",
    avatarUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&h=160&fit=crop&crop=faces&auto=format&q=80",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roundUpTarget(total: number): number {
  if (total <= 0) return 0;
  const step = total < 50 ? 5 : total < 200 ? 10 : 25;
  return Math.ceil(total / step) * step;
}

export function TipWizardContent({
  tipConfig,
  subtotal,
  tipAmount,
  onTipChange,
  petName,
  serviceLabel,
  staff,
  contextTitle,
  contextSubtitle,
}: TipWizardContentProps) {
  const tier = useMemo(() => {
    if (tipConfig.mode === "smart") {
      return subtotal < tipConfig.smart.thresholdAmount
        ? tipConfig.smart.belowThreshold
        : tipConfig.smart.aboveThreshold;
    }
    return tipConfig.general;
  }, [tipConfig, subtotal]);

  const calcTip = (idx: number) => {
    const opt = tier.options[idx];
    return opt.type === "percentage" ? (subtotal * opt.value) / 100 : opt.value;
  };

  const preferredAmount = calcTip(tier.preferredIndex);

  const [localTip, setLocalTip] = useState<number>(
    tipAmount > 0 ? tipAmount : preferredAmount,
  );
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    if (tipAmount === 0 && preferredAmount > 0) {
      onTipChange(Math.round(preferredAmount * 100) / 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const staffList = staff && staff.length > 0 ? staff : FALLBACK_STAFF;
  const staffCount = staffList.length;

  const roundTarget = roundUpTarget(subtotal + localTip);
  const roundUpAmount = Math.max(0, roundTarget - subtotal);
  const showRoundUp =
    roundUpAmount > 0 && Math.abs(roundUpAmount - localTip) > 0.01;

  const perStaffShare = staffCount > 0 ? localTip / staffCount : 0;

  const handlePreset = (idx: number) => {
    const amount = calcTip(idx);
    setShowCustom(false);
    setCustomValue("");
    setLocalTip(amount);
    onTipChange(Math.round(amount * 100) / 100);
  };

  const handleCustomApply = () => {
    const val = parseFloat(customValue);
    if (!isNaN(val) && val >= 0) {
      setLocalTip(val);
      setShowCustom(false);
      onTipChange(Math.round(val * 100) / 100);
    }
  };

  const handleRoundUp = () => {
    setLocalTip(roundUpAmount);
    onTipChange(Math.round(roundUpAmount * 100) / 100);
  };

  const handleSkip = () => {
    setLocalTip(0);
    setShowCustom(false);
    setCustomValue("");
    onTipChange(0);
  };

  return (
    /* -m-6 escapes the p-6 wrapper so the gradient fills the full content panel */
    <div className="from-primary/20 via-primary/8 to-primary/3 flex h-full bg-gradient-to-br">
      <div className="bg-background flex h-full w-full flex-col sm:flex-row">

        {/* ── Left panel: emotional context ── */}
        <div className="from-primary/25 to-primary/10 flex flex-col items-center justify-center gap-6 border-b bg-gradient-to-b px-8 py-10 text-center sm:w-[42%] sm:h-full sm:border-r sm:border-b-0">
          {/* Icon */}
          <div className="bg-primary/20 ring-primary/25 relative flex size-18 items-center justify-center rounded-full ring-4">
            <Heart className="text-primary size-9 fill-current" />
            <PawPrint className="bg-primary text-primary-foreground absolute -right-1 -bottom-1 size-7 rounded-full p-1.5" />
          </div>

          {/* Title + subtitle */}
          <div className="space-y-2">
            <h3 className="text-[17px] font-bold leading-tight tracking-tight">
              {contextTitle ??
                (petName
                  ? `${petName} will be in great hands! 🐾`
                  : "Your pet will be in great hands! 🐾")}
            </h3>
            <p className="text-muted-foreground text-[13px] leading-snug">
              {contextSubtitle ??
                (petName
                  ? `Show your appreciation for the team that will care for ${petName}${serviceLabel ? ` during ${serviceLabel.toLowerCase()}` : ""}.`
                  : "Show your appreciation for the team that will provide care.")}
            </p>
          </div>

          {/* Staff strip */}
          <div className="bg-background/60 w-full flex items-center gap-3 rounded-xl border border-primary/15 p-3 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {staffList.slice(0, 4).map((s, i) => (
                <div
                  key={`${s.name}-${i}`}
                  className="bg-primary/20 ring-background relative size-10 overflow-hidden rounded-full ring-2"
                >
                  {s.avatarUrl ? (
                    <Image
                      src={s.avatarUrl}
                      alt={s.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-primary flex size-full items-center justify-center text-xs font-semibold">
                      {initials(s.name)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1 text-left text-[12px] leading-tight">
              <p className="font-medium">
                Cared for by{" "}
                {staffList
                  .slice(0, 3)
                  .map((s) => s.name)
                  .join(", ")}
                {staffCount > 3 ? ` +${staffCount - 3}` : ""}
              </p>
              <p className="text-muted-foreground">
                100% of your tip is split evenly among the team
              </p>
            </div>
          </div>

          {/* Trust line */}
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span>
              Tips are 100% optional and go directly to the staff. Never to the
              facility.
            </span>
          </div>
        </div>

        {/* ── Right panel: tip selection ── */}
        <div className="flex flex-1 flex-col justify-center gap-4 px-8 py-10">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Choose an amount
          </p>

          {/* 2×2 tip options grid */}
          <div className="grid grid-cols-2 gap-2">
            {([0, 1, 2] as const).map((idx) => {
              const amount = calcTip(idx);
              const opt = tier.options[idx];
              const isSelected = !showCustom && Math.abs(localTip - amount) < 0.01;
              const isPreferred = tier.preferredIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePreset(idx)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-3.5 text-center transition-all",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary shadow-sm"
                      : "border-transparent bg-background/50 hover:border-primary/40 hover:bg-background/80",
                    isPreferred && !isSelected && "border-primary/30 bg-primary/8",
                  )}
                >
                  {isPreferred && (
                    <span className="bg-primary text-primary-foreground absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase whitespace-nowrap shadow-sm">
                      <Sparkles className="size-2.5" /> Most popular
                    </span>
                  )}
                  <span className="text-lg font-bold">
                    {opt.type === "percentage"
                      ? `${opt.value}%`
                      : `$${opt.value.toFixed(0)}`}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isSelected ? "text-primary/80" : "text-muted-foreground",
                    )}
                  >
                    {opt.type === "percentage"
                      ? `$${amount.toFixed(2)}`
                      : opt.label || "Thank the team"}
                  </span>
                  {opt.type === "percentage" && opt.label && (
                    <span className="text-[10px] opacity-70">{opt.label}</span>
                  )}
                </button>
              );
            })}

            {/* Custom amount tile */}
            <button
              type="button"
              onClick={() => {
                setShowCustom(true);
                setCustomValue(localTip > 0 ? localTip.toFixed(2) : "");
              }}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 px-3 py-3.5 text-center transition-all",
                showCustom
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-transparent bg-background/50 hover:border-primary/40 hover:bg-background/80",
              )}
            >
              <span className="text-sm font-bold">Custom</span>
              <span className="text-muted-foreground text-[11px]">
                Pick your own
              </span>
            </button>
          </div>

          {/* Custom input */}
          {showCustom && (
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
                  className="h-10 bg-background/70 pl-7"
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
                  autoFocus
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCustomApply}
                className="h-10"
              >
                Apply
              </Button>
            </div>
          )}

          {/* Round-up nudge */}
          {showRoundUp && !showCustom && (
            <button
              type="button"
              onClick={handleRoundUp}
              className="border-primary/30 bg-background/50 hover:bg-background/80 flex w-full items-center justify-between rounded-xl border border-dashed px-3 py-2 text-left text-[12px] transition-colors"
            >
              <span className="text-muted-foreground">
                ✨ Round up to{" "}
                <span className="text-foreground font-semibold">
                  ${roundTarget.toFixed(2)}
                </span>
              </span>
              <span className="text-primary font-medium">
                Add ${(roundUpAmount - localTip).toFixed(2)}
              </span>
            </button>
          )}

          {/* Impact line */}
          {localTip > 0 && (
            <div className="bg-background/50 flex items-center gap-2 rounded-xl border border-primary/15 p-3 text-[12px]">
              <Users className="text-primary size-4 shrink-0" />
              <p>
                <span className="font-semibold">${localTip.toFixed(2)}</span>{" "}
                goes to the team — about{" "}
                <span className="font-semibold">${perStaffShare.toFixed(2)}</span>{" "}
                per caregiver.
              </p>
            </div>
          )}

          {/* Skip option */}
          <button
            type="button"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground mt-2 w-full text-center text-[11px] underline-offset-4 transition-colors hover:underline"
          >
            {localTip > 0 ? "Remove tip — no tip this time" : "Maybe next time"}
          </button>
        </div>
      </div>
    </div>
  );
}
