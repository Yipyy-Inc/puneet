"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Clock,
  ArrowRight,
  PawPrint,
  Scissors,
  LogIn,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TagList } from "@/components/shared/TagList";
import { hasCriticalTags, hasWarningTags } from "@/data/tags-notes";
import { clients } from "@/data/clients";
import type { CustomServiceModule } from "@/types/facility";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCategoryMeta, COLOR_HEX_MAP } from "@/data/custom-services";
import {
  customServiceCheckIns,
  type CustomServiceCheckInStatus,
} from "@/data/custom-service-checkins";

const petImages: Record<number, string> = {
  1: "/dogs/dog-1.jpg",
  2: "/dogs/dog-2.jpg",
  3: "/dogs/dog-3.jpg",
  4: "/dogs/dog-4.jpg",
  5: "/dogs/dog-1.jpg",
  6: "/dogs/dog-2.jpg",
  7: "/dogs/dog-3.jpg",
  8: "/dogs/dog-4.jpg",
};

const getPetImage = (petId: number): string | null => petImages[petId] || null;

const findClientForPet = (petId: number) =>
  clients.find((c) => c.pets.some((p) => p.id === petId));

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

    // Real check-in data for this module with local state for transitions
    const initialCheckIns = useMemo(
      () => customServiceCheckIns.filter((c) => c.moduleId === module.id),
      [module.id],
    );
    const [moduleCheckIns, setModuleCheckIns] = useState(initialCheckIns);

    const handleStatusChange = (
      id: string,
      newStatus: CustomServiceCheckInStatus,
      label: string,
    ) => {
      setModuleCheckIns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
      );
      const item = moduleCheckIns.find((c) => c.id === id);
      if (item) toast.success(`${item.petName} — ${label}`);
    };

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
              moduleCheckIns.map((checkIn) => {
                const client = findClientForPet(checkIn.petId);
                const isCritical = hasCriticalTags("pet", checkIn.petId);
                const isWarning =
                  !isCritical && hasWarningTags("pet", checkIn.petId);
                return (
                  <div
                    key={checkIn.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors"
                  >
                    {getPetImage(checkIn.petId) ? (
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${checkIn.petId}`
                            : "#"
                        }
                        className="shrink-0"
                      >
                        <div className="size-10 overflow-hidden rounded-full">
                          <Image
                            src={getPetImage(checkIn.petId)!}
                            alt={checkIn.petName}
                            width={40}
                            height={40}
                            className="size-full object-cover"
                          />
                        </div>
                      </Link>
                    ) : (
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${checkIn.petId}`
                            : "#"
                        }
                        className="shrink-0"
                      >
                        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                          <PawPrint className="text-primary size-5" />
                        </div>
                      </Link>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${checkIn.petId}`
                            : "#"
                        }
                        className="text-sm font-semibold hover:underline"
                      >
                        {checkIn.petName}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                          <Scissors className="mr-1 size-3" />
                          {module.name}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-[10px] capitalize",
                            STATUS_STYLES[checkIn.status] ?? "bg-secondary",
                          )}
                        >
                          {STATUS_LABELS[checkIn.status]}
                        </Badge>
                        <TagList
                          entityType="pet"
                          entityId={checkIn.petId}
                          compact
                          maxVisible={2}
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {checkIn.ownerName} · {checkIn.petBreed}
                      </p>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        <Clock className="size-3" />
                        <span>{formatTime(checkIn.checkInTime)}</span>
                        {checkIn.staffAssigned && (
                          <>
                            <span>·</span>
                            <span>{checkIn.staffAssigned}</span>
                          </>
                        )}
                        {checkIn.resourceName && (
                          <>
                            <span>·</span>
                            <span>{checkIn.resourceName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Action buttons */}
                    {module.checkInOut.enabled && (
                      <div className="shrink-0">
                        {(checkIn.status === "scheduled" ||
                          checkIn.status === "checked-in") && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(
                                checkIn.id,
                                "in-progress",
                                "Checked In",
                              );
                            }}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <LogIn className="size-3" />
                            Check In
                          </Button>
                        )}
                        {checkIn.status === "in-progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(
                                checkIn.id,
                                "completed",
                                "Checked Out",
                              );
                            }}
                            className="gap-1"
                          >
                            <CheckCircle className="size-3" />
                            Check Out
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
