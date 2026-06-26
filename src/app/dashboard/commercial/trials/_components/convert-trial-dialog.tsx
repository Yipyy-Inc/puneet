"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subscriptionTiers } from "@/data/subscription-tiers";
import type { Trial } from "@/types/trials";

const CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

interface ConvertTrialDialogProps {
  trial: Trial;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trial: Trial, tierName: string, cycle: string) => void;
}

export function ConvertTrialDialog({
  trial,
  onOpenChange,
  onConfirm,
}: ConvertTrialDialogProps) {
  const [tierId, setTierId] = useState(trial.tierId);
  const [cycle, setCycle] = useState("monthly");

  const tier = subscriptionTiers.find((t) => t.id === tierId);
  const price =
    tier?.pricing[cycle as "monthly" | "quarterly" | "yearly"] ??
    tier?.pricing.monthly ??
    0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to paid</DialogTitle>
          <DialogDescription>
            Convert {trial.facilityName}&apos;s trial into a paid subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="convert-tier">Tier</Label>
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger id="convert-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subscriptionTiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="convert-cycle">Billing cycle</Label>
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger id="convert-cycle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              <CreditCard className="size-4" />
              {tier?.name} · {cycle}
            </span>
            <span className="font-semibold tabular-nums">
              ${price.toLocaleString()}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            A payment method will be requested from {trial.adminName} to
            activate billing.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => onConfirm(trial, tier?.name ?? trial.plan, cycle)}
          >
            Convert to paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
