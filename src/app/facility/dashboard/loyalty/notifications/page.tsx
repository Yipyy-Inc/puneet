"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NotificationSettingsEditor } from "@/components/loyalty/config/NotificationSettingsEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { buildDefaultNotificationSettings } from "@/data/facility-loyalty-config";
import type { LoyaltyNotificationSettings } from "@/types/loyalty";

export default function NotificationsPage() {
  const { config, facilityId, updateConfig, isPending, isSaving } =
    useLoyaltyProgram();

  // The builder is a STARTING POINT for a facility that has never set these,
  // not a stored value — every toggle in it is off-by-default rather than a
  // choice inherited from the fixture. It is only reached when the stored
  // settings are absent.
  const saved =
    config.notificationSettings ?? buildDefaultNotificationSettings(facilityId);

  // Derived, not seeded. See the badges page.
  const [draft, setDraft] = useState<LoyaltyNotificationSettings | null>(null);
  const settings = draft ?? saved;
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-muted-foreground text-sm">
          Turn each loyalty notification on or off, choose how it&apos;s
          delivered, and customise the message.
        </p>
      </div>

      <NotificationSettingsEditor value={settings} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        saving={isSaving}
        onSave={async () => {
          try {
            await updateConfig({ ...config, notificationSettings: settings });
            setDraft(null);
            toast.success("Notification settings saved");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Notification settings were not saved.",
            );
          }
        }}
        onReset={() => setDraft(null)}
      />
    </div>
  );
}
