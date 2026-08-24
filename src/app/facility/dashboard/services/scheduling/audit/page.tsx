import { ScheduleAuditTrail } from "@/components/scheduling/ScheduleAuditTrail";

// The facility is NOT passed in. It used to be `facilityId={11}` — a hardcoded
// legacy number that showed every facility the same fixture. The rows are
// scoped by `audit_log_facility_read` in the database.
export default function ScheduleAuditPage() {
  return <ScheduleAuditTrail />;
}
