"use client";

import { useState } from "react";
import { Mail, Smartphone, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import { useCustomServices } from "@/hooks/use-custom-services";
import type { ServiceNotificationDefault } from "@/types/facility";

export function ServiceNotificationSettings() {
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
            <p className="text-sm font-semibold">
              Booking Confirmation Defaults
            </p>
            <p className="text-muted-foreground text-xs">
              Pre-selected notification channels when confirming each service
              type. Staff can still override per booking.
            </p>
          </div>
        </div>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_80px_80px] gap-2 border-b px-4 py-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Service
        </span>
        <span className="text-muted-foreground flex items-center justify-center gap-1 text-xs font-semibold tracking-wide uppercase">
          <Mail className="size-3" /> Email
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
              <span className="text-sm font-medium">{def.serviceLabel}</span>
              {!isEditing && (
                <div className="flex gap-1">
                  {def.email && (
                    <Badge variant="secondary" className="text-[10px]">
                      Email
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
                      className="text-muted-foreground text-[10px]"
                    >
                      None
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
