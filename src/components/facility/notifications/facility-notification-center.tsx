"use client";

import { useState } from "react";

import Link from "next/link";
import { Bell, CheckCheck, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NOTIFICATION_GROUPS,
  type NotificationGroup,
} from "@/data/facility-notification-feed";
import {
  markAllNotificationsRead,
  useFacilityNotifications,
} from "@/lib/facility-notifications-store";
import { cn } from "@/lib/utils";

import { NotificationList } from "./notification-list";

type Filter = "all" | NotificationGroup;

export function FacilityNotificationCenter() {
  const items = useFacilityNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const unread = items.filter((n) => !n.read).length;
  const visible =
    filter === "all" ? items : items.filter((n) => n.group === filter);

  const chip = (
    key: Filter,
    label: string,
    count: number,
    unreadCount: number,
  ) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        filter === key
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-muted-foreground",
      )}
    >
      {label}
      <span className="text-muted-foreground text-xs">{count}</span>
      {unreadCount > 0 && (
        <span className="bg-primary size-1.5 rounded-full" aria-hidden />
      )}
    </button>
  );

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="size-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {unread > 0
              ? `${unread} unread across all activity`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={unread === 0}
            onClick={markAllNotificationsRead}
          >
            <CheckCheck className="size-4" />
            Mark All Read
          </Button>
          <Button variant="ghost" className="gap-2" asChild>
            <Link href="/facility/dashboard/settings?section=notifications">
              <Settings className="size-4" />
              Notification Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-2">
        {chip("all", "All", items.length, items.filter((n) => !n.read).length)}
        {NOTIFICATION_GROUPS.map((g) => {
          const groupItems = items.filter((n) => n.group === g.key);
          return chip(
            g.key,
            g.label,
            groupItems.length,
            groupItems.filter((n) => !n.read).length,
          );
        })}
      </div>

      <Card className="shadow-card border-0">
        <CardContent className="p-0">
          <NotificationList items={visible} />
        </CardContent>
      </Card>
    </div>
  );
}
