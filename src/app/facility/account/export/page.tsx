import type { Metadata } from "next";

import { OwnDataExport } from "./own-data-export";

export const metadata: Metadata = {
  title: "Export Data — Yipyy",
};

// Owner-only via ../layout.tsx (requireFacilityOwner → 403 for non-owners),
// and the route checks again for itself.
//
// This page used to pass `defaultFacilityId={11}` — a literal id from the mock
// era — into a component that reads src/data/*, so every owner who asked for a
// copy of their data received facility 11's fictional records. There is no id
// here now: the server takes the facility from the caller's membership.
export default function ExportDataPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export Data</h1>
        <p className="text-muted-foreground">
          Download a portable copy of your facility&rsquo;s data — customers,
          pets, bookings, payments and staff — as CSV files in a single ZIP.
        </p>
      </div>
      <OwnDataExport />
    </div>
  );
}
