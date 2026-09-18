"use client";

import { usePathname } from "next/navigation";

import { toEmployeeHref } from "@/lib/nav/employee-nav";

// ============================================================================
// A facility link, for whichever portal is rendering the page.
//
// The booking page and the operations calendar are shared: /facility/dashboard
// renders them for admins and the /employee shell re-renders the same
// components for staff. Their links were written for the first. From the
// second, guardPortal refuses a /facility url and sends the person to
// /employee/schedule — so reception pressing "Check out" on a guest who owes
// was taken to their own schedule, not to the booking and its payment.
// ============================================================================

export function usePortalHref() {
  const pathname = usePathname();
  const employee = pathname?.startsWith("/employee") ?? false;

  return {
    /** The link in this portal. */
    href: (facilityUrl: string) =>
      employee ? toEmployeeHref(facilityUrl) : facilityUrl,
    /** False when this portal has no page for it — leave the link out. */
    reachable: (facilityUrl: string) =>
      !employee || !toEmployeeHref(facilityUrl).startsWith("/facility/"),
  };
}
