"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  FileText,
  Info,
  AlertCircle,
  AlertTriangle,
  Paperclip,
  CheckCircle,
  Scissors,
  GraduationCap,
  Users,
  LogIn,
  LogOut,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getFacilityNotifications,
  getUnreadFacilityNotificationCount,
  markFacilityNotificationRead,
  markAllFacilityNotificationsRead,
  subscribeToFacilityNotifications,
} from "@/data/facility-notifications";
import type {
  FacilityNotification,
  FacilityNotificationType,
} from "@/types/facility";

interface FacilityNotificationsDropdownProps {
  facilityId?: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

function IconForType(type: FacilityNotificationType) {
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
    case "yipyygo_submitted":
    case "form_submission_new":
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

function NotificationRow({
  n,
  onMarkRead,
  onClose,
}: {
  n: FacilityNotification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}) {
  const content = (
    <div
      className={`hover:bg-muted/50 flex gap-2 px-3 py-2 ${!n.read ? "bg-primary/5" : ""} `}
    >
      <div className="mt-0.5 shrink-0">{IconForType(n.type)}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{n.title}</p>
        <p className="text-muted-foreground text-xs">{n.message}</p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          {formatTime(n.timestamp)}
        </p>
      </div>
      {!n.read && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(n.id);
          }}
        >
          Mark read
        </Button>
      )}
    </div>
  );

  if (n.link) {
    return (
      <Link
        href={n.link}
        className="block"
        onClick={() => {
          if (!n.read) onMarkRead(n.id);
          onClose();
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function FacilityNotificationsDropdown({
  facilityId = 11,
}: FacilityNotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<FacilityNotification[]>(
    () => getFacilityNotifications(facilityId),
  );
  const [open, setOpen] = useState(false);

  const refresh = useCallback(
    () => setNotifications(getFacilityNotifications(facilityId)),
    [facilityId],
  );
  const unreadCount = getUnreadFacilityNotificationCount(facilityId);

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="hover:bg-muted relative flex size-10 items-center justify-center rounded-xl transition-colors"
          aria-label="Notifications"
        >
          <Bell className="text-muted-foreground size-5" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[420px] w-80 overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-auto p-0 text-xs"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No notifications
          </div>
        ) : (
          <div className="py-1">
            {notifications.slice(0, 15).map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onMarkRead={markRead}
                onClose={() => setOpen(false)}
              />
            ))}
          </div>
        )}
        <div className="border-t px-3 py-2">
          <Link
            href="/facility/dashboard/notifications"
            className="text-primary text-xs hover:underline"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
