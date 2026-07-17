"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TopBarIconsNext } from "@/components/layout/TopBarIconsNext";
import { getUnreadMessagesCount } from "@/lib/messaging-unread";
import { FacilityNotificationsDropdown } from "@/components/facility/FacilityNotificationsDropdown";
import { HeaderDropdown } from "@/components/layout/HeaderDropdown";
import { FacilityHeader } from "@/components/layout/FacilityHeader";
import { UserProfileSheet } from "@/components/layout/UserProfileSheet";

/**
 * Facility top-nav action cluster. Trimmed per spec Part 3 + Table 52: calling
 * moved to the sidebar; the task, schedule, announcement and booking-request
 * dropdowns were removed — their content now surfaces through the unified
 * notification bell (their component logic is reused only as data sources).
 *
 * The right side is: + New · Messages · Bell · Avatar (plus the EN/FR language
 * toggle, which renders only when >1 locale is enabled). The prominent "+ New"
 * create button, the bell and the avatar stay visible at every breakpoint; the
 * HQ View / location selector moved out of the header to a page-level control
 * (spec Table 17 — see LocationFilterBanner). At ≥1280px (xl) the secondary
 * items (Messages, language) sit inline; below xl they collapse into a single
 * overflow ("More") menu.
 */
// Stable (module-level) counts source for the Messages badge — reads the real
// mock message data instead of localStorage. Stable identity keeps the polling
// effect in TopBarIcons from re-subscribing every render.
async function facilityTopBarCounts() {
  return { unreadMessages: getUnreadMessagesCount() };
}

export function FacilityHeaderActions({ facilityId }: { facilityId: number }) {
  const isWide = useMediaQuery("(min-width: 1280px)", true);

  // Rendered inline on desktop, or inside the overflow popover on tablet —
  // exactly one of the two branches mounts, so there are no duplicate instances.
  const secondary = (
    <>
      <TopBarIconsNext getCounts={facilityTopBarCounts} />
      <HeaderDropdown />
    </>
  );

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* The primary "+ New" create button stays visible + leftmost at every
          breakpoint (spec Table 18 & 19) — it does not collapse into "More". */}
      <FacilityHeader facilityId={facilityId} />

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

      <FacilityNotificationsDropdown facilityId={facilityId} />
      <UserProfileSheet showNotifications={false} />
    </div>
  );
}
