"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  FileText,
  Info,
  AlertCircle,
  AlertTriangle,
  Paperclip,
  CheckCircle,
  Bed,
  PawPrint,
  Scissors,
  GraduationCap,
  Users,
  LogIn,
  LogOut,
  Calendar,
  MessageSquare,
  Puzzle,
} from "lucide-react";
import {
  getFacilityNotifications,
  markFacilityNotificationRead,
  markAllFacilityNotificationsRead,
  subscribeToFacilityNotifications,
} from "@/data/facility-notifications";
import type {
  FacilityNotification,
  FacilityNotificationType,
} from "@/types/facility";
import { useCustomServices } from "@/hooks/use-custom-services";

// ========================================
// Category config
// ========================================

interface CategoryTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const STATIC_CATEGORIES: CategoryTab[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "customers", label: "Customers", icon: Users },
  { id: "boarding", label: "Boarding", icon: Bed },
  { id: "daycare", label: "Daycare", icon: PawPrint },
  { id: "grooming", label: "Grooming", icon: Scissors },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "forms", label: "Forms", icon: FileText },
];

// ========================================
// Helpers
// ========================================

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

function iconForType(type: FacilityNotificationType): React.ReactNode {
  switch (type) {
    case "checkin":
      return <LogIn className="size-4 text-green-600" />;
    case "checkout":
      return <LogOut className="size-4 text-amber-600" />;
    case "booking_new":
      return <Calendar className="text-primary size-4" />;
    case "booking_cancelled":
      return <AlertCircle className="text-destructive size-4" />;
    case "attendance_alert":
      return <AlertTriangle className="size-4 text-amber-500" />;
    case "appointment_confirmed":
      return <CheckCircle className="size-4 text-green-600" />;
    case "appointment_completed":
      return <Scissors className="text-primary size-4" />;
    case "session_update":
      return <GraduationCap className="text-primary size-4" />;
    case "customer_registered":
      return <Users className="text-primary size-4" />;
    case "customer_message":
      return <MessageSquare className="text-primary size-4" />;
    case "incident":
      return <AlertTriangle className="text-destructive size-4" />;
    case "form_submission_new":
    case "yipyygo_submitted":
      return <FileText className="text-primary size-4" />;
    case "form_submission_red_flag":
      return <AlertTriangle className="text-destructive size-4" />;
    case "form_submission_has_files":
      return <Paperclip className="text-muted-foreground size-4" />;
    case "warning":
      return <AlertCircle className="size-4 text-amber-500" />;
    default:
      return <Info className="text-muted-foreground size-4" />;
  }
}

// ========================================
// NotificationItem
// ========================================

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: FacilityNotification;
  onMarkRead: (id: string) => void;
}) {
  const content = (
    <div
      className={`hover:bg-muted/50 flex gap-3 rounded-lg border p-3 transition-colors ${!notification.read ? "border-primary/20 bg-primary/5" : ""} `}
    >
      <div className="mt-0.5 shrink-0">
        <div className="bg-muted flex size-8 items-center justify-center rounded-full">
          {iconForType(notification.type)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{notification.title}</p>
          <span className="text-muted-foreground shrink-0 text-[10px]">
            {formatTime(notification.timestamp)}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {notification.message}
        </p>
      </div>
      {!notification.read && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 shrink-0 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
        >
          Mark read
        </Button>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        className="block"
        onClick={() => {
          if (!notification.read) onMarkRead(notification.id);
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

// ========================================
// NotificationCenter (main component)
// ========================================

export function NotificationCenter({
  facilityId = 11,
}: {
  facilityId?: number;
}) {
  const [notifications, setNotifications] = useState<FacilityNotification[]>(
    () => getFacilityNotifications(facilityId),
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const { modules } = useCustomServices();

  const refresh = useCallback(
    () => setNotifications(getFacilityNotifications(facilityId)),
    [facilityId],
  );

  useEffect(() => {
    const unsub = subscribeToFacilityNotifications(refresh);
    return unsub;
  }, [refresh]);

  const markRead = (id: string) => {
    markFacilityNotificationRead(id);
    refresh();
  };

  const markAllRead = () => {
    markAllFacilityNotificationsRead(facilityId);
    refresh();
  };

  // Build category tabs: static + dynamic from custom modules
  const activeModules = modules.filter((m) => m.status === "active");
  const categories: CategoryTab[] = [
    ...STATIC_CATEGORIES,
    ...activeModules.map((m) => ({
      id: m.slug,
      label: m.name,
      icon: Puzzle,
    })),
  ];

  // Filter notifications by category
  const filtered =
    activeCategory === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeCategory);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadByCategory = (cat: string) =>
    cat === "all"
      ? unreadCount
      : notifications.filter((n) => !n.read && n.category === cat).length;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-muted-foreground size-5" />
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const count = unreadByCategory(cat.id);
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon className="size-3.5" />
              {cat.label}
              {count > 0 && (
                <Badge
                  variant={activeCategory === cat.id ? "secondary" : "outline"}
                  className="ml-0.5 h-4 px-1 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Notification list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {activeCategory === "all"
              ? "All Notifications"
              : (categories.find((c) => c.id === activeCategory)?.label ??
                activeCategory)}
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              ({filtered.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
              <p className="font-medium">No notifications</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {activeCategory === "all"
                  ? "You're all caught up!"
                  : `No notifications in this category.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
