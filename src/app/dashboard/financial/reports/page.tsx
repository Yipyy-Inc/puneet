import { FinancialReports } from "@/components/financial/FinancialReports";
import { PageHeader } from "@/components/ui/page-header";

export default function FinancialReportsPage() {
  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      <div className="space-y-6">
        <PageHeader
          title="Financial Reports"
          description="Comprehensive financial reporting with revenue trends, facility performance, and growth analysis"
        />

        <FinancialReports />
      </div>
    </div>
  );
}
