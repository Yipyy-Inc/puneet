"use client";

import { useCallback } from "react";

import { useStaffText } from "@/lib/staff/use-staff-text";
import { NOTIFICATION_EVENT_META } from "@/types/facility-staff";

/**
 * The eleven notification events and their six groups, in the viewer's
 * language.
 *
 * `NOTIFICATION_EVENT_META` is a module constant carrying both, so all
 * seventeen were invisible to `check:ui-french` — the twelfth such set found in
 * this area. Two files render them: the hire form, where they are switches, and
 * the profile sheet, where they are a read-back of what those switches set.
 *
 * A read-back that words the setting differently is worse than an untranslated
 * one, because it reads as a different setting. So one hook, not two maps.
 *
 * An event the catalogue does not know falls back to the constant's own
 * English, so a twelfth event reads as words rather than as
 * `invoice_overdue`.
 */
export function useNotificationEventLabel(): {
  event: (event: string) => string;
  group: (group: string) => string;
} {
  const { t } = useStaffText("notifications");

  const event = useCallback(
    (event: string) => {
      const key = `ev${event
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("")}`;
      const label = t(key);
      if (label !== key) return label;
      const meta =
        NOTIFICATION_EVENT_META[event as keyof typeof NOTIFICATION_EVENT_META];
      return meta?.label ?? event;
    },
    [t],
  );

  const group = useCallback(
    (group: string) => {
      const key = `grp${group.replace(/\s+/g, "")}`;
      const label = t(key);
      return label === key ? group : label;
    },
    [t],
  );

  return { event, group };
}
