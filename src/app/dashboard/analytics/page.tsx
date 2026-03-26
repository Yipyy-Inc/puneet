import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Calendar,
  Activity,
  FileText,
  ArrowRight,
  Building2,
  CheckCircle2,
} from "lucide-react";

export default function AnalyticsOverviewPage() {
  return (
    <div className="bg-gradient-mesh bg-background min-h-screen flex-1 p-6 lg:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics & Reporting
          </h1>
          <p className="text-muted-foreground">
            Comprehensive business intelligence and performance analytics
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    New Customers
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">1,250</h3>
                    <span className="text-success inline-flex items-center text-xs font-medium">
                      <TrendingUp className="mr-0.5 size-3" />
                      +18.5%
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    This month
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  }}
                >
                  <Users className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    Total Reservations
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">8,290</h3>
                    <span className="text-success inline-flex items-center text-xs font-medium">
                      90%
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Completion rate
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <Calendar className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    System Utilization
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">78.8%</h3>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Average across facilities
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  }}
                >
                  <Building2 className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    System Uptime
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">99.8%</h3>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    This month
                  </p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <CheckCircle2 className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Business Intelligence */}
          <Card className="hover:shadow-elevated group shadow-card border-0 transition-all duration-300">
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  }}
                >
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Business Intelligence</CardTitle>
              </div>
              <p className="text-muted-foreground text-sm">
                Customer acquisition, reservation analytics, and facility
                utilization metrics
              </p>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="bg-primary size-1.5 rounded-full" />
                  Customer Acquisition Tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="bg-primary size-1.5 rounded-full" />
                  Reservation Analytics
                </li>
                <li className="flex items-center gap-2">
                  <div className="bg-primary size-1.5 rounded-full" />
                  Facility Utilization
                </li>
              </ul>
              <Button asChild className="group/btn w-full gap-2">
                <Link href="/dashboard/analytics/business-intelligence">
                  View Details
                  <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="hover:shadow-elevated group shadow-card border-0 transition-all duration-300">
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Performance Metrics</CardTitle>
              </div>
              <p className="text-muted-foreground text-sm">
                Facility performance, system monitoring, and operational
                efficiency
              </p>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="bg-success size-1.5 rounded-full" />
                  Facility Performance
                </li>
                <li className="flex items-center gap-2">
                  <div className="bg-success size-1.5 rounded-full" />
                  System Health Monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="bg-success size-1.5 rounded-full" />
                  Efficiency Tracking
                </li>
              </ul>
              <Button asChild className="group/btn w-full gap-2">
                <Link href="/dashboard/analytics/performance">
                  View Details
                  <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Custom Reports */}
          <Card className="hover:shadow-elevated group shadow-card border-0 transition-all duration-300">
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  }}
                >
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Custom Reports</CardTitle>
              </div>
              <p className="text-muted-foreground text-sm">
                Build, schedule, and export custom reports with various formats
              </p>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="bg-warning size-1.5 rounded-full" />
                  Report Builder
                </li>
                <li className="flex items-center gap-2">
                  <div className="bg-warning size-1.5 rounded-full" />
                  Scheduled Reports
                </li>
                <li className="flex items-center gap-2">
                  <div className="bg-warning size-1.5 rounded-full" />
                  Export (PDF, Excel, CSV)
                </li>
              </ul>
              <Button asChild className="group/btn w-full gap-2">
                <Link href="/dashboard/analytics/reports">
                  View Details
                  <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
