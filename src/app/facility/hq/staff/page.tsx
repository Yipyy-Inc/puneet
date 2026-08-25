import { StaffPoolClient } from "@/components/hq/StaffPoolClient";

// The roster comes from Postgres now, grouped by real home-branch
// assignments -- it used to be `sharedStaffPool`, ten fixture staff who
// belonged to three branches nobody's business actually has.
export default function HQStaffPage() {
  return <StaffPoolClient />;
}
