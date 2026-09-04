import { getUsageReport } from "@/lib/api/usage-report";
import { UsageReportClient } from "./_components/usage-report-client";
import { PageHeader } from "@/components/ui/page-header";

export default function UsageReportPage() {
  const report = getUsageReport();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Usage Report"
        description="Platform usage across active users, modules, API traffic and AI"
      />

      <UsageReportClient report={report} />
    </div>
  );
}
