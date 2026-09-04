import { getSupportReport } from "@/lib/api/support-report";
import { SupportReportClient } from "./_components/support-report-client";
import { PageHeader } from "@/components/ui/page-header";

export default function SupportReportPage() {
  const report = getSupportReport();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Support Report"
        description="Unified support analytics across tickets, chat and calls"
      />

      <SupportReportClient report={report} />
    </div>
  );
}
