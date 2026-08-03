"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useStaffHrConfig,
  useSaveStaffHrConfig,
} from "@/lib/api/staff-onboarding";

/** Facility control over the two-step clock confirmation. Both default ON so
 *  the client's accidental-clock-out requirement holds out of the box; turning
 *  a direction off makes it a single tap. Persisted to StaffHrConfig. */
export function ClockConfirmationSettings() {
  const config = useStaffHrConfig();
  // The displayed value comes from the REFETCH this mutation triggers, not
  // from the input — see the note in src/lib/api/staff.ts.
  const { mutate: saveStaffHrConfig } = useSaveStaffHrConfig();

  const setClockIn = (on: boolean) => {
    saveStaffHrConfig({ requireClockInConfirm: on });
    toast.success(
      on
        ? "Clock-in now asks for confirmation"
        : "Clock-in is now a single tap",
    );
  };

  const setClockOut = (on: boolean) => {
    saveStaffHrConfig({ requireClockOutConfirm: on });
    toast.success(
      on
        ? "Clock-out now asks for confirmation"
        : "Clock-out is now a single tap",
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-muted-foreground size-5" />
          <CardTitle>Time Clock Confirmation</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask staff to confirm before clocking in or out, so an accidental tap
          can&apos;t flip their clock state. Applies to the employee header and
          the scheduling time clock.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="require-clock-in">
              Require confirmation to clock in
            </Label>
            <p className="text-muted-foreground text-xs">
              When off, clocking in is a single tap.
            </p>
          </div>
          <Switch
            id="require-clock-in"
            checked={config.requireClockInConfirm}
            onCheckedChange={setClockIn}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="require-clock-out">
              Require confirmation to clock out
            </Label>
            <p className="text-muted-foreground text-xs">
              Recommended. When off, clocking out is a single tap — the
              direction most often triggered by accident.
            </p>
          </div>
          <Switch
            id="require-clock-out"
            checked={config.requireClockOutConfirm}
            onCheckedChange={setClockOut}
          />
        </div>
      </CardContent>
    </Card>
  );
}
