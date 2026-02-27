"use client";

import { useState, useEffect } from "react";
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
// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
import Link from "next/link";

export interface Notification {
  id: string;
  type: "reminder" | "receipt" | "report_card" | "vaccination" | "booking_update";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  category: string;
}

// Mock notifications - in production, this would come from an API
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "reminder",
    title: "Upcoming Grooming Appointment",
    message: "Your grooming appointment for Max is tomorrow at 2:00 PM",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    link: "/customer/bookings",
    category: "Reminders",
  },
  {
    id: "2",
    type: "receipt",
    title: "Payment Receipt",
    message: "Receipt for your daycare booking on March 15, 2024",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    link: "/customer/billing",
    category: "Payments",
  },
  {
    id: "3",
    type: "report_card",
    title: "Report Card Available",
    message: "Max's daycare report card for March 14 is now available",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    link: "/customer/report-cards",
    category: "Reports",
  },
  {
    id: "4",
    type: "vaccination",
    title: "Vaccination Expiring Soon",
    message: "Max's Rabies vaccination expires in 30 days",
    read: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    link: "/customer/pets",
    category: "Health",
  },
  {
    id: "5",
    type: "booking_update",
    title: "Booking Confirmed",
    message: "Your boarding request for March 20-25 has been confirmed",
    read: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    link: "/customer/bookings",
    category: "Bookings",
  },
];

const notificationIcons: Record<Notification["type"], string> = {
  reminder: "📅",
  receipt: "🧾",
  report_card: "📋",
  vaccination: "💉",
  booking_update: "✅",
};

export function CustomerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Group notifications by category
  const groupedNotifications = notifications.reduce((acc, notif) => {
    if (!acc[notif.category]) {
      acc[notif.category] = [];
    }
    acc[notif.category].push(notif);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedNotifications).map(([category, categoryNotifications]) => (
                <div key={category} className="mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    {category}
                  </div>
                  {categoryNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors ${
                        !notif.read ? "bg-muted/50" : ""
                      }`}
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
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-sm font-medium ${
                                    !notif.read ? "font-semibold" : ""
                                  }`}
                                >
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notif.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm font-medium ${
                                  !notif.read ? "font-semibold" : ""
                                }`}
                              >
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimeAgo(new Date(notif.createdAt))}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
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
                <Link href="/customer/notifications">View all notifications</Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
