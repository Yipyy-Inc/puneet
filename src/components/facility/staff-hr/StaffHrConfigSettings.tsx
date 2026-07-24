"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useStaffHrConfig, saveStaffHrConfig } from "@/data/staff-onboarding";

const INVITE_MIN = 3;
const INVITE_MAX = 30;

/** Onboarding invite expiry / completion deadline / HR document retention —
 *  persisted to the Phase 0 staff-onboarding store (StaffHrConfig). */
export function StaffHrConfigSettings() {
  const config = useStaffHrConfig();
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
    toast.success("Onboarding & HR settings saved");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="text-muted-foreground size-5" />
          <CardTitle>Onboarding & HR Settings</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Defaults for the self-serve onboarding invite, completion window, and
          how long signed HR documents are retained.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="inviteExpiry">Invite expiry (days)</Label>
            <Input
              id="inviteExpiry"
              type="number"
              min={INVITE_MIN}
              max={INVITE_MAX}
              value={inviteExpiryDays}
              onChange={(e) => setInviteExpiryDays(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              Onboarding link stays valid this long ({INVITE_MIN}–{INVITE_MAX},
              default 7).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="completionDeadline">
              Completion deadline (days)
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
              Days a new hire has to finish onboarding (default 14).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retention">HR document retention (years)</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              value={hrDocRetentionYears}
              onChange={(e) => setHrDocRetentionYears(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">
              How long signed HR documents are kept (default 7).
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
