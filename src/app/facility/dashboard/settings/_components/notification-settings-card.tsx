"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Bell, Mail, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// Notification Settings Component
export function NotificationSettingsCard() {
  const { notifications, updateNotifications } = useSettings();

  return (
    <SettingsBlock
      title="Notification Settings"
      description="Configure which notifications are sent and through which channels"
      data={notifications}
      onSave={updateNotifications}
    >
      {(isEditing, localNotifications, setLocalNotifications) => (
        <div>
          {/* Group by category */}
          {["client", "staff", "system"].map((category) => (
            <div key={category} className="mb-6">
              <h3 className="mb-3 font-semibold capitalize">
                {category} Notifications
              </h3>
              <div className="space-y-3">
                {localNotifications
                  .filter((n) => n.category === category)
                  .map((notif) => (
                    <div key={notif.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="font-medium">{notif.name}</div>
                          <div className="text-muted-foreground text-sm">
                            {notif.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground size-4" />
                          <span className="text-sm">Email</span>
                          <Switch
                            checked={notif.email}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, email: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground size-4" />
                          <span className="text-sm">SMS</span>
                          <Switch
                            checked={notif.sms}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, sms: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="text-muted-foreground size-4" />
                          <span className="text-sm">Push</span>
                          <Switch
                            checked={notif.push}
                            disabled={!isEditing}
                            onCheckedChange={(checked) =>
                              setLocalNotifications(
                                localNotifications.map((n) =>
                                  n.id === notif.id
                                    ? { ...n, push: checked }
                                    : n,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsBlock>
  );
}
