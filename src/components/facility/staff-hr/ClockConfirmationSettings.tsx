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
import { useSettingsText } from "@/lib/settings/use-settings-text";

/** Facility control over the two-step clock confirmation. Both default ON so
 *  the client's accidental-clock-out requirement holds out of the box; turning
 *  a direction off makes it a single tap. Persisted to StaffHrConfig. */
export function ClockConfirmationSettings() {
  const t = useSettingsText().section("hr-config");
  const config = useStaffHrConfig();
  // The displayed value comes from the REFETCH this mutation triggers, not
  // from the input — see the note in src/lib/api/staff.ts.
  const { mutate: saveStaffHrConfig } = useSaveStaffHrConfig();

  const setClockIn = (on: boolean) => {
    saveStaffHrConfig({ requireClockInConfirm: on });
    toast.success(on ? t("clockInConfirmOn") : t("clockInConfirmOff"));
  };

  const setClockOut = (on: boolean) => {
    saveStaffHrConfig({ requireClockOutConfirm: on });
    toast.success(on ? t("clockOutConfirmOn") : t("clockOutConfirmOff"));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-muted-foreground size-5" />
          <CardTitle>{t("clockTitle")}</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{t("clockHelp")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="require-clock-in">{t("requireClockIn")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("requireClockInHelp")}
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
            <Label htmlFor="require-clock-out">{t("requireClockOut")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("requireClockOutHelp")}
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
