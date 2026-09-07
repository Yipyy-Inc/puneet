"use client";

import { useState } from "react";
import { Mail, Smartphone, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import { useCustomServices } from "@/hooks/use-custom-services";
import type { ServiceNotificationDefault } from "@/types/facility";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useServiceTypeLabel } from "@/lib/settings/use-service-types";

export function ServiceNotificationSettings() {
  const t = useSettingsText().section("notifications");
  const serviceLabel = useServiceTypeLabel();
  const { serviceNotifDefaults, updateServiceNotifDefaults } = useSettings();
  const { modules } = useCustomServices();
  const activeModules = modules.filter((m) => m.status === "active");

  // Merge custom modules that don't yet have a saved default
  const merged: ServiceNotificationDefault[] = [
    ...serviceNotifDefaults,
    ...activeModules
      .filter((m) => !serviceNotifDefaults.some((d) => d.serviceId === m.slug))
      .map((m) => ({
        serviceId: m.slug,
        serviceLabel: m.name,
        email: true,
        sms: false,
      })),
  ];

  const [local, setLocal] = useState<ServiceNotificationDefault[]>(merged);
  const [isEditing, setIsEditing] = useState(false);

  const toggle = (
    serviceId: string,
    channel: "email" | "sms",
    value: boolean,
  ) => {
    setLocal((prev) =>
      prev.map((d) =>
        d.serviceId === serviceId ? { ...d, [channel]: value } : d,
      ),
    );
  };

  const handleSave = () => {
    updateServiceNotifDefaults(local);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocal(merged);
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="text-muted-foreground size-4" />
          <div>
            <p className="text-[14.5px] font-semibold">
              {t("bookingDefaults")}
            </p>
            <p className="text-ink-tertiary text-[13.5px]">
              {t("bookingDefaultsHelp")}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {t("edit")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              {t("cancel")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t("save")}
            </Button>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_80px] gap-2 border-b px-4 py-2">
        <span className="text-ink-tertiary text-[12px] font-bold tracking-[0.06em] uppercase">
          {t("service")}
        </span>
        <span className="text-ink-tertiary flex items-center justify-center gap-1 text-[12px] font-bold tracking-[0.06em] uppercase">
          <Mail className="size-3" /> {t("email")}
        </span>
        <span className="text-muted-foreground flex items-center justify-center gap-1 text-xs font-semibold tracking-wide uppercase">
          <Smartphone className="size-3" /> SMS
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {local.map((def) => (
          <div
            key={def.serviceId}
            className="grid grid-cols-[1fr_80px_80px] items-center gap-2 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-medium">
                {serviceLabel(def.serviceId, def.serviceLabel)}
              </span>
              {!isEditing && (
                <div className="flex gap-1">
                  {def.email && (
                    <Badge variant="secondary" className="text-[12px]">
                      {t("email")}
                    </Badge>
                  )}
                  {def.sms && (
                    <Badge variant="secondary" className="text-[10px]">
                      SMS
                    </Badge>
                  )}
                  {!def.email && !def.sms && (
                    <Badge
                      variant="outline"
                      className="text-ink-tertiary text-[12px]"
                    >
                      {t("none")}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Switch
                checked={def.email}
                disabled={!isEditing}
                onCheckedChange={(v) => toggle(def.serviceId, "email", v)}
              />
            </div>
            <div className="flex justify-center">
              <Switch
                checked={def.sms}
                disabled={!isEditing}
                onCheckedChange={(v) => toggle(def.serviceId, "sms", v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
