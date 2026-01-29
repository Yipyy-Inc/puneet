"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
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
                  <span
                    data-slot="topbar-badge"
                    className="absolute -right-1 -top-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] leading-5 text-center font-medium"
                  >
                    {badge}
                  </span>
                ) : null}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Booking requests
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="min-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogTitle className="sr-only">Booking requests</DialogTitle>
        <div className="flex-1 overflow-auto">
          <BookingRequestsPanel variant="card" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

