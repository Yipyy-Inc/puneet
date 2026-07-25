"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ClockConfirm,
  formatClockTime,
  clockElapsedLabel,
} from "@/components/employee/ClockConfirm";
import { useClock, clockIn, clockOut } from "@/lib/employee/clock-store";
import { useStaffHrConfig } from "@/data/staff-onboarding";
import { usePermission } from "@/hooks/use-facility-rbac";
import {
  getTodaySession,
  requestRegisterClose,
} from "@/lib/cash-register-store";
import { resolveRegisterContext } from "@/lib/employee/register-context";
import { shouldPromptCloseOnExit } from "@/lib/register-hours";

// Core staff action — works on all viewports (large tap target). The button
// NEVER toggles on the first click: it opens the shared ClockConfirm step, and
// clocking OUT is deliberately harder to confirm than clocking in. Two extra
// safeguards live here (surface-specific): a post-action cooldown and an Undo
// on the clock-out toast.
export function ClockInOut({ staffId }: { staffId: string }) {
  const { clockedIn, clockedInAt } = useClock(staffId);
  const {
    requireClockInConfirm,
    requireClockOutConfirm,
    registerCloseReminder,
  } = useStaffHrConfig();
  const canOpenRegister = usePermission("open_close_register");
  const [open, setOpen] = useState(false);
  // Brief post-action lockout so a stray double-tap (tap-through on the
  // just-closed dialog) can't immediately reopen and flip state again.
  const [cooling, setCooling] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending cooldown timer on unmount.
  useEffect(
    () => () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    },
    [],
  );

  function startCooldown() {
    setCooling(true);
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => setCooling(false), 2000);
  }

  function handleClockIn() {
    const res = clockIn(staffId);
    startCooldown();
    toast.success(`Clocked in at ${formatClockTime(res.clockedInAt)}`);
  }

  function handleClockOut() {
    // Capture the current session's start before it's cleared, so Undo can
    // restore the exact same clock-in rather than stamping a new one.
    const startedAt = clockedInAt;
    const res = clockOut(staffId);
    startCooldown();
    // End-of-shift close reminder — mode-aware so a mid-day handover doesn't
    // force the morning opener to close (spec: opener ≠ closer).
    if (canOpenRegister) {
      const ctx = resolveRegisterContext(staffId);
      const session = getTodaySession(ctx.facilityId, ctx.locationId);
      if (
        session &&
        shouldPromptCloseOnExit(session, ctx.staffName, registerCloseReminder)
      ) {
        requestRegisterClose(session.id);
      }
    }
    const worked =
      res.lastSessionMinutes != null
        ? ` · ${clockElapsedLabel(startedAt, new Date(res.clockedOutAt ?? "").getTime())} worked`
        : "";
    toast.success(
      `Clocked out at ${formatClockTime(res.clockedOutAt)}${worked}`,
      {
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => {
            // Restore the original clock-in (idempotent: a no-op if they've
            // since clocked in again), so a confirmed-but-mistaken clock-out is
            // one tap to reverse.
            clockIn(staffId, startedAt);
            toast.success("Clock-out undone — back on the clock");
          },
        },
      },
    );
  }

  // First tap either opens the confirm (default) or, when the facility has
  // turned this direction's confirmation off, performs it as a single tap.
  function handleTrigger() {
    if (clockedIn) {
      if (requireClockOutConfirm) setOpen(true);
      else handleClockOut();
    } else {
      if (requireClockInConfirm) setOpen(true);
      else handleClockIn();
    }
  }

  return (
    <>
      <Button
        variant={clockedIn ? "default" : "outline"}
        size="sm"
        className="h-9 gap-1.5"
        onClick={handleTrigger}
        disabled={cooling}
      >
        <Clock className="size-4" />
        <span className="text-xs font-medium">
          {clockedIn ? "Clock out" : "Clock in"}
        </span>
      </Button>

      <ClockConfirm
        open={open}
        onOpenChange={setOpen}
        clockedIn={clockedIn}
        clockedInAt={clockedInAt}
        onConfirm={clockedIn ? handleClockOut : handleClockIn}
      />
    </>
  );
}
