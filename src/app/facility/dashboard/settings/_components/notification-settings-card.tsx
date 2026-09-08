"use client";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Bell, Mail, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettingsText } from "@/lib/settings/use-settings-text";

/**
 * The catalogue key for a toggle's help line.
 *
 * Concatenated, not interpolated. `check:ui-french` reads a TEMPLATE LITERAL
 * as copy — that is how it catches `` `Clocked in at ${time}` `` — so building
 * the key as `` `${id}Help` `` put a bare "Help" on its list of untranslated
 * English. A false positive created by the fix for a real one, and worth the
 * two extra characters to avoid rather than an escape-hatch comment.
 */
function helpKey(id: string): string {
  return id + "Help";
}

// Notification Settings Component
export function NotificationSettingsCard() {
  const t = useSettingsText().section("notifications");
  const { notifications, updateNotifications } = useSettings();

  return (
    <SettingsBlock
      // This card lays its OWN rows out in two columns, so it takes the whole
      // row rather than sitting in one — see settings-card-grid.tsx.
      className="lg:col-span-2"
      title={t("settingsTitle")}
      description={t("settingsHelp")}
      data={notifications}
      onSave={updateNotifications}
    >
      {(isEditing, localNotifications, setLocalNotifications) => (
        <div>
          {/* Group by category */}
          {["client", "staff", "system"].map((category) => (
            <div key={category} className="mb-6">
              {/* Was `{category} Notifications` under a CSS `capitalize` —
                  the enum value rendered raw, so a French reader got "client
                  Notifications" title-cased by the stylesheet. The heading is
                  a whole string per category now. */}
              <h3 className="mb-3 font-semibold">
                {t(
                  category === "client"
                    ? "categoryClient"
                    : category === "staff"
                      ? "categoryStaff"
                      : "categorySystem",
                )}
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {localNotifications
                  .filter((n) => n.category === category)
                  .map((notif) => (
                    <div
                      key={notif.id}
                      className="flex flex-col rounded-lg border p-4"
                    >
                      <div className="mb-3">
                        <div>
                          {/* The fixture's `name` and `description` are
                              English and were rendered straight, so all six
                              read English to a French admin while the section
                              reported converted. The id is the catalogue key;
                              the row keeps its channel flags, which are the
                              part that is actually data. */}
                          <div className="font-medium">{t(notif.id)}</div>
                          <div className="text-muted-foreground text-sm">
                            {t(helpKey(notif.id))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground size-4" />
                          <span className="text-[14.5px]">{t("email")}</span>
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
                          <span className="text-[14.5px]">{t("push")}</span>
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
