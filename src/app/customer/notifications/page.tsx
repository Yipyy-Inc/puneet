"use client";

import { useState, useSyncExternalStore } from "react";
import {
  notificationCategoryLabel,
  type Notification,
} from "@/components/customer/CustomerNotifications";
import { customerNotificationsStore } from "@/data/customer-notifications";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { useShellText } from "@/lib/shell/use-shell-text";
import { formatRelative } from "@/lib/i18n/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

// The same store the header's bell reads. This page used to keep its own copy
// of the mock list, so marking a notification read here left it unread in
// the bell, and the three form notifications existed only here. Still a
// client-side mock — see the debt map, "Notifications".
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

export default function NotificationsPage() {
  const { t, fill, locale } = useCustomerText("notifications");
  const shellT = useShellText("customer");
  const notifications = useSyncExternalStore(
    customerNotificationsStore.subscribe,
    customerNotificationsStore.getSnapshot,
    customerNotificationsStore.getSnapshot,
  );
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => customerNotificationsStore.markRead(id);

  const markAllAsRead = () => customerNotificationsStore.markAllRead();

  const deleteNotification = (id: string) =>
    customerNotificationsStore.remove(id);

  // Group by category
  const groupedNotifications = filteredNotifications.reduce(
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
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={t("notifications")}
          description={
            unreadCount > 0
              ? fill(unreadCount === 1 ? "unreadOne" : "unreadMany", {
                  n: unreadCount,
                })
              : t("allCaughtUp")
          }
        />
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCircle2 className="mr-2 size-4" />
            {t("markAllAsRead")}
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">{t("tabAll")}</TabsTrigger>
          <TabsTrigger value="unread">
            {t("tabUnread")} {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="read">{t("tabRead")}</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4 space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {filter === "unread"
                    ? t("noUnread")
                    : filter === "read"
                      ? t("noRead")
                      : t("noNotifications")}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedNotifications).map(
              ([category, categoryNotifications]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-muted-foreground text-sm font-semibold uppercase">
                      {notificationCategoryLabel(category, shellT)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {categoryNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          !notif.read
                            ? "border-primary/20 bg-muted/50"
                            : "bg-background"
                        } `}
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 text-2xl">
                            {notificationIcons[notif.type]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3
                                    className={`text-sm font-medium ${!notif.read ? "font-semibold" : ""} `}
                                  >
                                    {notif.title}
                                  </h3>
                                  {!notif.read && (
                                    <div className="bg-primary size-2 shrink-0 rounded-full" />
                                  )}
                                </div>
                                <p className="text-muted-foreground mt-1 text-sm">
                                  {notif.message}
                                </p>
                                <p className="text-muted-foreground mt-2 text-xs">
                                  {formatRelative(notif.createdAt, locale)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notif.read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() => markAsRead(notif.id)}
                                    title={t("markAsRead")}
                                    aria-label={t("markAsRead")}
                                  >
                                    <CheckCircle2 className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => deleteNotification(notif.id)}
                                  title={t("delete")}
                                  aria-label={t("delete")}
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </div>
                            {notif.link && (
                              <Button
                                variant="link"
                                size="sm"
                                className="mt-2 h-auto p-0 text-xs"
                                asChild
                              >
                                <Link href={notif.link}>
                                  {t("viewDetails")}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ),
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
