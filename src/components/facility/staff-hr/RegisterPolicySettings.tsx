"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Vault } from "lucide-react";
import { toast } from "sonner";
import {
  useStaffHrConfig,
  saveStaffHrConfig,
  type RegisterCloseReminderMode,
} from "@/data/staff-onboarding";
import { todayCloseTime } from "@/lib/register-hours";

const CLOSE_REMINDER_LABELS: Record<RegisterCloseReminderMode, string> = {
  closing_time: "At closing time — any cashier (recommended)",
  opener_clock_out: "When the person who opened clocks out (single cashier)",
  manual: "Manual only — close from the register page",
};

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

  const setCloseReminder = (mode: RegisterCloseReminderMode) => {
    saveStaffHrConfig({ registerCloseReminder: mode });
    toast.success("Close-reminder setting updated");
  };

  const closeTime = todayCloseTime();

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

        <div className="space-y-2 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="register-close-reminder">
              When to remind staff to close the register
            </Label>
            <p className="text-muted-foreground text-xs">
              Supports shift handovers — a different person can open (morning)
              and close (evening).
            </p>
          </div>
          <Select
            value={config.registerCloseReminder}
            onValueChange={(v) =>
              setCloseReminder(v as RegisterCloseReminderMode)
            }
          >
            <SelectTrigger id="register-close-reminder" className="w-full">
              <SelectValue>
                {CLOSE_REMINDER_LABELS[config.registerCloseReminder]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="closing_time">
                At closing time — any cashier (recommended)
              </SelectItem>
              <SelectItem value="opener_clock_out">
                When the person who opened clocks out (single cashier)
              </SelectItem>
              <SelectItem value="manual">
                Manual only — close from the register page
              </SelectItem>
            </SelectContent>
          </Select>
          {config.registerCloseReminder === "closing_time" && (
            <p className="text-muted-foreground text-xs">
              {closeTime
                ? `Today's closing time is ${closeTime} (from your business hours). Mid-day departures aren't prompted.`
                : "The facility is closed today, so no closing reminder will fire."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
