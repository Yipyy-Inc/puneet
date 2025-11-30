"use client";

import { useState } from "react";
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

  const [timeRange, setTimeRange] = useState("30days");

  if (!facility) {
    return <div>Facility not found</div>;
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
      label: "Staff Member",
      icon: User,
      defaultVisible: true,
      render: (staff) => (
        <div className="flex flex-col">
          <span className="font-medium">{staff.staffName}</span>
          <span className="text-xs text-muted-foreground">{staff.role}</span>
        </div>
      ),
    },
    {
      key: "totalTasksAssigned",
      label: "Assigned",
      icon: Target,
      defaultVisible: true,
    },
    {
      key: "tasksCompleted",
      label: "Completed",
      icon: CheckCircle2,
      defaultVisible: true,
      render: (staff) => (
        <span className="text-green-600 font-medium">
          {staff.tasksCompleted}
        </span>
      ),
    },
    {
      key: "tasksSkipped",
      label: "Skipped",
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
      label: "Completion Rate",
      icon: BarChart3,
      defaultVisible: true,
      render: (staff) => (
        <div className="flex items-center gap-2">
          <Progress value={staff.completionRate} className="w-20 h-2" />
          <span
            className={
              staff.completionRate >= 90
                ? "text-green-600 font-medium"
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
      label: "Avg Time",
      icon: Clock,
      defaultVisible: true,
      render: (staff) => `${staff.avgCompletionTimeMinutes} min`,
    },
    {
      key: "onTimeCompletions",
      label: "On Time",
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
      label: "Photo Compliance",
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
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgCompletionRate.toFixed(1)}%
            </div>
            <Progress value={avgCompletionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Photo Compliance
            </CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgPhotoCompliance.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all staff
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Tracked</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffPerformance.length}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {topPerformers.map((performer, index) => (
              <div
                key={performer.staffId}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    index === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : index === 1
                        ? "bg-gray-100 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  <span className="font-bold">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{performer.staffName}</p>
                  <p className="text-sm text-muted-foreground">
                    {performer.role}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {performer.completionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">completion</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion by Employee</CardTitle>
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
            <CardTitle className="text-sm">Areas for Improvement</CardTitle>
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
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{staff.staffName}</p>
                      <div className="flex gap-2 mt-1">
                        {staff.completionRate < 85 && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                            Low completion
                          </Badge>
                        )}
                        {staff.photoProofCompliance < 90 && (
                          <Badge variant="outline" className="text-xs">
                            <Camera className="h-3 w-3 mr-1 text-orange-500" />
                            Photo compliance
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {staffPerformance.filter(
                (s) => s.completionRate < 85 || s.photoProofCompliance < 90,
              ).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All staff members are performing well! 🎉
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Task Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffTasks
                .filter((t) => t.status === "completed")
                .slice(0, 4)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{task.templateName}</p>
                      <p className="text-xs text-muted-foreground">
                        by {task.completedByName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                      {task.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
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
