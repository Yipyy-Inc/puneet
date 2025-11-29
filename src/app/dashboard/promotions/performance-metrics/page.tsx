import { PerformanceMetrics } from "@/components/promotions/PerformanceMetrics";

export default function PerformanceMetricsPage() {
  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Performance Metrics
        </h1>
        <p className="text-muted-foreground">
          Analyze promotion effectiveness, conversion rates, and ROI
        </p>
      </div>
      <PerformanceMetrics />
    </div>
  );
}
