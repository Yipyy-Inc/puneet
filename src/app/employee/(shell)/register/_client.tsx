"use client";

import { DailyRegisterClient } from "@/components/billing/cash-drawer/DailyRegisterClient";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";
import { resolveRegisterContext } from "@/lib/employee/register-context";

// The register, opened and reconciled under the acting viewer's name.
//
// The page around this is a server component and the acting viewer lives in the
// shell's RBAC boundary, which is client-side — so the two staff-dependent props
// (who is counting, and whether they see the Reports tab) are resolved here
// rather than on the server. Everything else on the page is location-derived and
// stays server-rendered.
//
// Nothing renders until the roster names someone: a drawer signed "Staff" is a
// worse record than a drawer not yet shown.
export function EmployeeDailyRegister() {
  const { viewer, viewerResolved } = useFacilityViewer();
  if (!viewerResolved) return null;

  const ctx = resolveRegisterContext(viewer);
  return (
    <DailyRegisterClient
      facilityId={ctx.facilityId}
      locationId={ctx.locationId}
      locationName={ctx.locationName}
      currency={ctx.currency}
      staffName={ctx.staffName}
      isManager={ctx.isManager}
    />
  );
}
