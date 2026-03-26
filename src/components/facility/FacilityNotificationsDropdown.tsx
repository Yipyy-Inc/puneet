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
      return <FileText className="text-primary size-4" />;
    case "form_submission_red_flag":
      return <AlertTriangle className="text-destructive size-4" />;
    case "form_submission_has_files":
      return <Paperclip className="text-muted-foreground size-4" />;
    case "warning":
      return <AlertCircle className="text-warning size-4" />;
    default:
      return <Info className="text-muted-foreground size-4" />;
  }
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
            <span className="bg-primary absolute top-2 right-2 size-2 animate-pulse rounded-full" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[360px] w-80 overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b px-2 py-1.5">
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
            {notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                className={`hover:bg-muted/50 flex gap-2 px-3 py-2 ${!n.read ? `bg-primary/5` : ""} `}
              >
                <div className="mt-0.5 shrink-0">{IconForType(n.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-muted-foreground text-xs">{n.message}</p>
                  {(n.type === "form_submission_new" ||
                    n.type === "form_submission_red_flag" ||
                    n.type === "form_submission_has_files") &&
                    n.submissionId && (
                      <Link
                        href={`/facility/dashboard/forms/submissions/${n.submissionId}`}
                        className="text-primary mt-1 inline-block text-xs hover:underline"
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
                      className="text-primary mt-1 inline-block text-xs hover:underline"
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      Review form →
                    </Link>
                  )}
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    {formatTime(n.timestamp)}
                  </p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 text-xs"
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
