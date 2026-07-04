import { requireFacilityOwner } from "@/lib/facility-owner-guard";

/**
 * Every page under /facility/account is part of the Owner Account section and is
 * owner-only. The server-side guard here returns a 403 for any non-owner role,
 * so Task 20 (Subscription), Task 21 (Payment Method) and Task 22 (Export Data)
 * inherit the enforcement automatically.
 */
export default async function FacilityAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFacilityOwner();
  return <>{children}</>;
}
