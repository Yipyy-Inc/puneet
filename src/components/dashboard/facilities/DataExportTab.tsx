import { FacilityDataExport } from "@/components/facilities/facility-data-export";

export function DataExportTab({ facility }: { facility: { id: number } }) {
  return <FacilityDataExport defaultFacilityId={facility.id} />;
}
