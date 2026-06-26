"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SupportTicket } from "@/types/support";
import { slaTargetHours, stableInt } from "./ticket-utils";

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function SlaCountdown({
  ticket,
  breached,
  onBreach,
}: {
  ticket: SupportTicket;
  breached: boolean;
  onBreach: () => void;
}) {
  // Computed once at mount. Now-relative synthesis (the real createdAt is
  // stale): a stable fraction of the SLA window has already elapsed, so the
  // deadline lands near/just over "now". Not rendered directly (remaining
  // starts null), so there is no SSR/client hydration mismatch.
  const [deadline] = useState(
    () =>
      Date.now() +
      slaTargetHours(ticket) *
        3_600_000 *
        (1 - stableInt(ticket.id, 40, 118) / 100),
  );
  const [remaining, setRemaining] = useState<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const rem = deadline - Date.now();
      setRemaining(rem);
      if (rem <= 0 && !firedRef.current) {
        firedRef.current = true;
        onBreach();
      }
    };
    const t = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [deadline, onBreach]);

  const isBreached = breached || (remaining !== null && remaining <= 0);
  const underHour = !isBreached && remaining !== null && remaining < 3_600_000;
  const danger = isBreached || underHour;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold tabular-nums",
        danger
          ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {isBreached ? (
        <AlertTriangle className="size-4" />
      ) : (
        <Clock className="size-4" />
      )}
      {isBreached
        ? "SLA Breached"
        : remaining === null
          ? "SLA …"
          : `SLA ${fmt(remaining)}`}
    </div>
  );
}
