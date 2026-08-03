"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Lock, Sun, Vault } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DenominationInput } from "@/components/billing/cash-drawer/DenominationInput";
import {
  CAD_DENOMINATIONS,
  USD_DENOMINATIONS,
  type DenominationCount,
} from "@/data/cash-drawer";
import { usePermission, useFacilityViewer } from "@/hooks/use-facility-rbac";
import { useStaffHrConfig } from "@/lib/api/staff-onboarding";
import {
  getRegisterSessions,
  openRegister,
  useIsRegisterOpenToday,
} from "@/lib/cash-register-store";
import { resolveRegisterContext } from "@/lib/employee/register-context";

// ============================================================================
// Login open-gate (spec: force the cash count before the day starts). For staff
// granted register access, when the facility requires it and today's drawer
// hasn't been counted open, this blocks the whole employee portal with a single
// self-contained opening-count panel — count the float, open the register, and
// the portal unlocks. One surface (no stacked dialog); mandatory (no cancel).
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
  const { viewer, viewerResolved } = useFacilityViewer();
  const ctx = resolveRegisterContext(viewerResolved ? viewer : null);
  const openToday = useIsRegisterOpenToday(ctx.facilityId, ctx.locationId);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  const gated = canOpenRegister && requireRegisterOpenOnLogin && !openToday;
  if (!gated) return <>{children}</>;

  const denominations =
    ctx.currency === "CAD" ? CAD_DENOMINATIONS : USD_DENOMINATIONS;
  const symbol = ctx.currency === "CAD" ? "CA$" : "$";
  const floatTotal = denominations.reduce(
    (sum, d) => sum + d.value * (counts[d.id] ?? 0),
    0,
  );
  const priorClosing = getRegisterSessions()
    .filter(
      (s) =>
        s.facilityId === ctx.facilityId &&
        s.locationId === ctx.locationId &&
        s.status === "closed",
    )
    .sort((a, b) => b.businessDate.localeCompare(a.businessDate))[0]
    ?.closing?.drawerTotal;

  const handleOpen = () => {
    if (floatTotal <= 0) return;
    const denominationCounts: DenominationCount[] = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([denominationId, count]) => ({ denominationId, count }));
    openRegister(ctx.facilityId, ctx.locationId, {
      countedAt: new Date().toISOString(),
      countedBy: ctx.staffName,
      denominationCounts,
      floatTotal,
      note: note.trim(),
    });
    toast.success("Register opened — have a great shift!");
  };

  return (
    <div className="from-background via-muted/30 to-background fixed inset-0 z-60 flex flex-col items-center overflow-y-auto bg-linear-to-br p-4">
      {/* Soft Yipyy-brand glows so the gate reads as part of the platform. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-emerald-300/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-sky-300/20 blur-3xl"
      />

      <div className="relative z-10 my-auto flex w-full max-w-2xl flex-col items-center gap-5 py-6">
        <Image
          src="/yipyy-transparent.png"
          alt="Yipyy"
          width={120}
          height={48}
          priority
          className="h-9 w-auto opacity-90"
        />
        <div className="w-full overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-start gap-3 border-b p-5 sm:p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Vault className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Start your day — count the drawer
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Count the opening float and open the register for{" "}
                <span className="font-medium text-slate-700">
                  {ctx.locationName}
                </span>{" "}
                before serving the first customer — it reconciles the cash from
                the first sale.
              </p>
              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                <Lock className="size-3 shrink-0" />
                Signed in as {ctx.staffName}. The portal unlocks once the
                register is open.
              </p>
            </div>
          </div>

          {/* Body — the count */}
          <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5 sm:p-6">
            {typeof priorClosing === "number" && (
              <div className="bg-muted/30 rounded-md border border-dashed px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  Yesterday&apos;s drawer ended at{" "}
                </span>
                <span className="font-semibold tabular-nums">
                  {symbol}
                  {priorClosing.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  — start fresh, don&apos;t copy that number blindly.
                </span>
              </div>
            )}

            <DenominationInput
              denominations={denominations}
              counts={counts}
              onChange={(id, c) => setCounts((p) => ({ ...p, [id]: c }))}
              currencySymbol={symbol}
            />

            <div className="space-y-1.5">
              <Label htmlFor="gate-open-note" className="text-xs">
                Note (optional)
              </Label>
              <Textarea
                id="gate-open-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything worth flagging at open — e.g. low on quarters."
                className="min-h-[56px] resize-none"
              />
            </div>
          </div>

          {/* Footer — live float total + open */}
          <div className="flex flex-col gap-3 border-t bg-amber-50/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-slate-600">
                Opening float
              </span>
              <span className="text-2xl font-bold text-amber-700 tabular-nums">
                {symbol}
                {floatTotal.toFixed(2)}
              </span>
            </div>
            <Button
              size="lg"
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              // Also blocked until the roster names the person counting.
              //
              // This gate renders before the heavy provider stack on purpose, so
              // it is up while the staff query is still in flight — and the
              // opening count is stored with `countedBy: ctx.staffName`, which
              // is the string "Staff" until then. A drawer opened in that window
              // was signed by nobody, and `opener_clock_out` (which matches the
              // closer against the opener's NAME) then never prompted the person
              // who actually opened it. Caught by register-gate.spec.ts.
              disabled={floatTotal <= 0 || !viewerResolved}
              onClick={handleOpen}
            >
              <Sun className="size-4" />
              Open register · {symbol}
              {floatTotal.toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
