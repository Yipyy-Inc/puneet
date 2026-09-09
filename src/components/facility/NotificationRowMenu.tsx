"use client";

import Link from "next/link";
import { MoreHorizontal, MailOpen, Mail, ArrowUpRight } from "lucide-react";
import { useStaffText } from "@/lib/staff/use-staff-text";

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
/** Category → catalogue key. The words live in the catalogue. */
const NAVIGATE_KEY: Record<string, string> = {
  customers: "navCustomers",
  boarding: "navBoarding",
  daycare: "navDaycare",
  grooming: "navGrooming",
  training: "navTraining",
  forms: "navForms",
  yipyygo: "navYipyygo",
  schedule: "navSchedule",
  tasks: "navTasks",
  system: "navSystem",
};

export function NotificationRowMenu({
  notification,
  canToggleRead,
  onNavigate,
}: {
  notification: FacilityNotification;
  canToggleRead: boolean;
  onNavigate?: () => void;
}) {
  const { t, fill } = useStaffText("notificationMenu");

  /**
   * A category's words. An unknown one falls through to the capitalised slug
   * — which cannot translate, but at least reads as words.
   */
  const navigateLabel = (category?: string) => {
    if (!category) return t("details");
    const key = NAVIGATE_KEY[category];
    if (key) return t(key);
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // The row is wrapped in a <Link> (and, in the bell, inside another menu), so
  // every interaction here must stop the click from bubbling into navigation.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("options")}
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
              {t("markUnread")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => markFacilityNotificationRead(notification.id)}
            >
              <MailOpen className="size-4" />
              {t("markRead")}
            </DropdownMenuItem>
          ))}
        {notification.link && (
          <DropdownMenuItem asChild>
            <Link href={notification.link} onClick={() => onNavigate?.()}>
              <ArrowUpRight className="size-4" />
              {fill("navigateTo", {
                where: navigateLabel(notification.category),
              })}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
