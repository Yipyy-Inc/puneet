"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Vault } from "lucide-react";
import { toast } from "sonner";
import { useStaffHrConfig, saveStaffHrConfig } from "@/data/staff-onboarding";

/** Facility control over the mandatory cash-register open/close flow. Default
 *  ON so staff with register access must count the drawer open before they can
 *  use the portal, and are reminded to count it closed on clock-out / logout.
 *  Persisted to StaffHrConfig. */
export function RegisterPolicySettings() {
  const config = useStaffHrConfig();

  const setRequireOpen = (on: boolean) => {
    saveStaffHrConfig({ requireRegisterOpenOnLogin: on });
    toast.success(
      on
        ? "Staff with register access must now open the register on login"
        : "Register open/close is no longer mandatory",
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Vault className="text-muted-foreground size-5" />
          <CardTitle>Daily Register Policy</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          When on, any staff member granted “Open / close cash register” access
          must count the opening float before they reach the rest of their
          account, and is prompted to count &amp; close the drawer when they
          clock out or log out — so no one forgets to reconcile the cash.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="require-register-open">
              Require register open on login
            </Label>
            <p className="text-muted-foreground text-xs">
              Applies only to staff with register access. Once anyone opens the
              day&apos;s register for a location, others at that location
              aren&apos;t prompted again.
            </p>
          </div>
          <Switch
            id="require-register-open"
            checked={config.requireRegisterOpenOnLogin}
            onCheckedChange={setRequireOpen}
          />
        </div>
      </CardContent>
    </Card>
  );
}
