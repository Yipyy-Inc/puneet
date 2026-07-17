"use client";

import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { FacilityNotification } from "@/types/facility";

/**
 * "Express Check-In Missing → Send Reminder" (spec Table 39). When a client
 * hasn't submitted their YipyyGo pre-check, one click re-sends the form link.
 * SMS/email are mocked — this records a history entry + console line and fires a
 * toast. Shared by the bell dropdown and the full page so behavior is identical.
 */
export function isExpressCheckinMissing(
  n: Pick<FacilityNotification, "type">,
): boolean {
  return n.type === "yipyygo_missing";
}

export interface ReminderHistoryEntry {
  notificationId: string;
  petName?: string;
  bookingRef?: string;
  sentAt: string;
}

// In-memory "sent reminders" log (stands in for a delivery/audit record).
const reminderHistory: ReminderHistoryEntry[] = [];

export function getExpressCheckinReminderHistory(): ReminderHistoryEntry[] {
  return reminderHistory;
}

function logReminderSent(entry: ReminderHistoryEntry) {
  reminderHistory.push(entry);
  // Mock delivery/audit record for the re-sent reminder.
  console.info("[express-checkin] pre-check reminder re-sent", entry);
}

export function ExpressCheckinReminderAction({
  notification,
}: {
  notification: FacilityNotification;
}) {
  const petName = notification.meta?.petName;

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1 px-2 text-xs"
      onClick={(e) => {
        // Row is wrapped in a <Link>; never navigate when acting on it.
        e.preventDefault();
        e.stopPropagation();
        logReminderSent({
          notificationId: notification.id,
          petName,
          bookingRef: notification.meta?.bookingRef,
          sentAt: new Date().toISOString(),
        });
        toast.success("Reminder sent", {
          description: petName
            ? `Express check-in link re-sent for ${petName}.`
            : "Express check-in link re-sent to the client.",
        });
      }}
    >
      <Send className="size-3.5" />
      Send Reminder
    </Button>
  );
}
