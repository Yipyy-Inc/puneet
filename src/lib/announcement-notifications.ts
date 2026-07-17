"use client";

import { useEffect, useMemo } from "react";

import {
  loadPersistedAnnouncements,
  targetsFacility,
  useAnnouncementDelivery,
} from "@/lib/announcement-delivery-store";
import type { FacilityNotification } from "@/types/facility";

/**
 * Facility announcements (spec Table 32a) surfaced through the unified bell.
 * Normal + High announcements targeting this facility become informational
 * `staff_announcement` notifications (category "system"). URGENT announcements
 * are intentionally EXCLUDED here — they keep showing as the full-width banner
 * (AnnouncementBanner) so critical messages are never buried in the bell.
 *
 * These are informational (read = true) so they don't inflate the actionable
 * unread count — consistent with how scheduling broadcasts are treated.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useAnnouncementNotifications(
  facilityId: number,
): FacilityNotification[] {
  const { delivered } = useAnnouncementDelivery();

  // Hydrate any admin-published announcements persisted from other tabs
  // (mirrors AnnouncementBell's mount effect).
  useEffect(() => {
    loadPersistedAnnouncements();
  }, []);

  return useMemo(() => {
    return delivered
      .filter(
        (a) =>
          (a.priority === "High" || a.priority === "Normal") &&
          targetsFacility(a, facilityId),
      )
      .map<FacilityNotification>((a) => ({
        id: `announcement-${a.id}`,
        type: "staff_announcement",
        title: a.title,
        message: stripHtml(a.body),
        read: true,
        timestamp: a.createdAt,
        category: "system",
        link: "/facility/notifications",
      }));
  }, [delivered, facilityId]);
}
