"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallAvailability } from "@/hooks/use-call-availability";
import {
  CALL_AVAILABILITY_META,
  CALL_AVAILABILITY_OPTIONS,
  AVAILABILITY_TIMEOUT_OPTIONS,
  formatCountdown,
  inRingPool,
} from "@/lib/calling/availability";
import { staffMembers } from "@/data/staff";
import type { CallAvailability } from "@/types/staff";

const ACTIVE_STAFF = staffMembers.filter((s) => s.isActive);

export function CallAvailabilitySettings() {
  const {
    status,
    timeoutMinutes,
    secondsUntilReset,
    setStatus,
    setTimeoutMinutes,
    resetToAvailable,
  } = useCallAvailability();

  // Ring pool = "you" (live status) + each active staff member's seeded status.
  const roster: { id: string; name: string; role: string; status: CallAvailability; isSelf: boolean }[] = [
    { id: "self", name: "You", role: "Signed in", status, isSelf: true },
    ...ACTIVE_STAFF.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      status: s.callAvailability ?? ("available" as CallAvailability),
      isSelf: false,
    })),
  ];
  const inPool = roster.filter((r) => inRingPool(r.status)).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="size-4 text-green-600" />
          Call Availability
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mark yourself busy or away to drop out of the ring group without going
          offline. Resets automatically after the timeout.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Your status toggle */}
        <div>
          <Label className="mb-2 block text-sm">Your status</Label>
          <div className="flex flex-wrap gap-2">
            {CALL_AVAILABILITY_OPTIONS.map((opt) => {
              const m = CALL_AVAILABILITY_META[opt];
              const active = status === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatus(opt)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:border-muted-foreground/30 hover:bg-muted/40",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", m.dot)} />
                  <span className={cn("font-medium", active && "text-primary")}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
          {status !== "available" && (
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="size-3.5" />
                Auto-resets in{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {secondsUntilReset != null ? formatCountdown(secondsUntilReset) : "—"}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={resetToAvailable}
              >
                <RotateCcw className="size-3.5" />
                Reset now
              </Button>
            </div>
          )}
        </div>

        {/* Auto-reset timeout */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Auto-reset timeout</p>
            <p className="text-xs text-muted-foreground">
              Busy/Away returns to Available after this long.
            </p>
          </div>
          <Select
            value={String(timeoutMinutes)}
            onValueChange={(v) => setTimeoutMinutes(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABILITY_TIMEOUT_OPTIONS.map((min) => (
                <SelectItem key={min} value={String(min)}>
                  {min} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ring pool preview */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm">Ring pool preview</Label>
            <Badge variant="outline" className="tabular-nums">
              {inPool} of {roster.length} available for calls
            </Badge>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Applies to Ring All Devices and Round-Robin dispatch — busy/away staff
            are skipped.
          </p>
          <div className="divide-y rounded-xl border">
            {roster.map((r) => {
              const m = CALL_AVAILABILITY_META[r.status];
              const excluded = !inRingPool(r.status);
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    excluded && "bg-muted/30",
                  )}
                >
                  <span className={cn("size-2.5 shrink-0 rounded-full", m.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", excluded && "text-muted-foreground")}>
                      {r.name}
                      {r.isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({r.role})
                        </span>
                      )}
                    </p>
                    {!r.isSelf && (
                      <p className="truncate text-xs text-muted-foreground">{r.role}</p>
                    )}
                  </div>
                  {excluded ? (
                    <Badge variant="secondary" className={cn("shrink-0 text-xs", m.text)}>
                      {m.label} — excluded
                    </Badge>
                  ) : (
                    <span className={cn("shrink-0 text-xs font-medium", m.text)}>
                      {m.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
