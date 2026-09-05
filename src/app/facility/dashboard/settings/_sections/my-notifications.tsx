"use client";

import { StaffNotificationPreferences } from "@/components/facility/StaffNotificationPreferences";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";

export function MyNotificationsSection() {
  const { viewer } = useFacilityRbac();
  return <StaffNotificationPreferences staffId={viewer.id} />;
}
