import "server-only";

import { cookies } from "next/headers";
import { forbidden } from "next/navigation";

import { FACILITY_ROLE_COOKIE, isFacilityOwnerRole } from "./facility-role";

/**
 * Server-side owner gate for the facility Owner Account section (Yipyy
 * Agreements, Subscription, Payment Method, Export Data). If the acting facility
 * staff member is not the primary owner, this renders the 403 page
 * (app/forbidden.tsx) — not a redirect, not a blank page. Call it from the
 * layout/page of every owner-only route.
 */
export async function requireFacilityOwner(): Promise<void> {
  const role = (await cookies()).get(FACILITY_ROLE_COOKIE)?.value;
  if (!isFacilityOwnerRole(role)) {
    forbidden();
  }
}
