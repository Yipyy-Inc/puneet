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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PauseDetails, Membership } from "@/data/services-pricing";

type Mode = "cycles" | "date" | "manual";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
  onPause: (details: PauseDetails) => void;
}

export function PauseSubscriptionDialog({
  open,
  onOpenChange,
  membership,
  onPause,
}: Props) {
  const [mode, setMode] = useState<Mode>("cycles");
  const [cycles, setCycles] = useState(1);
  const [resumeDate, setResumeDate] = useState("");

  const handleConfirm = () => {
    const base: PauseDetails = {
      mode,
      pausedAt: new Date().toISOString(),
    };
    if (mode === "cycles") base.cycles = cycles;
    if (mode === "date") base.resumeDate = resumeDate || undefined;
    onPause(base);
    toast.success("Subscription paused", {
      description: membership?.customerName,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pause subscription</DialogTitle>
          <DialogDescription>
            Benefits are frozen while paused. Future billing dates are not
            shifted until the subscription resumes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <ModeOption
            active={mode === "cycles"}
            onClick={() => setMode("cycles")}
            title="Resume after N billing cycles"
            description="Automatically resumes after a set number of cycles."
          >
            {mode === "cycles" && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  className="w-24"
                  value={cycles}
                  onChange={(e) => setCycles(parseInt(e.target.value) || 1)}
                />
                <span className="text-muted-foreground text-xs">
                  {cycles === 1 ? "cycle" : "cycles"}
                </span>
              </div>
            )}
          </ModeOption>

          <ModeOption
            active={mode === "date"}
            onClick={() => setMode("date")}
            title="Resume on a specific date"
            description="Pick the exact date you'd like this subscription to resume."
          >
            {mode === "date" && (
              <div className="mt-2 flex items-center gap-2">
                <Label htmlFor="resume-date" className="text-xs">
                  Resume date
                </Label>
                <Input
                  id="resume-date"
                  type="date"
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                  className="w-[180px]"
                />
              </div>
            )}
          </ModeOption>

          <ModeOption
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            title="Manual restart"
            description="Stays paused until you resume it manually."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Pause subscription</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  description,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-muted-foreground mt-0.5 text-xs">{description}</div>
      {children}
    </button>
  );
}
