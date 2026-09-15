"use client";

import { StaffNotificationPreferences } from "@/components/facility/StaffNotificationPreferences";

// The signed-in person's own preferences at this facility. No id is passed:
// the API reads and writes the caller's own membership, so there is nobody
// else's to select.
export function MyNotificationsSection() {
  return <StaffNotificationPreferences />;
}
