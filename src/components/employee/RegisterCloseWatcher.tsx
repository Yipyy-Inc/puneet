"use client";

import { useEffect, useState } from "react";
import { Vault, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useStaffHrConfig } from "@/data/staff-onboarding";
import {
  requestRegisterClose,
  todayBusinessDate,
  useRegisterSessions,
} from "@/lib/cash-register-store";
import { resolveRegisterContext } from "@/lib/employee/register-context";
import { isPastCloseTime, todayCloseTime } from "@/lib/register-hours";

// ============================================================================
// Closing-time reminder banner (spec: shift handover — a different person opens
// and closes). In "closing_time" mode, once the facility's closing time is
// reached and today's drawer is still open, this nudges whoever's on shift with
// register access to count & close it — regardless of who opened it. Passive
// (dismissible) so it never loops; the actual count flow is RegisterCloseReminder.
// ============================================================================

export function RegisterCloseWatcher({ staffId }: { staffId: string }) {
  const canOpenRegister = usePermission("open_close_register");
  const { registerCloseReminder } = useStaffHrConfig();
  const ctx = resolveRegisterContext(staffId);
  const sessions = useRegisterSessions();
  const [dismissed, setDismissed] = useState(false);
  const [, setTick] = useState(0);

  // Re-check the clock each minute so the banner appears when closing passes,
  // even if the cashier never navigates.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (registerCloseReminder !== "closing_time" || !canOpenRegister) return null;

  const session = sessions.find(
    (s) =>
      s.facilityId === ctx.facilityId &&
      s.locationId === ctx.locationId &&
      s.businessDate === todayBusinessDate() &&
      s.status === "open",
  );
  if (!session || dismissed || !isPastCloseTime()) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <Vault className="size-4 shrink-0" />
      <span className="flex-1">
        It&apos;s past closing time
        {todayCloseTime() ? ` (${todayCloseTime()})` : ""} and the register is
        still open. Count &amp; close the drawer to reconcile the day.
      </span>
      <Button
        size="sm"
        className="h-7 shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() => requestRegisterClose(session.id)}
      >
        <Vault className="size-3.5" />
        Count &amp; close
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-amber-200"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
