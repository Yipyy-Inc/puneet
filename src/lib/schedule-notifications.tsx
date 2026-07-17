"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { broadcastMessages } from "@/data/scheduling";
import { decideShiftSwap, useShiftSwaps } from "@/lib/shift-swaps-store";
import type { FacilityNotification } from "@/types/facility";

/**
 * Schedule notifications (spec Tables 32 & 33) surfaced through the unified
 * bell + full page. Their content is DERIVED live from the scheduling stores so
 * there is no second copy to keep in sync:
 *  - pending shift-swaps  → type "shift_swap"       (unread, actionable inline)
 *  - staff broadcasts     → type "staff_announcement" (informational)
 *
 * A swap notification carries the swap id in its notification id
 * (`sched-swap-<swapId>`); resolving it (Approve/Decline) flips the swap out of
 * "pending" in the store, so the derived notification simply disappears.
 */
const SWAP_PREFIX = "sched-swap-";

/** Extract the swap id from a `shift_swap` notification's id, or null. */
export function swapIdFromNotification(
  n: Pick<FacilityNotification, "id" | "type">,
): string | null {
  if (n.type !== "shift_swap" || !n.id.startsWith(SWAP_PREFIX)) return null;
  return n.id.slice(SWAP_PREFIX.length);
}

const SCHEDULE_LINK = "/facility/dashboard/services/scheduling/shift-swaps";
const BROADCAST_LINK = "/facility/dashboard/services/scheduling/notifications";

/**
 * Live schedule notifications (category "schedule"). Pending swaps are unread
 * so they count toward the Schedule pill; broadcasts are informational (read)
 * so they show in the list without inflating the actionable unread count.
 */
export function useScheduleNotifications(): FacilityNotification[] {
  const swaps = useShiftSwaps();

  return useMemo(() => {
    const items: FacilityNotification[] = [];

    for (const swap of swaps) {
      if (swap.status !== "pending") continue;
      items.push({
        id: `${SWAP_PREFIX}${swap.id}`,
        type: "shift_swap",
        title: "Shift swap request",
        message: `${swap.requestingEmployeeName} ↔ ${swap.targetEmployeeName} on ${swap.requestingShiftDate}`,
        read: false,
        timestamp: `${swap.requestedAt}T12:00:00Z`,
        category: "schedule",
        link: SCHEDULE_LINK,
      });
    }

    for (const msg of broadcastMessages.slice(0, 2)) {
      items.push({
        id: `sched-broadcast-${msg.id}`,
        type: "staff_announcement",
        title: msg.subject,
        message: `Sent to ${msg.recipientCount} staff by ${msg.sentByName}`,
        read: true,
        timestamp: msg.sentAt,
        category: "schedule",
        link: BROADCAST_LINK,
      });
    }

    return items;
  }, [swaps]);
}

/**
 * Inline Approve / Decline for a shift-swap notification row. Resolves the swap
 * in the store (which removes the derived notification) and fires a toast —
 * without navigating. Shared by the bell dropdown and the full page so the two
 * behave identically.
 */
export function ShiftSwapNotificationActions({ swapId }: { swapId: string }) {
  const decide = (status: "approved" | "denied") => {
    decideShiftSwap(swapId, status);
    toast.success(
      status === "approved" ? "Shift swap approved" : "Shift swap declined",
      {
        description:
          status === "approved"
            ? "Both employees have been notified."
            : undefined,
      },
    );
  };

  // Buttons live inside a row that is wrapped in a <Link>; stop propagation so
  // acting on the swap never navigates.
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        size="sm"
        className="h-7 gap-1 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
        onClick={(e) => {
          stop(e);
          decide("approved");
        }}
      >
        <Check className="size-3.5" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
        onClick={(e) => {
          stop(e);
          decide("denied");
        }}
      >
        <X className="size-3.5" />
        Decline
      </Button>
    </div>
  );
}
