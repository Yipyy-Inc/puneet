import "server-only";

import { forbidden } from "next/navigation";

import { canManageFacilityAccount, getViewer } from "@/lib/auth/viewer";

/**
 * Server-side gate for the facility Owner Account section — Yipyy Agreements,
 * Subscription, Payment Method, Export Data. Renders the 403 page
 * (app/forbidden.tsx) rather than redirecting, so a member who lands here by
 * following a stale link is told, not bounced somewhere confusing.
 *
 * ── THIS USED TO READ A COOKIE, AND ALLOWED WHEN IT WAS ABSENT ────────────
 *
 * The previous implementation was:
 *
 *   const role = (await cookies()).get("facility_role")?.value;
 *   if (!isFacilityOwnerRole(role)) forbidden();      // role == null -> ALLOW
 *
 * `facility_role` is written by `document.cookie` from a client hook, so it is
 * editable — and absent by default for anybody who had not visited a screen
 * that sets it. Either way the guard passed. The subscription, the payment
 * method and a full GDPR data export were open to every member of every
 * facility, behind a layout whose own comment promised "a 403 for any non-owner
 * role".
 *
 * `/api/facility/export` had already noticed and re-checked the membership
 * itself, saying so in its header: the cookie "steers the UI; it does not hold
 * anything shut." That was right, and it is why this is a fixed gate rather
 * than a reported breach — the mutations behind these screens do their own
 * checks. What was broken is the gate that everything ELSE was written to rely
 * on.
 *
 * It now asks `getViewer()`, i.e. the session and the membership rows RLS reads.
 */
export async function requireFacilityOwner(): Promise<void> {
  if (!canManageFacilityAccount(await getViewer())) {
    forbidden();
  }
}
