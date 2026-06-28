"use client";

import { useState } from "react";

import Link from "next/link";
import { Bell, CheckCheck, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  markAllNotificationsRead,
  useFacilityNotifications,
} from "@/lib/facility-notifications-store";

import { NotificationList } from "./notification-list";

export function FacilityNotificationBell() {
  const [open, setOpen] = useState(false);
  const items = useFacilityNotifications();
  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="group relative size-10 rounded-xl"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell className="text-muted-foreground group-hover:text-foreground size-5 transition-colors" />
        {unread > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <div className="flex items-center justify-between gap-2 pr-6">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="size-4" />
                Notifications
                {unread > 0 && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 text-xs font-medium">
                    {unread} new
                  </span>
                )}
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={unread === 0}
                onClick={markAllNotificationsRead}
              >
                <CheckCheck className="size-4" />
                Mark all read
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <NotificationList items={items} onNavigate={() => setOpen(false)} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-3">
            <Button variant="outline" size="sm" asChild>
              <Link
                href="/facility/notifications"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" asChild>
              <Link
                href="/facility/dashboard/settings?section=notifications"
                onClick={() => setOpen(false)}
              >
                <Settings className="size-4" />
                Notification Settings
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
