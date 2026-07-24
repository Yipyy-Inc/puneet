"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useStaffHrConfig,
  saveStaffHrConfig,
  STAFF_NOTIF_TRIGGERS,
  type StaffNotifTrigger,
  type StaffNotifTriggerKey,
} from "@/data/staff-onboarding";

const RECIPIENT_LABEL: Record<string, string> = {
  manager: "→ Manager",
  employee: "→ Employee",
  staff_card: "→ Staff card",
};

/**
 * Per-facility staff-lifecycle notification triggers (Table 5). Each trigger is
 * toggleable on/off with per-channel (in-app / email) and timing where relevant.
 * Persists to the staff-onboarding StaffHrConfig; the firing helper
 * (lib/staff-notifications.ts) reads it before every notification.
 */
export function StaffNotificationSettings() {
  const config = useStaffHrConfig();
  const [draft, setDraft] = useState<
    Record<StaffNotifTriggerKey, StaffNotifTrigger>
  >(config.notificationTriggers);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(config.notificationTriggers);

  const update = (
    key: StaffNotifTriggerKey,
    patch: Partial<StaffNotifTrigger>,
  ) => setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  const handleSave = () => {
    saveStaffHrConfig({ notificationTriggers: draft });
    toast.success("Staff notification settings saved");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="text-muted-foreground size-5" />
          <CardTitle>Staff Notifications</CardTitle>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose which onboarding &amp; offboarding events notify your team, and
          on which channels. Turn any trigger off to stop it entirely.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {STAFF_NOTIF_TRIGGERS.map((meta) => {
            const t = draft[meta.key];
            return (
              <div
                key={meta.key}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  !t.enabled && "bg-muted/20 opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label className="text-sm font-medium">
                        {meta.label}
                      </Label>
                      <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                        {RECIPIENT_LABEL[meta.recipient]}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {meta.description}
                    </p>

                    {t.enabled && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                        {meta.channels.includes("inApp") && (
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                            <Switch
                              checked={t.inApp}
                              onCheckedChange={(v) =>
                                update(meta.key, { inApp: v })
                              }
                            />
                            In-app feed
                          </label>
                        )}
                        {meta.channels.includes("email") && (
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                            <Switch
                              checked={t.email}
                              onCheckedChange={(v) =>
                                update(meta.key, { email: v })
                              }
                            />
                            Email
                          </label>
                        )}
                        {meta.timingLabel && (
                          <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            {meta.timingLabel}
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={t.days ?? 3}
                              onChange={(e) =>
                                update(meta.key, {
                                  days: Number(e.target.value),
                                })
                              }
                              className="h-7 w-16"
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(v) => update(meta.key, { enabled: v })}
                    aria-label={`Enable ${meta.label}`}
                  />
                </div>
              </div>
            );
          })}
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
