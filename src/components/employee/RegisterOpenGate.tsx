"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Lock, Sun, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenDayDialog } from "@/components/billing/cash-drawer/OpenDayDialog";
import {
  CAD_DENOMINATIONS,
  USD_DENOMINATIONS,
  type OpeningCount,
} from "@/data/cash-drawer";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useStaffHrConfig } from "@/data/staff-onboarding";
import {
  getRegisterSessions,
  openRegister,
  useIsRegisterOpenToday,
} from "@/lib/cash-register-store";
import { resolveRegisterContext } from "@/lib/employee/register-context";

// ============================================================================
// Login open-gate (spec: force cash count before the day starts). For staff
// granted register access, when the facility requires it and today's drawer
// hasn't been counted open, this blocks the whole employee portal with the
// opening-count flow — so no one forgets to count the cash. Once anyone at the
// location opens the day's register, others aren't prompted again.
// ============================================================================

export function RegisterOpenGate({
  staffId,
  children,
}: {
  staffId: string;
  children: ReactNode;
}) {
  const canOpenRegister = usePermission("open_close_register");
  const { requireRegisterOpenOnLogin } = useStaffHrConfig();
  const ctx = resolveRegisterContext(staffId);
  const openToday = useIsRegisterOpenToday(ctx.facilityId, ctx.locationId);
  const [showCount, setShowCount] = useState(false);

  const gated = canOpenRegister && requireRegisterOpenOnLogin && !openToday;
  if (!gated) return <>{children}</>;

  const denominations =
    ctx.currency === "CAD" ? CAD_DENOMINATIONS : USD_DENOMINATIONS;
  const priorClosing = getRegisterSessions()
    .filter(
      (s) =>
        s.facilityId === ctx.facilityId &&
        s.locationId === ctx.locationId &&
        s.status === "closed",
    )
    .sort((a, b) => b.businessDate.localeCompare(a.businessDate))[0]
    ?.closing?.drawerTotal;

  const handleOpen = (opening: OpeningCount) => {
    openRegister(ctx.facilityId, ctx.locationId, opening);
    toast.success("Register opened — have a great shift!");
  };

  return (
    <div className="bg-muted/30 fixed inset-0 z-60 flex items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-xl sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Vault className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          Start your day — count the drawer
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Before you can use the rest of the portal, count the opening float and
          open the register for{" "}
          <span className="font-medium text-slate-700">{ctx.locationName}</span>
          . This makes sure the cash is reconciled from the first sale.
        </p>

        {typeof priorClosing === "number" && (
          <p className="text-muted-foreground mt-3 text-xs">
            Yesterday closed at{" "}
            <span className="font-semibold">
              {ctx.currency === "CAD" ? "CA$" : "$"}
              {priorClosing.toFixed(2)}
            </span>
            .
          </p>
        )}

        <Button
          size="lg"
          className="mt-6 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setShowCount(true)}
        >
          <Sun className="size-4" />
          Count opening float
        </Button>

        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-xs">
          <Lock className="size-3" />
          Signed in as {ctx.staffName}. The portal unlocks once the register is
          open.
        </p>
      </div>

      <OpenDayDialog
        open={showCount}
        onOpenChange={setShowCount}
        denominations={denominations}
        currency={ctx.currency}
        staffName={ctx.staffName}
        priorClosingTotal={priorClosing}
        onSubmit={handleOpen}
      />
    </div>
  );
}
