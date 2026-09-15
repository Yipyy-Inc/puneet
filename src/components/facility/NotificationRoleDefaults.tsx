"use client";

import { useState } from "react";
import { RotateCcw, Users2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  NOTIFICATION_CATEGORIES,
  SHIPPED_ROLE_DEFAULTS,
  STAFF_ROLES,
  type NotificationCategory,
  type NotificationRoleDefaults as RoleDefaults,
  type StaffRole,
} from "@/lib/notifications/catalog";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// Which notification categories each staff role follows until a person chooses
// for themselves.
//
// It was a localStorage map keyed on six roles the database does not have
// ("front desk", "kennel tech"…), read by nothing that sent a notification. It
// is the `notification_role_defaults` settings domain now, keyed on the
// thirteen real roles, and the notification fan-out reads it. Incidents are
// mandatory: the switch is shown on and cannot be turned off.
// ============================================================================

export function NotificationRoleDefaults() {
  const t = useSettingsText().section("notifications");
  const { t: tc } = useStaffText("notificationCentre");
  const { t: tr } = useStaffText("notificationRoles");
  const { settings, isPending } = useFacilitySettings();
  const saveSetting = useSaveFacilitySetting();
  const stored = settings.notification_role_defaults.value;

  const [role, setRole] = useState<StaffRole>("reception");
  const [draft, setDraft] = useState<RoleDefaults | null>(null);
  const form = draft ?? stored;
  const enabled = new Set(form.roles[role] ?? []);

  const setCategory = (category: NotificationCategory, on: boolean) => {
    const next = new Set(form.roles[role] ?? []);
    if (on) next.add(category);
    else next.delete(category);
    setDraft({
      roles: {
        ...form.roles,
        [role]: NOTIFICATION_CATEGORIES.filter((c) => next.has(c)),
      },
    });
  };

  const resetRole = () =>
    setDraft({
      roles: { ...form.roles, [role]: [...SHIPPED_ROLE_DEFAULTS[role]] },
    });

  const handleSave = async () => {
    try {
      await saveSetting.mutateAsync({
        domain: "notification_role_defaults",
        value: form,
      });
      setDraft(null);
      toast.success(t("roleDefaultsSaved"));
    } catch (cause) {
      toast.error(t("roleDefaultsFailed"), {
        description: cause instanceof Error ? cause.message : undefined,
      });
    }
  };

  if (isPending) return <Skeleton className="h-96 w-full rounded-3xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="size-5" />
          {t("roleDefaultsTitle")}
        </CardTitle>
        <CardDescription>{t("roleDefaultsIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="notification-role">{t("roleLabel")}</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as StaffRole)}
            >
              <SelectTrigger id="notification-role" className="min-w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tr(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" onClick={resetRole}>
            <RotateCcw className="size-4" />
            {t("resetRole")}
          </Button>
        </div>

        <div className="divide-y rounded-2xl border">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const mandatory = category === "incidents";
            const id = `role-${role}-${category}`;
            return (
              <div
                key={category}
                className="flex min-h-12 items-center justify-between gap-4 px-4 py-2 max-lg:min-h-14"
              >
                <Label htmlFor={id} className="text-sm font-normal">
                  {tc(`cat_${category}`)}
                </Label>
                <Switch
                  id={id}
                  checked={mandatory || enabled.has(category)}
                  disabled={mandatory}
                  onCheckedChange={(on) => setCategory(category, on)}
                />
              </div>
            );
          })}
        </div>
        <p className="text-ink-tertiary text-[13.5px]">
          {t("incidentsAlwaysOn")}
        </p>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveSetting.isPending}>
            {saveSetting.isPending
              ? t("savingRoleDefaults")
              : t("saveRoleDefaults")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
