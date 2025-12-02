"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { staffConflicts } from "@/data/additional-features";

export function StaffConflictDetector() {
  const [conflicts] = useState(staffConflicts);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const activeConflicts = conflicts.filter(
    (conflict) => !resolvedIds.has(conflict.id),
  );

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id));
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "warning":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "info":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      default:
        return "";
    }
  };

  const getConflictTypeBadge = (type: string) => {
    const labels = {
      double_booking: "Double Booking",
      overtime: "Overtime Risk",
      insufficient_break: "Break Required",
      skill_mismatch: "Skill Mismatch",
      time_off_overlap: "Time Off Conflict",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const criticalCount = activeConflicts.filter(
    (c) => c.severity === "critical",
  ).length;
  const warningCount = activeConflicts.filter(
    (c) => c.severity === "warning",
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Conflicts
                </p>
                <p className="text-2xl font-bold">{activeConflicts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Critical
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {criticalCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Warnings
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {warningCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts List */}
      <div className="space-y-3">
        {activeConflicts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Conflicts Detected
              </h3>
              <p className="text-sm text-muted-foreground">
                All staff schedules are optimized with no conflicts.
              </p>
            </CardContent>
          </Card>
        ) : (
          activeConflicts.map((conflict) => (
            <Card
              key={conflict.id}
              className={`border-2 ${getSeverityColor(conflict.severity)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(conflict.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <CardTitle className="text-base">
                          {conflict.staffName}
                        </CardTitle>
                        <Badge variant="outline">
                          {getConflictTypeBadge(conflict.conflictType)}
                        </Badge>
                        {conflict.canAutoResolve && (
                          <Badge className="bg-blue-500/10 text-blue-700">
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📅 {conflict.date}</span>
                        <span>•</span>
                        <span>⏰ {conflict.timeSlot}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolve(conflict.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <div className="p-3 bg-white/50 rounded-lg border">
                  <p className="text-sm font-medium mb-1">⚠️ Issue</p>
                  <p className="text-sm text-muted-foreground">
                    {conflict.description}
                  </p>
                </div>

                {/* Conflicting Bookings (if applicable) */}
                {conflict.conflictingBookings && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Conflicting Bookings:</p>
                    {conflict.conflictingBookings.map((booking) => (
                      <div
                        key={booking.bookingId}
                        className="p-2 bg-white/50 rounded border text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {booking.serviceName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {booking.bookingId}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.startTime} - {booking.endTime}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-900 mb-1">
                    ✨ Recommendation
                  </p>
                  <p className="text-sm text-green-800">
                    {conflict.recommendation}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {conflict.canAutoResolve ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleResolve(conflict.id)}
                    >
                      Auto-Resolve
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleResolve(conflict.id)}
                    >
                      View in Schedule
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolve(conflict.id)}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
