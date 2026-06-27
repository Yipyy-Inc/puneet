"use client";

import { Headphones } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supportAgents } from "@/hooks/use-support-inbox";
import {
  AVAILABILITY_TIMEOUT_OPTIONS,
  CALL_AVAILABILITY_META,
  CALL_AVAILABILITY_OPTIONS,
  inRingPool,
} from "@/lib/calling/availability";
import {
  setAgentStatus,
  setAvailabilityTimeout,
  useSupportCallingSettings,
} from "@/lib/support-calling-settings-store";
import { FacilityAvatar } from "../../chat/_components/facility-avatar";

export function AvailabilityCard() {
  const settings = useSupportCallingSettings();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Headphones className="size-4 text-emerald-500" />
          Call Availability
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Busy or Away agents are temporarily removed from the ring /
          round-robin pool, then auto-reset to Available.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm">Auto-reset timeout</Label>
          <Select
            value={String(settings.availabilityTimeoutMinutes)}
            onValueChange={(v) => setAvailabilityTimeout(Number(v))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABILITY_TIMEOUT_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {supportAgents.map((agent) => {
            const status = settings.agentStatus[agent.id] ?? "available";
            const pooled = inRingPool(status);
            return (
              <div
                key={agent.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
              >
                <FacilityAvatar name={agent.name} id={agent.id} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {pooled ? "In ring pool" : "Excluded from ring pool"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {CALL_AVAILABILITY_OPTIONS.map((opt) => {
                    const meta = CALL_AVAILABILITY_META[opt];
                    const active = status === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAgentStatus(agent.id, opt)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "text-muted-foreground hover:bg-muted border-transparent",
                        )}
                        aria-pressed={active}
                      >
                        <span className={cn("size-2 rounded-full", meta.dot)} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
