"use client";

import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClock, toggleClock } from "@/lib/employee/clock-store";

// Core staff action — works on all viewports (large tap target).
export function ClockInOut({ staffId }: { staffId: string }) {
  const { clockedIn } = useClock(staffId);
  return (
    <Button
      variant={clockedIn ? "default" : "outline"}
      size="sm"
      className="h-9 gap-1.5"
      onClick={() => {
        const nowIn = toggleClock(staffId);
        toast.success(nowIn ? "Clocked in" : "Clocked out");
      }}
    >
      <Clock className="size-4" />
      <span className="text-xs font-medium">
        {clockedIn ? "Clock out" : "Clock in"}
      </span>
    </Button>
  );
}
