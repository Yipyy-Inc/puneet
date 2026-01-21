"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookingRequestsPanel } from "@/components/facility/BookingRequestsPanel";

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
  const facilityId = 11;
  const { requests } = useBookingRequestsStore();
  const pendingCount = React.useMemo(
    () => requests.filter((r) => r.facilityId === facilityId && r.status === "pending").length,
    [requests, facilityId],
  );
  const badge = formatBadge(pendingCount);

  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Booking requests"
                className={cn("relative h-10 w-10 rounded-xl", className)}
                data-has-badge={badge ? "true" : "false"}
              >
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                {badge ? (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] leading-5 text-center font-medium">
                    {badge}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Booking requests
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[720px] max-w-[calc(100vw-1.5rem)] p-0 max-h-[70vh] overflow-auto"
      >
        <BookingRequestsPanel variant="dropdown" />
      </PopoverContent>
    </Popover>
  );
}

