"use client";

import { useState } from "react";
import { toast } from "sonner";
import { NotificationSettingsEditor } from "@/components/loyalty/config/NotificationSettingsEditor";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { buildDefaultNotificationSettings } from "@/data/facility-loyalty-config";
import type { LoyaltyNotificationSettings } from "@/types/loyalty";

export default function NotificationsPage() {
  const { config, facilityId, updateConfig } = useLoyaltyProgram();
  const fallback = () =>
    config.notificationSettings ?? buildDefaultNotificationSettings(facilityId);
  const [draft, setDraft] = useState<LoyaltyNotificationSettings>(fallback);

  const dirty = JSON.stringify(draft) !== JSON.stringify(fallback());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-muted-foreground text-sm">
          Turn each loyalty notification on or off, choose how it&apos;s
          delivered, and customise the message.
        </p>
      </div>

      <NotificationSettingsEditor value={draft} onChange={setDraft} />

      <SaveBar
        dirty={dirty}
        onSave={() => {
          updateConfig({ ...config, notificationSettings: draft });
          toast.success("Notification settings saved");
        }}
        onReset={() => setDraft(fallback())}
      />
    </div>
  );
}
