"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Mail, Smartphone, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ReputationSequenceStep,
  ReputationChannel,
} from "@/types/reputation";

type Unit = "minutes" | "hours" | "days";

function splitDelay(min: number): { n: number; unit: Unit } {
  if (min > 0 && min % 1440 === 0) return { n: min / 1440, unit: "days" };
  if (min > 0 && min % 60 === 0) return { n: min / 60, unit: "hours" };
  return { n: min, unit: "minutes" };
}

function toMinutes(n: number, unit: Unit): number {
  const v = Math.max(0, n || 0);
  return unit === "days" ? v * 1440 : unit === "hours" ? v * 60 : v;
}

export function ReputationSequenceBuilder({
  steps,
  onChange,
}: {
  steps: ReputationSequenceStep[];
  onChange: (steps: ReputationSequenceStep[]) => void;
}) {
  function patchStep(id: string, patch: Partial<ReputationSequenceStep>) {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addStep() {
    const last = steps[steps.length - 1];
    onChange([
      ...steps,
      {
        id: `seq-${Date.now()}`,
        channel: "email",
        delayMinutes: (last?.delayMinutes ?? 60) + 2880,
        onlyIfNoResponse: true,
      },
    ]);
  }

  function removeStep(id: string) {
    onChange(steps.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isInitial = i === 0;
        const { n, unit } = splitDelay(step.delayMinutes);
        const ChannelIcon = step.channel === "sms" ? Smartphone : Mail;

        return (
          <div key={step.id}>
            {i > 0 && (
              <div className="flex items-center justify-center py-0.5">
                <ArrowDown className="text-muted-foreground/40 size-3.5" />
              </div>
            )}
            <div className="rounded-xl border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      isInitial
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">
                    {isInitial ? "Initial send" : "Backup"}
                  </span>
                  {!isInitial && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      only if no response
                    </span>
                  )}
                </div>
                {!isInitial && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground/50 hover:text-destructive size-7"
                    onClick={() => removeStep(step.id)}
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr]">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Channel</Label>
                  <Select
                    value={step.channel}
                    onValueChange={(v) =>
                      patchStep(step.id, { channel: v as ReputationChannel })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {isInitial ? "Send delay (after checkout)" : "Send (after checkout)"}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={n}
                      onChange={(e) =>
                        patchStep(step.id, {
                          delayMinutes: toMinutes(Number(e.target.value), unit),
                        })
                      }
                      className="h-8 w-20 text-sm"
                    />
                    <Select
                      value={unit}
                      onValueChange={(v) =>
                        patchStep(step.id, {
                          delayMinutes: toMinutes(n, v as Unit),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 flex-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">minutes</SelectItem>
                        <SelectItem value="hours">hours</SelectItem>
                        <SelectItem value="days">days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                <ChannelIcon className="size-3.5" />
                {isInitial
                  ? `Sends via ${step.channel.toUpperCase()}`
                  : `Sends via ${step.channel.toUpperCase()} if the client still hasn't responded`}
              </p>
            </div>
          </div>
        );
      })}

      <Button
        variant="outline"
        onClick={addStep}
        className="w-full gap-2 border-dashed"
      >
        <Plus className="size-4" /> Add backup step
      </Button>
    </div>
  );
}
