"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PauseCircle, Coins, CreditCard } from "lucide-react";
import type { Membership, MembershipPlan } from "@/data/services-pricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership;
  plan: MembershipPlan | undefined;
  onConfirm: (months: number) => void;
}

const PAUSE_OPTIONS = [1, 2, 3] as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/** Add whole months to an ISO date, returning a new ISO string. */
function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function PauseMembershipDialog({
  open,
  onOpenChange,
  membership,
  plan,
  onConfirm,
}: Props) {
  const [months, setMonths] = useState<number>(1);

  const pauseStart = membership.nextBillingDate;
  const resumeDate = addMonths(pauseStart, months);

  const handleClose = (v: boolean) => {
    if (!v) setMonths(1);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="size-5 text-amber-500" />
            Pause {membership.planName}
          </DialogTitle>
          <DialogDescription>
            Take a break without cancelling. Your membership resumes
            automatically when the pause ends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 text-sm">
          {/* Duration selector */}
          <div>
            <p className="mb-2 font-medium">Pause duration</p>
            <div className="grid grid-cols-3 gap-2">
              {PAUSE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    months === m
                      ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="block text-lg font-semibold">{m}</span>
                  <span className="text-muted-foreground text-xs">
                    month{m === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Credit status during pause */}
          <div className="flex items-start gap-2 rounded-lg border p-3">
            <Coins className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Your credits during the pause</p>
              <p className="text-muted-foreground text-xs">
                {plan && plan.credits === -1
                  ? "No new credits are issued while paused; your unlimited access resumes when the pause ends."
                  : `No new credits are issued while paused. Any credits already in your balance (${
                      membership.creditsRemaining
                    }) are held and available again when you resume.`}
              </p>
            </div>
          </div>

          {/* Billing-pause confirmation */}
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">
                No charges while paused
              </p>
              <p className="text-xs text-emerald-900/90 dark:text-emerald-200/90">
                Billing pauses on {formatDate(pauseStart)} and resumes on{" "}
                <span className="font-semibold">{formatDate(resumeDate)}</span>.
                Your next charge will be on your resume date.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(months);
              handleClose(false);
            }}
          >
            Pause membership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
