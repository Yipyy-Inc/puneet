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
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
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
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
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
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.timestamp}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                >
                  <X className="h-3 w-3" />
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
