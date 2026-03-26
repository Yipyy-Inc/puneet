"use client";

import { useState } from "react";
import { Bell, CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  read: boolean;
  timestamp: string;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "New Facility Request",
    message: "HealthFirst Clinic has requested to join the platform",
    type: "info",
    read: false,
    timestamp: "2 min ago",
  },
  {
    id: "2",
    title: "Subscription Renewed",
    message: "FitLife Gym subscription has been renewed",
    type: "success",
    read: false,
    timestamp: "15 min ago",
  },
  {
    id: "3",
    title: "SLA Warning",
    message: "Ticket #TKT-003 is approaching SLA deadline",
    type: "warning",
    read: false,
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    title: "System Update Complete",
    message: "Platform has been updated to version 2.1.0",
    type: "success",
    read: true,
    timestamp: "3 hours ago",
  },
];

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-success size-4" />;
      case "warning":
        return <AlertCircle className="text-warning size-4" />;
      default:
        return <Info className="text-info size-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="hover:bg-muted relative flex size-10 items-center justify-center rounded-xl transition-colors">
          <Bell className="text-muted-foreground size-5" />
          {unreadCount > 0 && (
            <span className="bg-primary absolute top-2 right-2 size-2 animate-pulse rounded-full" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount} new
              </Badge>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground p-4 text-center text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`hover:bg-muted/50 flex cursor-pointer items-start gap-3 p-3 transition-colors ${!notification.read ? "bg-primary/5" : ""} `}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm/tight font-medium">
                    {notification.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {notification.message}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {notification.timestamp}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="outline" size="sm" className="w-full text-xs">
            View All Notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
