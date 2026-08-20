"use client";

import { useEffect, useState } from "react";
import { useOwnClock } from "@/lib/api/scheduling";

function elapsed(iso: string, nowMs: number): string {
  const mins = Math.max(
    0,
    Math.round((nowMs - new Date(iso).getTime()) / 60_000),
  );
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Always-visible confirmation of clock state, so a wrong state can't go
// unnoticed. Lives beside ClockInOut in the employee header. Clocked-in is
// deliberately loud (green pulsing dot + live elapsed time driven off
// clockedInAt); clocked-out is a subtle, quiet label.
export function OnTheClockPill() {
  // No `staffId` prop any more: who is asking comes from the session, and a
  // component that takes an id is a component that can be pointed at somebody
  // else's clock.
  const { clockedIn, clockedInAt, isPending } = useOwnClock();
  const [now, setNow] = useState(() => Date.now());

  // Refresh the elapsed timer every 30s while on the clock (an immediate async
  // tick keeps the value fresh the moment they clock in). Async setState in the
  // timer callbacks stays clear of the set-state-in-effect rule.
  useEffect(() => {
    if (!clockedIn) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [clockedIn, clockedInAt]);

  // "Off the clock" before the answer has arrived is a statement about
  // somebody's working day, and the in-memory store this replaces made it
  // instantly and confidently every time the page loaded.
  if (isPending) {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex">
        <span className="bg-muted-foreground/20 size-1.5 animate-pulse rounded-full" />
        Checking…
      </span>
    );
  }

  if (!clockedIn) {
    return (
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex">
        <span className="bg-muted-foreground/40 size-1.5 rounded-full" />
        Off the clock
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span>
        {/* Full label on ≥sm; compact (dot + elapsed only) on phones so the
            top bar isn't crowded. */}
        <span className="hidden sm:inline">On the clock</span>
        {clockedInAt && (
          <>
            <span className="hidden sm:inline"> · </span>
            {elapsed(clockedInAt, now)}
          </>
        )}
      </span>
    </span>
  );
}
