"use client";

import { useState } from "react";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatPercent } from "@/lib/i18n/format";
import { facilities } from "@/data/facilities";
import {
  staffPerformance as baseStaffPerformance,
  staffTasks,
  StaffPerformance as BaseStaffPerformance,
} from "@/data/staff-tasks";

// Extend type to be compatible with DataTable's Record<string, unknown> constraint
type StaffPerformance = BaseStaffPerformance & Record<string, unknown>;
const staffPerformance: StaffPerformance[] =
  baseStaffPerformance as StaffPerformance[];

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  Award,
  BarChart3,
  Target,
} from "lucide-react";

export default function StaffPerformancePage() {
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const { t, fill, locale } = useStaffText("performance");
  const [timeRange, setTimeRange] = useState("30days");

  if (!facility) {
    return <div>{t("notFound")}</div>;
  }

  // Calculate aggregate stats
  const totalTasks = staffPerformance.reduce(
    (sum, s) => sum + s.totalTasksAssigned,
    0,
  );
  const totalCompleted = staffPerformance.reduce(
    (sum, s) => sum + s.tasksCompleted,
    0,
  );
  const avgCompletionRate =
    staffPerformance.reduce((sum, s) => sum + s.completionRate, 0) /
    staffPerformance.length;
  const avgPhotoCompliance =
    staffPerformance.reduce((sum, s) => sum + s.photoProofCompliance, 0) /
    staffPerformance.length;

  // Top performers
  const topPerformers = [...staffPerformance]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 3);

  const performanceColumns: ColumnDef<StaffPerformance>[] = [
    {
      key: "staffName",
      label: t("colStaffMember"),
      icon: User,
      defaultVisible: true,
      render: (staff) => (
        <div className="flex flex-col">
          <span className="font-medium">{staff.staffName}</span>
          <span className="text-muted-foreground text-xs">{staff.role}</span>
        </div>
      ),
    },
    {
      key: "totalTasksAssigned",
      label: t("colAssigned"),
      icon: Target,
      defaultVisible: true,
    },
    {
      key: "tasksCompleted",
      label: t("colCompleted"),
      icon: CheckCircle2,
      defaultVisible: true,
      render: (staff) => (
        <span className="font-medium text-green-600">
          {staff.tasksCompleted}
        </span>
      ),
    },
    {
      key: "tasksSkipped",
      label: t("colSkipped"),
      icon: XCircle,
      defaultVisible: true,
      render: (staff) => (
        <span className={staff.tasksSkipped > 0 ? "text-red-600" : ""}>
          {staff.tasksSkipped}
        </span>
      ),
    },
    {
      key: "completionRate",
      label: t("colCompletionRate"),
      icon: BarChart3,
      defaultVisible: true,
      render: (staff) => (
        <div className="flex items-center gap-2">
          <Progress value={staff.completionRate} className="size-20" />
          <span
            className={
              staff.completionRate >= 90
                ? "font-medium text-green-600"
                : staff.completionRate >= 75
                  ? "text-yellow-600"
                  : "text-red-600"
            }
          >
            {staff.completionRate.toFixed(1)}%
          </span>
        </div>
      ),
    },
    {
      key: "avgCompletionTimeMinutes",
      label: t("colAvgTime"),
      icon: Clock,
      defaultVisible: true,
      render: (staff) => `${staff.avgCompletionTimeMinutes} min`,
    },
    {
      key: "onTimeCompletions",
      label: t("colOnTime"),
      defaultVisible: true,
      render: (staff) => (
        <div className="text-sm">
          <span className="text-green-600">{staff.onTimeCompletions}</span>
          <span className="text-muted-foreground"> / </span>
          <span className="text-orange-600">{staff.lateCompletions}</span>
        </div>
      ),
    },
    {
      key: "photoProofCompliance",
      label: t("colPhotoCompliance"),
      icon: Camera,
      defaultVisible: true,
      render: (staff) => (
        <Badge
          variant={staff.photoProofCompliance >= 90 ? "default" : "secondary"}
          className={
            staff.photoProofCompliance >= 90
              ? "bg-green-100 text-green-800"
              : staff.photoProofCompliance >= 75
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }
        >
          {staff.photoProofCompliance}%
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <div />
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("selectRange")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">{t("last7")}</SelectItem>
            <SelectItem value="30days">{t("last30")}</SelectItem>
            <SelectItem value="90days">{t("last90")}</SelectItem>
            <SelectItem value="year">{t("thisYear")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalTasks")}
            </CardTitle>
            <Target className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-muted-foreground text-xs">
              {fill("completedCount", { count: totalCompleted })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("avgCompletion")}
            </CardTitle>
            <TrendingUp className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(avgCompletionRate / 100, locale, 1)}
            </div>
            <Progress value={avgCompletionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("photoCompliance")}
            </CardTitle>
            <Camera className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(avgPhotoCompliance / 100, locale, 1)}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("avgAcrossStaff")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("staffTracked")}
            </CardTitle>
            <User className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffPerformance.length}</div>
            <p className="text-muted-foreground text-xs">{t("activeStaff")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="size-5 text-yellow-500" />
            {t("topPerformers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {topPerformers.map((performer, index) => (
              <div
                key={performer.staffId}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-full ${
                    index === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : index === 1
                        ? "bg-gray-100 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                  } `}
                >
                  <span className="font-bold">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{performer.staffName}</p>
                  <p className="text-muted-foreground text-sm">
                    {performer.role}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {formatPercent(performer.completionRate / 100, locale, 1)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("completionLabel")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("byEmployee")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={staffPerformance}
            columns={performanceColumns}
            searchKey="staffName"
            searchPlaceholder="Search staff..."
            itemsPerPage={10}
          />
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("areasForImprovement")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffPerformance
                .filter(
                  (s) => s.completionRate < 85 || s.photoProofCompliance < 90,
                )
                .slice(0, 3)
                .map((staff) => (
                  <div
                    key={staff.staffId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{staff.staffName}</p>
                      <div className="mt-1 flex gap-2">
                        {staff.completionRate < 85 && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingDown className="mr-1 size-3 text-red-500" />
                            {t("lowCompletion")}
                          </Badge>
                        )}
                        {staff.photoProofCompliance < 90 && (
                          <Badge variant="outline" className="text-xs">
                            <Camera className="mr-1 size-3 text-orange-500" />
                            {t("photoComplianceShort")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {staffPerformance.filter(
                (s) => s.completionRate < 85 || s.photoProofCompliance < 90,
              ).length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  {t("allWell")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffTasks
                .filter((t) => t.status === "completed")
                .slice(0, 4)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{task.templateName}</p>
                      <p className="text-muted-foreground text-xs">
                        by {task.completedByName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle2 className="mr-1 size-3" />
                        {t("completed")}
                      </Badge>
                      {task.completedAt && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {new Date(task.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
