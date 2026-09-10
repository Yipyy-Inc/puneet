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
import { useCustomerText } from "@/lib/customer/use-customer-text";

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
  const { t } = useCustomerText("settings");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5" />
          {t("notificationPreferences")}
        </CardTitle>
        <CardDescription>{t("chooseHowYouWantTo")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service notifications — what + how */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold">
              {t("serviceNotifications")}
            </h3>
            <p className="text-muted-foreground hidden text-xs sm:block">
              {t("chooseWhatToBeNotified")}
            </p>
          </div>

          <div className="divide-border/70 bg-card divide-y overflow-hidden rounded-xl border">
            {NOTIFICATION_CATEGORIES.filter((c) => c.group === "service").map(
              (cat) => {
                const state = notificationPreferences.categories[cat.key];
                const Icon = cat.icon;
                const isOn = state.enabled;
                return (
                  <div
                    key={cat.key}
                    data-enabled={isOn}
                    className="hover:bg-muted/20 grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-6"
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
                            {t(cat.labelKey)}
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-1 ml-9 text-xs/relaxed">
                          {t(cat.descriptionKey)}
                        </p>
                      </div>
                    </label>

                    <div
                      className={cn(
                        "pl-7 sm:w-full sm:justify-self-end sm:pl-0",
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
            <h3 className="text-base font-semibold">{t("marketing")}</h3>
            <p className="text-muted-foreground hidden text-xs sm:block">
              {t("optionalUnsubscribeAtAnyTime")}
            </p>
          </div>

          <div className="divide-border/70 bg-card divide-y overflow-hidden rounded-xl border">
            {NOTIFICATION_CATEGORIES.filter((c) => c.group === "marketing").map(
              (cat) => {
                const state = notificationPreferences.categories[cat.key];
                const Icon = cat.icon;
                const isOn = state.enabled;
                return (
                  <div
                    key={cat.key}
                    className="hover:bg-muted/20 grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors sm:grid-cols-[1fr_minmax(0,18rem)] sm:gap-6"
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
                            {t(cat.labelKey)}
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-1 ml-9 text-xs/relaxed">
                          {t(cat.descriptionKey)}
                        </p>
                      </div>
                    </label>

                    <div
                      className={cn(
                        "pl-7 sm:w-full sm:justify-self-end sm:pl-0",
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
                  {t("reportCardsByPet")}
                </h3>
                <p className="text-muted-foreground hidden text-xs sm:block">
                  {t("pickWhichPetsShouldGenerate")}
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
                {t("quietHoursSmsPush")}
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("quietHoursHint")}
            </p>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">{t("enableQuietHours")}</Label>
                <p className="text-muted-foreground text-xs">
                  {t("temporarilyMuteRemindersAndUpdates")}
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
                  <Label htmlFor="quiet-start">{t("startTime")}</Label>
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
                  <Label htmlFor="quiet-end">{t("endTime")}</Label>
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
              <h3 className="text-lg font-semibold">
                {t("languagePreference")}
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("languagePreferenceHint")}
            </p>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="language">{t("language")}</Label>
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
                  <SelectValue placeholder={t("selectLanguage")} />
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
                {t("languageOptionsAreBasedOn")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
