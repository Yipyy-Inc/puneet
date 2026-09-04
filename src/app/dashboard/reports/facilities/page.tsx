import { getFacilitiesReport } from "@/lib/api/facilities-report";
import { FacilitiesReportClient } from "./_components/facilities-report-client";
import { PageHeader } from "@/components/ui/page-header";

export default function FacilitiesReportPage() {
  const report = getFacilitiesReport();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Facilities Report"
        description="Top facilities by revenue, feature adoption, login frequency, and booking volume"
      />

      <FacilitiesReportClient report={report} />
    </div>
  );
}
