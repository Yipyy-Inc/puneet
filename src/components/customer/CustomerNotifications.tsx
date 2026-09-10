"use client";

import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatRelative } from "@/lib/i18n/format";

import { useState, useSyncExternalStore } from "react";
import { customerNotificationsStore } from "@/data/customer-notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
// Was a third local reimplementation of `Intl.RelativeTimeFormat` — after the
// facility notifications dropdown and the support bell, all three found this
// week. `formatRelative` does the thresholds, the wording, the 24-hour expiry
// §5q asks for, and the French.
import Link from "next/link";

export interface Notification {
  id: string;
  type:
    | "reminder"
    | "receipt"
    | "report_card"
    | "vaccination"
    | "booking_update"
    | "form_confirmed"
    | "form_reminder"
    | "form_correction";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  category: string;
}

// A group heading by the record's category. The category is stored as an
// English word ("Reminders"), so it is looked up here rather than shown as
// is; one this map does not know is shown as recorded.
const CATEGORY_KEY: Record<string, string> = {
  Reminders: "notifCatReminders",
  Payments: "notifCatPayments",
  Reports: "notifCatReports",
  Health: "notifCatHealth",
  Bookings: "notifCatBookings",
  Forms: "notifCatForms",
  Rewards: "notifCatRewards",
};

export function notificationCategoryLabel(
  category: string,
  t: (key: string) => string,
): string {
  return CATEGORY_KEY[category] ? t(CATEGORY_KEY[category]) : category;
}

const notificationIcons: Record<Notification["type"], string> = {
  reminder: "📅",
  receipt: "🧾",
  report_card: "📋",
  vaccination: "💉",
  booking_update: "✅",
  form_confirmed: "📝",
  form_reminder: "📄",
  form_correction: "⚠️",
};

export function CustomerNotifications() {
  const t = useShellText("customer");
  const locale = useShellLocale();
  const formatTimeAgo = (date: Date) => formatRelative(date, locale);
  const notifications = useSyncExternalStore(
    customerNotificationsStore.subscribe,
    customerNotificationsStore.getSnapshot,
    customerNotificationsStore.getSnapshot,
  );
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => customerNotificationsStore.markRead(id);

  const markAllAsRead = () => customerNotificationsStore.markAllRead();

  // Group notifications by category
  const groupedNotifications = notifications.reduce(
    (acc, notif) => {
      if (!acc[notif.category]) {
        acc[notif.category] = [];
      }
      acc[notif.category].push(notif);
      return acc;
    },
    {} as Record<string, Notification[]>,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t("notifications")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">{t("notifications")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              {t("markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              {t("noNotifications")}
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedNotifications).map(
                ([category, categoryNotifications]) => (
                  <div key={category} className="mb-4">
                    <div className="text-muted-foreground px-2 py-1 text-xs font-semibold uppercase">
                      {notificationCategoryLabel(category, t)}
                    </div>
                    {categoryNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`hover:bg-muted cursor-pointer rounded-lg p-3 transition-colors ${!notif.read ? "bg-muted/50" : ""} `}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.link) {
                            setOpen(false);
                          }
                        }}
                      >
                        {notif.link ? (
                          <Link href={notif.link} className="block">
                            <div className="flex items-start gap-3">
                              <span className="text-lg">
                                {notificationIcons[notif.type]}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={`text-sm font-medium ${!notif.read ? "font-semibold" : ""} `}
                                  >
                                    {notif.title}
                                  </p>
                                  {!notif.read && (
                                    <div className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                                  )}
                                </div>
                                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                  {notif.message}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  {formatTimeAgo(new Date(notif.createdAt))}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-start gap-3">
                            <span className="text-lg">
                              {notificationIcons[notif.type]}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-sm font-medium ${!notif.read ? "font-semibold" : ""} `}
                                >
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <div className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                                )}
                              </div>
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                                {notif.message}
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {formatTimeAgo(new Date(notif.createdAt))}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              )}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-xs"
                asChild
              >
                <Link href="/customer/notifications">
                  {t("viewAllNotifications")}
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
