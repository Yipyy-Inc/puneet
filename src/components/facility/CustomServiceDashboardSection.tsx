"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Clock, User, ArrowRight, MapPin, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomServiceModule } from "@/types/facility";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCategoryMeta, COLOR_HEX_MAP } from "@/data/custom-services";
import {
  customServiceCheckIns,
  type CustomServiceCheckInStatus,
} from "@/data/custom-service-checkins";

interface CustomServiceDashboardSectionProps {
  module: CustomServiceModule;
}

const STATUS_STYLES: Record<CustomServiceCheckInStatus, string> = {
  scheduled:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "checked-in":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "in-progress":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "checked-out":
    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
};

const STATUS_LABELS: Record<CustomServiceCheckInStatus, string> = {
  scheduled: "Not Checked-In",
  "checked-in": "Checked In",
  "in-progress": "In Progress",
  completed: "Completed",
  "checked-out": "Checked Out",
};

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export const CustomServiceDashboardSection = memo(
  function CustomServiceDashboardSection({
    module,
  }: CustomServiceDashboardSectionProps) {
    const catMeta = getCategoryMeta(module.category);
    const viewAllUrl = `/facility/dashboard/services/custom/${module.slug}`;
    const accentColor = COLOR_HEX_MAP[module.iconColor] ?? catMeta?.color;

    // Real check-in data for this module
    const moduleCheckIns = useMemo(
      () => customServiceCheckIns.filter((c) => c.moduleId === module.id),
      [module.id],
    );

    const todaysCount = moduleCheckIns.length;
    const scheduledCount = moduleCheckIns.filter(
      (c) => c.status === "scheduled",
    ).length;
    const inProgressCount = moduleCheckIns.filter(
      (c) => c.status === "in-progress" || c.status === "checked-in",
    ).length;
    const completedCount = moduleCheckIns.filter(
      (c) => c.status === "completed" || c.status === "checked-out",
    ).length;

    return (
      <Card className="animate-in fade-in duration-300">
        <CardContent className="space-y-4 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: accentColor }}
              >
                <DynamicIcon name={module.icon} className="size-5 text-white" />
              </div>
              <div>
                <h3 className={cn("text-lg font-semibold", catMeta?.textClass)}>
                  {module.name}
                </h3>
                <p className="text-muted-foreground text-xs">
                  {module.description}
                </p>
              </div>
            </div>
            <Link href={viewAllUrl}>
              <Button variant="outline" size="sm" className="gap-1.5">
                View All
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          {/* Stats Row */}
          <div className="flex gap-3">
            <div className="bg-muted/50 flex-1 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold">{todaysCount}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">Today</p>
            </div>
            <div className="flex-1 rounded-lg bg-orange-50 px-4 py-3 text-center dark:bg-orange-950/20">
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {scheduledCount}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Not Checked-In
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-amber-50 px-4 py-3 text-center dark:bg-amber-950/20">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {inProgressCount}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                In Progress
              </p>
            </div>
            <div className="flex-1 rounded-lg bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-950/20">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {completedCount}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">Completed</p>
            </div>
          </div>

          {/* Today's Check-ins */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">
              Today&apos;s Sessions
            </p>
            {moduleCheckIns.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No sessions scheduled for today.
              </p>
            ) : (
              moduleCheckIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="bg-card hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: accentColor
                          ? `${accentColor}20`
                          : undefined,
                      }}
                    >
                      <User className="size-4" style={{ color: accentColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {checkIn.petName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {checkIn.ownerName}
                        {checkIn.resourceName && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5">
                            <MapPin className="inline size-2.5" />
                            {checkIn.resourceName}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="size-3" />
                      {formatTime(checkIn.checkInTime)}
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px] capitalize",
                        STATUS_STYLES[checkIn.status] ?? "bg-secondary",
                      )}
                    >
                      {checkIn.status === "completed" && (
                        <CheckCircle className="mr-0.5 size-2.5" />
                      )}
                      {STATUS_LABELS[checkIn.status]}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
