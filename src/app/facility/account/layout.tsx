import { requireFacilityOwner } from "@/lib/facility-owner-guard";

/**
 * Every page under /facility/account is part of the Owner Account section:
 * Subscription, Payment Method, Export Data.
 *
 * The guard reads the SESSION — the membership rows RLS decides with. It used to
 * read the client-writable `facility_role` cookie and allow when that cookie was
 * absent, while this comment claimed it "returns a 403 for any non-owner role".
 * It did not. See lib/facility-owner-guard.ts.
 *
 * Inheriting the gate from a layout is still only routing. The mutations behind
 * these screens check for themselves, and RLS refuses again on every row.
 */
export default async function FacilityAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFacilityOwner();
  return <>{children}</>;
}
