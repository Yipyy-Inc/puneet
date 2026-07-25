import { cookies } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Vault } from "lucide-react";
import { DailyRegisterClient } from "@/components/billing/cash-drawer/DailyRegisterClient";
import { resolveRegisterContext } from "@/lib/employee/register-context";

// Employee-facing Daily Register — the same open/close/reconcile surface the
// facility admin uses, scoped to the signed-in employee + their location. This
// is where the login open-gate and the clock-out close reminder send staff.
export default async function EmployeeRegisterPage() {
  const cookieStore = await cookies();
  const staffId = cookieStore.get("employee_staff_id")?.value;
  const ctx = resolveRegisterContext(staffId);

  return (
    <div className="flex-1 space-y-5 p-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Vault className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Daily Register
            </h2>
            <p className="text-muted-foreground text-sm">
              {ctx.locationName} · open / close the day, track cash sales,
              reconcile the drawer
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {ctx.currency} ·{" "}
          {ctx.currency === "CAD"
            ? "Canadian denominations"
            : "US denominations"}
        </Badge>
      </div>

      <DailyRegisterClient
        facilityId={ctx.facilityId}
        locationId={ctx.locationId}
        locationName={ctx.locationName}
        currency={ctx.currency}
        staffName={ctx.staffName}
        isManager={ctx.isManager}
      />
    </div>
  );
}
