import { getFacilitiesReport } from "@/lib/api/facilities-report";
import { FacilitiesReportClient } from "./_components/facilities-report-client";

export default function FacilitiesReportPage() {
  const report = getFacilitiesReport();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facilities Report</h1>
        <p className="text-muted-foreground">
          Top facilities by revenue, feature adoption, login frequency, and
          booking volume
        </p>
      </div>

      <FacilitiesReportClient report={report} />
    </div>
  );
}
