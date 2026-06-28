"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  LogIn,
  Megaphone,
  Puzzle,
  Receipt,
  Timer,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  NOTIFICATION_GROUPS,
  type FacilityNotificationItem,
  type NotificationGroup,
} from "@/data/facility-notification-feed";
import { markNotificationRead } from "@/lib/facility-notifications-store";
import { cn } from "@/lib/utils";

const GROUP_META: Record<NotificationGroup, { icon: LucideIcon; cls: string }> =
  {
    bookings: { icon: Calendar, cls: "text-indigo-600" },
    clients: { icon: Users, cls: "text-violet-600" },
    financial: { icon: DollarSign, cls: "text-emerald-600" },
    staff: { icon: UserCog, cls: "text-amber-600" },
    system: { icon: Megaphone, cls: "text-slate-600" },
  };

const SUBTYPE_ICON: Record<string, LucideIcon> = {
  new: CalendarPlus,
  cancellation: CalendarX,
  modification: CalendarClock,
  registration: UserPlus,
  document: FileText,
  profile: UserCog,
  payment: CheckCircle2,
  invoice_due: Receipt,
  overdue: AlertTriangle,
  login: LogIn,
  shift: Clock,
  clock_in: Timer,
  module: Puzzle,
  announcement: Megaphone,
};

function formatAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export function NotificationList({
  items,
  onNavigate,
}: {
  items: FacilityNotificationItem[];
  onNavigate?: () => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        You&rsquo;re all caught up — no notifications.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {NOTIFICATION_GROUPS.map((g) => {
        const groupItems = items.filter((i) => i.group === g.key);
        if (groupItems.length === 0) return null;
        const GroupIcon = GROUP_META[g.key].icon;
        const unread = groupItems.filter((i) => !i.read).length;
        return (
          <div key={g.key} className="py-1">
            <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-wide uppercase">
              <GroupIcon className={cn("size-3.5", GROUP_META[g.key].cls)} />
              {g.label}
              {unread > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-1.5 text-[10px]">
                  {unread}
                </span>
              )}
            </div>
            {groupItems.map((item) => {
              const Icon =
                SUBTYPE_ICON[item.subtype] ?? GROUP_META[item.group].icon;
              return (
                <Link
                  key={item.id}
                  href={item.link}
                  onClick={() => {
                    markNotificationRead(item.id);
                    onNavigate?.();
                  }}
                  className={cn(
                    "hover:bg-muted/50 flex items-start gap-3 px-4 py-2.5 transition-colors",
                    !item.read && "bg-primary/3",
                  )}
                >
                  <span
                    className={cn(
                      "bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      GROUP_META[item.group].cls,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      {!item.read && (
                        <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {item.description}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {formatAgo(item.minutesAgo)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
