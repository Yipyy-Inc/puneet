"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, FileText, Info, AlertCircle, AlertTriangle, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  type FacilityNotification,
  type FacilityNotificationType,
} from "@/data/facility-notifications";

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
    case "yipyygo_submitted":
    case "form_submission_new":
      return <FileText className="h-4 w-4 text-primary" />;
    case "form_submission_red_flag":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "form_submission_has_files":
      return <Paperclip className="h-4 w-4 text-muted-foreground" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-warning" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

export function FacilityNotificationsDropdown({ facilityId = 11 }: FacilityNotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<FacilityNotification[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = () => setNotifications(getFacilityNotifications(facilityId));
  const unreadCount = getUnreadFacilityNotificationCount(facilityId);

  useEffect(() => {
    refresh();
    const unsub = subscribeToFacilityNotifications(refresh);
    return unsub;
  }, [facilityId]);

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
          className="relative flex items-center justify-center h-10 w-10 rounded-xl hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[360px] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5 border-b">
          <span className="font-medium text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="py-1">
            {notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={`flex gap-2 px-3 py-2 hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="shrink-0 mt-0.5">{IconForType(n.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  {(n.type === "form_submission_new" || n.type === "form_submission_red_flag" || n.type === "form_submission_has_files") && n.submissionId && (
                    <Link
                      href={`/facility/dashboard/forms/submissions/${n.submissionId}`}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      View submission →
                    </Link>
                  )}
                  {n.type === "yipyygo_submitted" && n.bookingId != null && (
                    <Link
                      href={`/facility/dashboard/bookings/${n.bookingId}#yipyygo`}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      Review form →
                    </Link>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.timestamp)}</p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-6 text-xs"
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
