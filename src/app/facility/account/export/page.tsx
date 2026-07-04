import type { Metadata } from "next";

import { FacilityDataExport } from "@/components/facilities/facility-data-export";

export const metadata: Metadata = {
  title: "Export Data — Yipyy",
};

// The facility portal operates as facility 11 ("Example Pet Care Facility").
const OWN_FACILITY_ID = 11;

// Owner-only via ../layout.tsx (requireFacilityOwner → 403 for non-owners).
export default function ExportDataPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-muted-foreground">
          Download a portable copy of your facility&rsquo;s data — clients,
          pets, bookings, invoices and staff — as CSV or Excel.
        </p>
      </div>
      <FacilityDataExport defaultFacilityId={OWN_FACILITY_ID} lockToOwn />
    </div>
  );
}
