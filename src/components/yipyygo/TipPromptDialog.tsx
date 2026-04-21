"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TipPopupConfig, TipSelection } from "@/types/yipyygo";

interface TipPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TipPopupConfig;
  stayTotal: number;
  onConfirm: (tip: TipSelection | undefined) => void;
  isSubmitting?: boolean;
}

type Selection =
  | { kind: "preset"; index: number }
  | { kind: "custom"; amount: number }
  | { kind: "none" };

export function TipPromptDialog({
  open,
  onOpenChange,
  config,
  stayTotal,
  onConfirm,
  isSubmitting,
}: TipPromptDialogProps) {
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    if (!open) {
      setSelection({ kind: "none" });
      setCustomInput("");
    }
  }, [open]);

  const computedAmount = useMemo(() => {
    if (selection.kind === "preset") {
      const preset = config.presets[selection.index];
      if (!preset) return 0;
      return preset.type === "percentage"
        ? (stayTotal * preset.value) / 100
        : preset.value;
    }
    if (selection.kind === "custom") return selection.amount;
    return 0;
  }, [selection, config.presets, stayTotal]);

  const handleConfirm = () => {
    if (selection.kind === "none") {
      onConfirm(undefined);
      return;
    }
    if (selection.kind === "preset") {
      const preset = config.presets[selection.index];
      if (!preset) {
        onConfirm(undefined);
        return;
      }
      onConfirm({
        type: preset.type === "percentage" ? "percentage" : "custom",
        percentage: preset.type === "percentage" ? preset.value : undefined,
        customAmount: preset.type === "fixed" ? preset.value : undefined,
        appliesTo: config.appliesTo,
      });
      return;
    }
    onConfirm({
      type: "custom",
      customAmount: selection.amount,
      appliesTo: config.appliesTo,
    });
  };

  const handleCustomChange = (v: string) => {
    setCustomInput(v);
    const parsed = parseFloat(v);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setSelection({ kind: "custom", amount: parsed });
    } else {
      setSelection({ kind: "none" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="bg-primary/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
            <Heart className="text-primary size-6" />
          </div>
          <DialogTitle className="text-center">{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-2">
            {config.presets.map((preset, i) => {
              const isSelected =
                selection.kind === "preset" && selection.index === i;
              const amount =
                preset.type === "percentage"
                  ? (stayTotal * preset.value) / 100
                  : preset.value;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelection({ kind: "preset", index: i })}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border-2 p-3 text-center transition-colors",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/50",
                  )}
                >
                  <span className="text-base font-bold">{preset.label}</span>
                  <span className="text-muted-foreground text-xs">
                    ${amount.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>

          {config.allowCustomAmount && (
            <div className="space-y-1.5">
              <Label htmlFor="tip-custom-amount">Custom amount ($)</Label>
              <Input
                id="tip-custom-amount"
                type="number"
                min={0}
                step={0.5}
                value={customInput}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          )}

          {selection.kind !== "none" && (
            <div className="bg-primary/5 flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" />
                <span className="text-sm font-medium">Tip amount</span>
              </div>
              <span className="text-primary text-lg font-bold">
                ${computedAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
          <Button
            onClick={handleConfirm}
            disabled={
              isSubmitting ||
              (selection.kind === "none" ? false : computedAmount <= 0)
            }
            className="w-full"
          >
            {selection.kind === "none"
              ? "Submit Express Check-in without tip"
              : `Add $${computedAmount.toFixed(2)} tip & submit`}
          </Button>
          {config.allowSkip && selection.kind !== "none" && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelection({ kind: "none" });
                setCustomInput("");
              }}
              className="w-full"
              disabled={isSubmitting}
            >
              Clear selection
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
