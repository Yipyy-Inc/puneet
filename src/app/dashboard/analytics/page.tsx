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
    <div className="flex-1 p-6 lg:p-8 bg-background bg-gradient-mesh min-h-screen">
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
          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    New Customers
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">1,250</h3>
                    <span className="inline-flex items-center text-xs font-medium text-success">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      +18.5%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This month
                  </p>
                </div>
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  }}
                >
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Reservations
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">8,290</h3>
                    <span className="inline-flex items-center text-xs font-medium text-success">
                      90%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completion rate
                  </p>
                </div>
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    System Utilization
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">78.8%</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Average across facilities
                  </p>
                </div>
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  }}
                >
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    System Uptime
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">99.8%</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This month
                  </p>
                </div>
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Business Intelligence */}
          <Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  }}
                >
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Business Intelligence</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Customer acquisition, reservation analytics, and facility
                utilization metrics
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Customer Acquisition Tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Reservation Analytics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Facility Utilization
                </li>
              </ul>
              <Button asChild className="w-full gap-2 group/btn">
                <Link href="/dashboard/analytics/business-intelligence">
                  View Details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Performance Metrics</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Facility performance, system monitoring, and operational
                efficiency
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Facility Performance
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  System Health Monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Efficiency Tracking
                </li>
              </ul>
              <Button asChild className="w-full gap-2 group/btn">
                <Link href="/dashboard/analytics/performance">
                  View Details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Custom Reports */}
          <Card className="border-0 shadow-card hover:shadow-elevated transition-all duration-300 group">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  }}
                >
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Custom Reports</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Build, schedule, and export custom reports with various formats
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Report Builder
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Scheduled Reports
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Export (PDF, Excel, CSV)
                </li>
              </ul>
              <Button asChild className="w-full gap-2 group/btn">
                <Link href="/dashboard/analytics/reports">
                  View Details
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
