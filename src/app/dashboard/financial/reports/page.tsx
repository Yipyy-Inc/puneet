import { FinancialReports } from "@/components/financial/FinancialReports";

export default function FinancialReportsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Financial Reports
          </h1>
          <p className="text-muted-foreground">
            Comprehensive financial reporting with revenue trends, facility
            performance, and growth analysis
          </p>
        </div>

        <FinancialReports />
      </div>
    </div>
  );
}
