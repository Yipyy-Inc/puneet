"use client";

import { Bell, UserCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChannelSelect } from "./ChannelSelect";
import {
  DEFAULT_CATEGORY_STATE,
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryKey,
  type NotificationCategoryState,
  type NotificationPreferences,
} from "./types";

type LanguageOption = { code: string; label: string };

interface CustomerPet {
  id: number;
  name: string;
  type?: string;
  breed?: string;
}

interface NotificationPreferencesCardProps {
  notificationPreferences: NotificationPreferences;
  setNotificationPreferences: (next: NotificationPreferences) => void;
  updateCategory: (
    key: NotificationCategoryKey,
    next: Partial<NotificationCategoryState[NotificationCategoryKey]>,
  ) => void;
  selectedNotificationLanguage: string;
  customerLanguageOptions: LanguageOption[];
  customerPets: CustomerPet[];
  isEditing: boolean;
}

export function NotificationPreferencesCard({
  notificationPreferences,
  setNotificationPreferences,
  updateCategory,
  selectedNotificationLanguage,
  customerLanguageOptions,
  customerPets,
  isEditing,
}: NotificationPreferencesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications from the facility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service notifications — what + how */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold">Service notifications</h3>
            <p className="text-muted-foreground hidden text-xs sm:block">
              Choose what to be notified about and where to receive it.
            </p>
          </div>

          <div className="divide-border/70 bg-card overflow-hidden rounded-xl border divide-y">
            {NOTIFICATION_CATEGORIES.filter((c) => c.group === "service").map(
              (cat) => {
                const state = notificationPreferences.categories[cat.key];
                const Icon = cat.icon;
                const isOn = state.enabled;
                return (
                  <div
                    key={cat.key}
                    data-enabled={isOn}
                    className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-6"
                  >
                    <label
                      htmlFor={`notif-${cat.key}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3",
                        !isEditing && "cursor-default",
                      )}
                    >
                      <Checkbox
                        id={`notif-${cat.key}`}
                        checked={isOn}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          const next: Partial<
                            NotificationCategoryState[NotificationCategoryKey]
                          > = { enabled };
                          // Re-enabling with no channels left? Restore the
                          // category's defaults so the user isn't stranded
                          // with an "on" toggle that delivers nothing.
                          if (enabled && state.channels.length === 0) {
                            next.channels =
                              DEFAULT_CATEGORY_STATE[cat.key].channels;
                          }
                          updateCategory(cat.key, next);
                        }}
                        disabled={!isEditing}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-lg",
                              cat.iconClass,
                              !isOn && "opacity-50",
                            )}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              !isOn && "text-muted-foreground",
                            )}
                          >
                            {cat.label}
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-1 ml-9 text-xs/relaxed">
                          {cat.description}
                        </p>
                      </div>
                    </label>

                    <div
                      className={cn(
                        "sm:justify-self-end sm:w-full pl-7 sm:pl-0",
                        !isOn && "pointer-events-none opacity-40",
                      )}
                    >
                      <ChannelSelect
                        value={state.channels}
                        onChange={(channels) =>
                          updateCategory(cat.key, { channels })
                        }
                        allowed={cat.allowedChannels}
                        disabled={!isEditing || !isOn}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* Marketing — separate group to make the consent boundary explicit */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold">Marketing</h3>
            <p className="text-muted-foreground hidden text-xs sm:block">
              Optional. Unsubscribe at any time.
            </p>
          </div>

          <div className="divide-border/70 bg-card overflow-hidden rounded-xl border divide-y">
            {NOTIFICATION_CATEGORIES.filter((c) => c.group === "marketing").map(
              (cat) => {
                const state = notificationPreferences.categories[cat.key];
                const Icon = cat.icon;
                const isOn = state.enabled;
                return (
                  <div
                    key={cat.key}
                    className="grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-6"
                  >
                    <label
                      htmlFor={`notif-${cat.key}`}
                      className={cn(
                        "flex cursor-pointer items-start gap-3",
                        !isEditing && "cursor-default",
                      )}
                    >
                      <Checkbox
                        id={`notif-${cat.key}`}
                        checked={isOn}
                        onCheckedChange={(checked) => {
                          const enabled = checked === true;
                          const next: Partial<
                            NotificationCategoryState[NotificationCategoryKey]
                          > = { enabled };
                          if (enabled && state.channels.length === 0) {
                            next.channels = ["email"];
                          }
                          updateCategory(cat.key, next);
                        }}
                        disabled={!isEditing}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-lg",
                              cat.iconClass,
                              !isOn && "opacity-50",
                            )}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              !isOn && "text-muted-foreground",
                            )}
                          >
                            {cat.label}
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-1 ml-9 text-xs/relaxed">
                          {cat.description}
                        </p>
                      </div>
                    </label>

                    <div
                      className={cn(
                        "sm:justify-self-end sm:w-full pl-7 sm:pl-0",
                        !isOn && "pointer-events-none opacity-40",
                      )}
                    >
                      <ChannelSelect
                        value={state.channels}
                        onChange={(channels) =>
                          updateCategory(cat.key, { channels })
                        }
                        allowed={cat.allowedChannels}
                        disabled={!isEditing || !isOn}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>

        <Separator />

        {customerPets.length > 0 && (
          <>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-base font-semibold">
                  Report cards by pet
                </h3>
                <p className="text-muted-foreground hidden text-xs sm:block">
                  Pick which pets should generate report cards.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {customerPets.map((pet) => {
                  const enabled =
                    notificationPreferences.perPetReportCards[pet.id] ?? true;
                  return (
                    <label
                      key={pet.id}
                      htmlFor={`pet-rc-${pet.id}`}
                      className={cn(
                        "bg-card hover:bg-muted/30 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        !isEditing && "cursor-default",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-sm">
                          {pet.type === "Dog"
                            ? "🐶"
                            : pet.type === "Cat"
                              ? "🐱"
                              : "🐾"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {pet.name}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {pet.breed}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`pet-rc-${pet.id}`}
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          setNotificationPreferences({
                            ...notificationPreferences,
                            perPetReportCards: {
                              ...notificationPreferences.perPetReportCards,
                              [pet.id]: checked,
                            },
                          })
                        }
                        disabled={!isEditing}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <Separator />
          </>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="mb-1 flex items-center gap-2">
              <Bell className="text-muted-foreground size-5" />
              <h3 className="text-lg font-semibold">
                Quiet Hours (SMS & Push)
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              During quiet hours, non‑urgent SMS and push notifications will be
              held and sent after your quiet period ends. Emergency alerts may
              still be delivered.
            </p>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Enable Quiet Hours</Label>
                <p className="text-muted-foreground text-xs">
                  Temporarily mute reminders and updates overnight.
                </p>
              </div>
              <Switch
                checked={notificationPreferences.quietHoursEnabled}
                onCheckedChange={(checked) =>
                  setNotificationPreferences({
                    ...notificationPreferences,
                    quietHoursEnabled: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            {notificationPreferences.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={notificationPreferences.quietHoursStart}
                    onChange={(e) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        quietHoursStart: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={notificationPreferences.quietHoursEnd}
                    onChange={(e) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        quietHoursEnd: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Language Preference */}
          <div className="space-y-4">
            <div className="mb-1 flex items-center gap-2">
              <UserCircle className="text-muted-foreground size-5" />
              <h3 className="text-lg font-semibold">Language Preference</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Choose the language you prefer for emails, SMS (where supported),
              and in‑app communications for facilities that support multiple
              languages.
            </p>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={selectedNotificationLanguage}
                onValueChange={(value) =>
                  setNotificationPreferences({
                    ...notificationPreferences,
                    language: value,
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {customerLanguageOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Language options are based on your facility settings.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
