"use client";

import Link from "next/link";
import { MoreHorizontal, MailOpen, Mail, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  markFacilityNotificationRead,
  markFacilityNotificationUnread,
} from "@/data/facility-notifications";
import type { FacilityNotification } from "@/types/facility";

/**
 * Per-row overflow menu (spec Table 37). Replaces the inline "Mark read" button
 * so read/unread is demoted to its correct, secondary priority and stops
 * competing with the primary row click. Shared by the full page and the bell
 * dropdown so both behave identically.
 *
 * Read/unread is only offered for store-backed notifications (`canToggleRead`);
 * derived rows (booking requests, announcements) can't persist a read flip, so
 * their menu shows just "Navigate to …".
 */
const NAVIGATE_LABEL: Record<string, string> = {
  customers: "Customers",
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  forms: "Forms",
  yipyygo: "Express Check-in",
  schedule: "Schedule",
  tasks: "Tasks",
  system: "Announcements",
};

function navigateLabel(category?: string): string {
  if (!category) return "details";
  return (
    NAVIGATE_LABEL[category] ??
    category.charAt(0).toUpperCase() + category.slice(1)
  );
}

export function NotificationRowMenu({
  notification,
  canToggleRead,
  onNavigate,
}: {
  notification: FacilityNotification;
  canToggleRead: boolean;
  onNavigate?: () => void;
}) {
  // The row is wrapped in a <Link> (and, in the bell, inside another menu), so
  // every interaction here must stop the click from bubbling into navigation.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notification options"
          className="text-muted-foreground hover:text-foreground size-7 shrink-0 self-center"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={stop}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {canToggleRead &&
          (notification.read ? (
            <DropdownMenuItem
              onSelect={() => markFacilityNotificationUnread(notification.id)}
            >
              <Mail className="size-4" />
              Mark as unread
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => markFacilityNotificationRead(notification.id)}
            >
              <MailOpen className="size-4" />
              Mark as read
            </DropdownMenuItem>
          ))}
        {notification.link && (
          <DropdownMenuItem asChild>
            <Link href={notification.link} onClick={() => onNavigate?.()}>
              <ArrowUpRight className="size-4" />
              Navigate to {navigateLabel(notification.category)}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
