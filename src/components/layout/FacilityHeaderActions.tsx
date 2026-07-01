"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { LocationTopNavSelector } from "@/components/hq/LocationTopNavSelector";
import { CallingButton } from "@/components/layout/CallingButton";
import { TopBarIconsNext } from "@/components/layout/TopBarIconsNext";
import { TaskNotificationsPanel } from "@/components/tasks/TaskNotificationsPanel";
import { ScheduleNotificationsDropdown } from "@/components/scheduling/ScheduleNotificationsDropdown";
import { FacilityNotificationBell } from "@/components/facility/notifications/facility-notification-bell";
import { AnnouncementBell } from "@/components/facility/announcement-bell";
import { BookingRequestsTopbarDropdown } from "@/components/facility/BookingRequestsTopbarDropdown";
import { HeaderDropdown } from "@/components/layout/HeaderDropdown";
import { FacilityHeader } from "@/components/layout/FacilityHeader";
import { CallStatusIndicator } from "@/components/layout/CallStatusIndicator";
import { UserProfileSheet } from "@/components/layout/UserProfileSheet";

/**
 * Facility top-nav action cluster (FB-16 — rebalanced after the Support button
 * was removed in FB-1). Items are evenly spaced with a single consistent gap so
 * nothing competes. At ≥1280px (xl) every item sits inline on one row; the row
 * is `shrink-0`, so icons never wrap or compress (the left-hand search shrinks
 * first). Below xl (tablet/mobile) the SECONDARY items collapse into a single
 * overflow ("More") menu, keeping the location selector, unified notifications
 * and the user avatar always visible.
 */
export function FacilityHeaderActions({ facilityId }: { facilityId: number }) {
  const isWide = useMediaQuery("(min-width: 1280px)", true);

  // Rendered inline on desktop, or inside the overflow popover on tablet —
  // exactly one of the two branches mounts, so there are no duplicate instances.
  const secondary = (
    <>
      <CallingButton />
      <TopBarIconsNext />
      <TaskNotificationsPanel />
      <ScheduleNotificationsDropdown />
      <AnnouncementBell facilityId={facilityId} />
      <BookingRequestsTopbarDropdown />
      <HeaderDropdown />
      <FacilityHeader facilityId={facilityId} />
      <CallStatusIndicator />
    </>
  );

  return (
    <div className="flex shrink-0 items-center gap-1">
      <LocationTopNavSelector />

      {isWide ? (
        <div className="flex items-center gap-1">{secondary}</div>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More options"
              className="hover:bg-muted size-9 rounded-xl"
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto max-w-[80vw] p-2">
            <div className="flex flex-wrap items-center justify-end gap-1">
              {secondary}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <FacilityNotificationBell />
      <UserProfileSheet showNotifications={false} />
    </div>
  );
}
