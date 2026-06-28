import { FacilityDataExport } from "@/components/facilities/facility-data-export";

// The facility portal operates as facility 11 ("Example Pet Care Facility").
const OWN_FACILITY_ID = 11;

export default function FacilityDataExportSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Export My Data</h1>
        <p className="text-muted-foreground">
          Download a portable copy of your facility&rsquo;s data.
        </p>
      </div>
      <FacilityDataExport defaultFacilityId={OWN_FACILITY_ID} lockToOwn />
    </div>
  );
}
