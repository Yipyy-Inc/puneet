"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Phone, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallAvailability } from "@/hooks/use-call-availability";
import {
  CALL_AVAILABILITY_META,
  CALL_AVAILABILITY_OPTIONS,
  formatCountdown,
} from "@/lib/calling/availability";

/**
 * Call-availability dot + quick toggle, shown beside the staff avatar in the
 * top navigation bar so each logged-in staff member can mark themselves
 * busy/away (excluded from the ring pool) without going offline.
 */
export function CallStatusIndicator() {
  const { status, secondsUntilReset, setStatus, resetToAvailable } =
    useCallAvailability();
  const meta = CALL_AVAILABILITY_META[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 rounded-xl transition-colors hover:bg-muted"
          aria-label={`Call status: ${meta.label}`}
          title={`Call status: ${meta.label}`}
        >
          <Phone className="size-5 text-muted-foreground" />
          <span
            className={cn(
              "absolute right-1 top-1 size-2.5 rounded-full ring-2 ring-background",
              meta.dot,
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Call availability</span>
          <span className={cn("flex items-center gap-1.5 text-xs font-medium", meta.text)}>
            <span className={cn("size-2 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CALL_AVAILABILITY_OPTIONS.map((opt) => {
          const m = CALL_AVAILABILITY_META[opt];
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => setStatus(opt)}
              className="cursor-pointer gap-2"
            >
              <span className={cn("size-2.5 rounded-full", m.dot)} />
              <span className="flex-1">
                <span className="block text-sm">{m.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {m.description}
                </span>
              </span>
              {status === opt && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {status !== "available" && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {secondsUntilReset != null ? (
                <>
                  Auto-resets to Available in{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCountdown(secondsUntilReset)}
                  </span>
                </>
              ) : (
                "Auto-resets to Available soon"
              )}
            </div>
            <DropdownMenuItem
              onClick={resetToAvailable}
              className="cursor-pointer gap-2"
            >
              <RotateCcw className="size-4" />
              Reset to Available now
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
