"use client";

import { toast } from "sonner";
import { CloseDayDialog } from "@/components/billing/cash-drawer/CloseDayDialog";
import {
  CAD_DENOMINATIONS,
  USD_DENOMINATIONS,
  type ClosingCount,
} from "@/data/cash-drawer";
import { payments } from "@/data/payments";
import { liveCashCaptured } from "@/lib/cash-register";
import {
  clearRegisterClosePrompt,
  closeRegister,
  useRegisterSessions,
  usePendingRegisterCloseSessionId,
} from "@/lib/cash-register-store";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { resolveRegisterContext } from "@/lib/employee/register-context";

// ============================================================================
// End-of-day close reminder (spec: remind staff to count & close on the way
// out). Driven by the register store's close-prompt slice, which ClockInOut
// (and logout) set when an authorized employee leaves with the drawer still
// open. Pops the same count-and-reconcile flow the register page uses — mounted
// once inside the employee shell.
// ============================================================================

export function RegisterCloseReminder({ staffId }: { staffId: string }) {
  const pendingId = usePendingRegisterCloseSessionId();
  const sessions = useRegisterSessions();
  const { viewer, viewerResolved } = useFacilityViewer();
  const ctx = resolveRegisterContext(viewerResolved ? viewer : null);

  const session = pendingId
    ? sessions.find((s) => s.id === pendingId && s.status === "open")
    : undefined;
  if (!session) return null;

  const denominations =
    ctx.currency === "CAD" ? CAD_DENOMINATIONS : USD_DENOMINATIONS;
  const live = liveCashCaptured(session, payments);

  const handleClose = (closing: ClosingCount, managerNote: string) => {
    closeRegister(session.id, closing, managerNote);
    toast.success("Register closed — drawer reconciled. See you next shift!");
  };

  return (
    <CloseDayDialog
      open
      onOpenChange={(v) => {
        if (!v) clearRegisterClosePrompt();
      }}
      session={session}
      liveTxns={live.txns}
      liveCashCaptured={live.total}
      denominations={denominations}
      currency={ctx.currency}
      staffName={ctx.staffName}
      onSubmit={handleClose}
    />
  );
}
