import { Badge } from "@/components/ui/badge";
import { Vault } from "lucide-react";
import { resolveRegisterContext } from "@/lib/employee/register-context";
import { EmployeeDailyRegister } from "./_client";

// Employee-facing Daily Register — the same open/close/reconcile surface the
// facility admin uses, scoped to the signed-in employee + their location. This
// is where the login open-gate and the clock-out close reminder send staff.
export default function EmployeeRegisterPage() {
  // Location and currency only — they do not depend on who is acting.
  //
  // This page used to read the `employee_staff_id` cookie and resolve the
  // counting staff member from it, which meant the till could be counted under
  // whoever /employee/select last named. Who is counting now comes from the
  // acting viewer, in the client half below.
  const ctx = resolveRegisterContext(null);

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

      <EmployeeDailyRegister />
    </div>
  );
}
