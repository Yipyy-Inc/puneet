"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { bookingQueries } from "@/lib/api/booking";
import { groupRequests } from "@/lib/bookings/request-decision";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const OPEN = ["request_submitted"] as const;

function formatBadge(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "";
  if (count > 99) return "99+";
  return String(Math.floor(count));
}

export function BookingRequestsTopbarDropdown({
  className,
}: {
  className?: string;
}) {
  // The facility’s own open requests — one per request, so a three-day
  // daycare request is one. It counted a localStorage fixture for facility 11,
  // so a real request never moved it.
  const { t } = useStaffText("bookingRequests");
  const { data: open } = useQuery(bookingQueries.byStatus(OPEN));
  const pendingCount = React.useMemo(
    () => (open ? groupRequests(open).length : 0),
    [open],
  );
  const badge = formatBadge(pendingCount);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("topbarLabel")}
            className={cn("relative size-10 rounded-xl", className)}
            data-has-badge={badge ? "true" : "false"}
            asChild
          >
            <Link href="/facility/dashboard/online-booking">
              <CalendarClock className="text-muted-foreground size-5" />
              {badge ? (
                <span
                  data-slot="topbar-badge"
                  className="bg-destructive absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1.5 text-center text-[10px]/5 font-medium text-white"
                >
                  {badge}
                </span>
              ) : null}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          {t("topbarLabel")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
