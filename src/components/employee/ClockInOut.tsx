"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-settings";
import {
  ClockConfirm,
  formatClockTime,
  clockElapsedLabel,
} from "@/components/employee/ClockConfirm";
import {
  useClockIn,
  useClockOut,
  useOwnClock,
  useUndoClockOut,
} from "@/lib/api/scheduling";
import { useStaffHrConfig } from "@/lib/api/staff-onboarding";
import { usePermission, useFacilityViewer } from "@/hooks/use-facility-rbac";
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
export function ClockInOut() {
  // The register context is resolved from the acting viewer, not a bare id —
  // see src/lib/employee/register-context.ts.
  const { viewer, viewerResolved } = useFacilityViewer();
  // The facility's own closing time, from facility_settings. Imported from the
  // fixture until 20260809140000, so a business open until 21:45 had its drawer
  // demanding to be counted at 19:00.
  const { hours } = useSettings();
  // Postgres, not a `Map` in module scope. Until 2026-08-21 clocking in was
  // held in memory: a refresh, a second tab or a closed laptop and the session
  // had never happened.
  //
  // `isPending` is new and load-bearing — the store it replaces answered
  // instantly and wrongly, and a button reading "Clock in" while the real
  // answer is still in flight invites a second, refused, clock-in.
  const { clockedIn, clockedInAt, isPending: clockPending } = useOwnClock();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const undoClockOut = useUndoClockOut();
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
    startCooldown();
    clockInMutation.mutate(
      {},
      {
        onSuccess: (entry) => {
          toast.success(`Clocked in at ${formatClockTime(entry.clockedInAt)}`);
        },
        // "You are already clocked in" arrives from the exclusion constraint,
        // which is the only thing that can hold it across two devices.
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  function handleClockOut() {
    const startedAt = clockedInAt;
    startCooldown();

    clockOutMutation.mutate(
      {},
      {
        onSuccess: (entry) => {
          // End-of-shift close reminder — mode-aware so a mid-day handover
          // doesn't force the morning opener to close (spec: opener ≠ closer).
          if (canOpenRegister) {
            const ctx = resolveRegisterContext(viewerResolved ? viewer : null);
            const session = getTodaySession(ctx.facilityId, ctx.locationId);
            if (
              session &&
              shouldPromptCloseOnExit(
                session,
                ctx.staffName,
                registerCloseReminder,
                hours,
              )
            ) {
              requestRegisterClose(session.id);
            }
          }

          // The duration is the DATABASE's — a generated column — rather than
          // arithmetic done here. Three screens showing this number should not
          // each round it their own way.
          const worked =
            entry.minutesWorked != null && entry.clockedOutAt
              ? ` · ${clockElapsedLabel(startedAt, new Date(entry.clockedOutAt).getTime())} worked`
              : "";

          toast.success(
            `Clocked out at ${formatClockTime(entry.clockedOutAt)}${worked}`,
            {
              duration: 10_000,
              action: {
                label: "Undo",
                onClick: () => {
                  // Reopens THE SAME session rather than starting a second one
                  // — two rows would record a break that never happened. RLS
                  // allows it for two minutes, which is what a mis-tap is; past
                  // that the toast is gone anyway and the API says so plainly.
                  undoClockOut.mutate(entry.id, {
                    onSuccess: () =>
                      toast.success("Clock-out undone — back on the clock"),
                    onError: (error: Error) => toast.error(error.message),
                  });
                },
              },
            },
          );
        },
        onError: (error: Error) => toast.error(error.message),
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
        disabled={cooling || clockPending}
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
