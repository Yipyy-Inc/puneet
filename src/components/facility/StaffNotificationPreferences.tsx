"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useMyNotificationSettings,
  useSaveMyNotificationPreferences,
} from "@/lib/api/staff-notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_KINDS,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/lib/notifications/catalog";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// My notifications: what reaches my bell and my email.
//
// This was a localStorage map keyed by a staff id, with SMS and push channels
// nothing could send and "urgent overrides" nothing read. It saves the
// signed-in person's own row now (/api/notifications/preferences), and the
// notification fan-out reads it. A category left alone follows the person's
// role default, and the screen says which it is following. Incidents always
// reach the bell.
// ============================================================================

const MANDATORY = new Set<NotificationCategory>(
  Object.values(NOTIFICATION_KINDS)
    .filter((kind) => kind.mandatory)
    .map((kind) => kind.category),
);

export function StaffNotificationPreferences() {
  const t = useSettingsText().section("my-notifications");
  const { t: tc } = useStaffText("notificationCentre");
  const { data, isPending, error } = useMyNotificationSettings();
  const save = useSaveMyNotificationPreferences();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);

  if (isPending) return <Skeleton className="h-96 w-full rounded-3xl" />;
  if (error || !data) {
    return (
      <Card>
        <CardContent className="text-destructive p-6 text-sm">
          {t("mineLoadFailed")}
        </CardContent>
      </Card>
    );
  }
  if (!data.role) {
    return (
      <Card>
        <CardContent className="text-ink-secondary p-6 text-sm">
          {t("noRole")}
        </CardContent>
      </Card>
    );
  }

  const role = data.role;
  const form = draft ?? data.preferences;
  const byRole = new Set(data.roleDefaults.roles[role] ?? []);

  const setSwitch = (
    channel: "inApp" | "email",
    category: NotificationCategory,
    on: boolean,
  ) => setDraft({ ...form, [channel]: { ...form[channel], [category]: on } });

  const followRole = (category: NotificationCategory) => {
    const inApp = { ...form.inApp };
    delete inApp[category];
    setDraft({ ...form, inApp });
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync(form);
      setDraft(null);
      toast.success(t("mineSaved"));
    } catch (cause) {
      toast.error(t("mineFailed"), {
        description: cause instanceof Error ? cause.message : undefined,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5" />
          {t("myTitle")}
        </CardTitle>
        <CardDescription>{t("myIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-ink-tertiary hidden grid-cols-[minmax(0,1fr)_5rem_5rem] gap-3 px-4 text-xs font-bold tracking-[.06em] uppercase sm:grid">
          <span />
          <span className="text-center">{t("columnInApp")}</span>
          <span className="text-center">{t("columnEmail")}</span>
        </div>
        <div className="divide-y rounded-2xl border">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const mandatory = MANDATORY.has(category);
            const chosen = form.inApp[category];
            const inApp = mandatory || (chosen ?? byRole.has(category));
            const email = form.email[category] ?? false;
            return (
              <div
                key={category}
                className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem]"
              >
                <div className="min-w-0">
                  <p className="text-foreground text-[15px] font-semibold">
                    {tc(`cat_${category}`)}
                  </p>
                  <p className="text-ink-tertiary text-[13.5px]">
                    {mandatory
                      ? t("incidentsLocked")
                      : chosen === undefined
                        ? t(
                            byRole.has(category)
                              ? "followsRoleOn"
                              : "followsRoleOff",
                          )
                        : t("yourChoice")}
                    {!mandatory && chosen !== undefined && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className="text-primary font-semibold hover:underline"
                          onClick={() => followRole(category)}
                        >
                          {t("useRoleSetting")}
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <label className="flex items-center gap-2 sm:justify-center">
                  <span className="text-ink-secondary text-sm sm:hidden">
                    {t("columnInApp")}
                  </span>
                  <Switch
                    checked={inApp}
                    disabled={mandatory}
                    aria-label={`${tc(`cat_${category}`)}, ${t("columnInApp")}`}
                    onCheckedChange={(on) => setSwitch("inApp", category, on)}
                  />
                </label>
                <label className="flex items-center gap-2 sm:justify-center">
                  <span className="text-ink-secondary text-sm sm:hidden">
                    {t("columnEmail")}
                  </span>
                  <Switch
                    checked={email && inApp}
                    disabled={!inApp}
                    aria-label={`${tc(`cat_${category}`)}, ${t("columnEmail")}`}
                    onCheckedChange={(on) => setSwitch("email", category, on)}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <p className="text-ink-tertiary text-[13.5px]">{t("emailNeedsBell")}</p>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? t("savingMine") : t("saveMine")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
