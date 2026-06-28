import { redirect } from "next/navigation";

// Unified notification center now lives at /facility/notifications.
// This legacy route permanently redirects there.
export default function FacilityDashboardNotificationsPage() {
  redirect("/facility/notifications");
}
