"use client";

import { useMemo } from "react";

import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import type { FacilityNotification } from "@/types/facility";

/**
 * Pending online-booking requests (spec Table 52) surfaced through the unified
 * bell as `booking_new` notifications, derived live from the booking-requests
 * store. Only PENDING requests appear (approving/declining on the online-booking
 * page flips their status, so the alert clears itself). The online-booking page
 * remains the place to manage them — every row links there.
 *
 * Pending requests are actionable, so they are unread (they count toward the
 * bell badge). Category follows the requested service so they filter under the
 * matching pill (Daycare / Boarding / Grooming / Training).
 */
export function useBookingRequestNotifications(
  facilityId: number,
): FacilityNotification[] {
  const { requests } = useBookingRequestsStore();

  return useMemo(() => {
    return requests
      .filter((r) => r.facilityId === facilityId && r.status === "pending")
      .map<FacilityNotification>((r) => {
        const service = r.services[0] ?? "customers";
        const serviceLabel = r.services
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" + ");
        return {
          id: `booking-req-${r.id}`,
          type: "booking_new",
          title: "New booking request",
          message: `${r.clientName} — ${r.petName} for ${serviceLabel}`,
          read: false,
          timestamp: r.createdAt,
          facilityId: r.facilityId,
          category: service,
          link: "/facility/dashboard/online-booking",
        };
      });
  }, [requests, facilityId]);
}
