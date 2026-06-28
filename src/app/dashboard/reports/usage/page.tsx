import { getUsageReport } from "@/lib/api/usage-report";
import { UsageReportClient } from "./_components/usage-report-client";

export default function UsageReportPage() {
  const report = getUsageReport();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage Report</h1>
        <p className="text-muted-foreground">
          Platform usage across active users, modules, API traffic and AI
        </p>
      </div>

      <UsageReportClient report={report} />
    </div>
  );
}
