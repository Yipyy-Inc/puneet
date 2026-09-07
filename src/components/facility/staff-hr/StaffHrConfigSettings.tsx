"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useStaffHrConfig,
  useSaveStaffHrConfig,
} from "@/lib/api/staff-onboarding";
import { useSettingsText } from "@/lib/settings/use-settings-text";

const INVITE_MIN = 3;
const INVITE_MAX = 30;

/** Onboarding invite expiry / completion deadline / HR document retention —
 *  persisted to the Phase 0 staff-onboarding store (StaffHrConfig). */
export function StaffHrConfigSettings() {
  const t = useSettingsText().section("hr-config");
  const config = useStaffHrConfig();
  // The displayed value comes from the REFETCH this mutation triggers, not
  // from the input — see the note in src/lib/api/staff.ts.
  const { mutate: saveStaffHrConfig } = useSaveStaffHrConfig();
  const [inviteExpiryDays, setInviteExpiryDays] = useState(
    config.inviteExpiryDays,
  );
  const [completionDeadlineDays, setCompletionDeadlineDays] = useState(
    config.completionDeadlineDays,
  );
  const [hrDocRetentionYears, setHrDocRetentionYears] = useState(
    config.hrDocRetentionYears,
  );

  const dirty =
    inviteExpiryDays !== config.inviteExpiryDays ||
    completionDeadlineDays !== config.completionDeadlineDays ||
    hrDocRetentionYears !== config.hrDocRetentionYears;

  const handleSave = () => {
    const invite = Math.min(
      INVITE_MAX,
      Math.max(INVITE_MIN, Math.round(inviteExpiryDays) || INVITE_MIN),
    );
    saveStaffHrConfig({
      inviteExpiryDays: invite,
      completionDeadlineDays: Math.max(
        1,
        Math.round(completionDeadlineDays) || 1,
      ),
      hrDocRetentionYears: Math.max(1, Math.round(hrDocRetentionYears) || 1),
    });
    setInviteExpiryDays(invite);
    toast.success(t("hrSaved"));
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="inviteExpiry">{t("inviteExpiry")}</Label>
            <Input
              id="inviteExpiry"
              type="number"
              min={INVITE_MIN}
              max={INVITE_MAX}
              value={inviteExpiryDays}
              onChange={(e) => setInviteExpiryDays(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              {t("inviteExpiryHelp")
                .replace("{min}", String(INVITE_MIN))
                .replace("{max}", String(INVITE_MAX))}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="completionDeadline">
              {t("completionDeadline")}
            </Label>
            <Input
              id="completionDeadline"
              type="number"
              min={1}
              value={completionDeadlineDays}
              onChange={(e) =>
                setCompletionDeadlineDays(Number(e.target.value))
              }
            />
            <p className="text-muted-foreground text-xs">
              {t("completionDeadlineHelp")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retention">{t("retention")}</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              value={hrDocRetentionYears}
              onChange={(e) => setHrDocRetentionYears(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              {t("retentionHelp")}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty}>
            {t("saveChanges")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
