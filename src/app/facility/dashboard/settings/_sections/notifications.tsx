"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationRoleDefaults } from "@/components/facility/NotificationRoleDefaults";
import { ServiceNotificationSettings } from "@/components/facility/ServiceNotificationSettings";

import { Button } from "@/components/ui/button";
import { NotificationSettingsCard } from "../_components/notification-settings-card";
import { useSettingsText } from "@/lib/settings/use-settings-text";

export function NotificationsSection() {
  const t = useSettingsText().section("notifications");
  return (
    <div className="space-y-6">
      {/* `StaffNotificationPreferences` used to open this screen, and it
          does not belong here: it takes `staffId ?? user.id`, so with no
          prop it renders the VIEWER'S OWN preferences — the identical card
          My notifications already owns. An admin came to set notification
          defaults for the facility and was met by their personal toggles,
          which look like the facility's and are not. It lives in one place
          now, under My account. */}

      {/* Facility-level per-role notification defaults (spec Table 51). */}
      <NotificationRoleDefaults />

      <NotificationSettingsCard />

      <ServiceNotificationSettings />

      {/* Template Editor */}
      <Card>
        <CardHeader>
          <CardTitle>{t("templateEditor")}</CardTitle>
          <p className="text-ink-tertiary mt-1 text-[14.5px]">
            {t("templateEditorHelp")}
          </p>
        </CardHeader>
        <CardContent>
          <Link href="/facility/dashboard/communications">
            <Button variant="outline">{t("openTemplateEditor")}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
