"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
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
import { type RegisterCloseReminderMode } from "@/data/staff-onboarding";
import { todayCloseTime } from "@/lib/register-hours";
import {
  useStaffHrConfig,
  useSaveStaffHrConfig,
} from "@/lib/api/staff-onboarding";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Keys, not sentences: the same three strings are also the Select's own
// items below, so one map serves both and they cannot drift apart.
const CLOSE_REMINDER_LABELS: Record<RegisterCloseReminderMode, string> = {
  closing_time: "reminderClosingTime",
  opener_clock_out: "reminderOpenerClockOut",
  manual: "reminderManual",
};

/** Facility control over the mandatory cash-register open/close flow. Default
 *  ON so staff with register access must count the drawer open before they can
 *  use the portal, and are reminded to count it closed on clock-out / logout.
 *  Persisted to StaffHrConfig. */
export function RegisterPolicySettings() {
  const t = useSettingsText().section("hr-config");
  const config = useStaffHrConfig();
  const { hours } = useSettings();
  // The displayed value comes from the REFETCH this mutation triggers, not
  // from the input — see the note in src/lib/api/staff.ts.
  const { mutate: saveStaffHrConfig } = useSaveStaffHrConfig();

  const setRequireOpen = (on: boolean) => {
    saveStaffHrConfig({ requireRegisterOpenOnLogin: on });
    toast.success(on ? t("registerRequiredOn") : t("registerRequiredOff"));
  };

  const setCloseReminder = (mode: RegisterCloseReminderMode) => {
    saveStaffHrConfig({ registerCloseReminder: mode });
    toast.success(t("closeReminderUpdated"));
  };

  const closeTime = todayCloseTime(hours);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Vault className="text-muted-foreground size-5" />
          <CardTitle>{t("registerTitle")}</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("registerHelp")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="require-register-open">
              {t("requireRegisterOpen")}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t("requireRegisterOpenHelp")}
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
            <Label htmlFor="register-close-reminder">{t("whenToRemind")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("whenToRemindHelp")}
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
                {t(CLOSE_REMINDER_LABELS[config.registerCloseReminder])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="closing_time">
                {t("reminderClosingTime")}
              </SelectItem>
              <SelectItem value="opener_clock_out">
                {t("reminderOpenerClockOut")}
              </SelectItem>
              <SelectItem value="manual">{t("reminderManual")}</SelectItem>
            </SelectContent>
          </Select>
          {config.registerCloseReminder === "closing_time" && (
            <p className="text-muted-foreground text-xs">
              {closeTime
                ? t("closingTimeNote").replace("{time}", closeTime)
                : t("closedTodayNote")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
