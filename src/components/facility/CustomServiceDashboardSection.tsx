"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Clock,
  ArrowRight,
  PawPrint,
  LogIn,
  CheckCircle,
  Search,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagList } from "@/components/shared/TagList";
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

    const [searchQuery, setSearchQuery] = useState("");

    const scheduled = moduleCheckIns.filter(
      (c) => c.status === "scheduled" || c.status === "checked-in",
    );
    const inProgress = moduleCheckIns.filter((c) => c.status === "in-progress");
    const completed = moduleCheckIns.filter(
      (c) => c.status === "completed" || c.status === "checked-out",
    );

    const filterBySearch = (items: typeof moduleCheckIns) => {
      if (!searchQuery.trim()) return items;
      const q = searchQuery.toLowerCase();
      return items.filter(
        (c) =>
          c.petName.toLowerCase().includes(q) ||
          c.ownerName.toLowerCase().includes(q),
      );
    };

    const renderCard = (checkIn: (typeof moduleCheckIns)[number]) => {
      const client = findClientForPet(checkIn.petId);
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
            <div className="flex flex-wrap items-center gap-1.5">
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
              <Badge variant="outline" className="text-[10px] font-normal">
                {module.name}
              </Badge>
              <TagList
                entityType="pet"
                entityId={checkIn.petId}
                compact
                maxVisible={2}
              />
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {checkIn.ownerName} · {formatTime(checkIn.checkInTime)}
              {checkIn.staffAssigned && ` · ${checkIn.staffAssigned}`}
              {checkIn.resourceName && ` · ${checkIn.resourceName}`}
            </p>
          </div>
          {module.checkInOut.enabled && (
            <div className="shrink-0">
              {(checkIn.status === "scheduled" ||
                checkIn.status === "checked-in") && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(checkIn.id, "in-progress", "Checked In");
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
                    handleStatusChange(checkIn.id, "completed", "Checked Out");
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
    };

    return (
      <Card className="animate-in fade-in duration-300">
        <CardContent className="space-y-4 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500">
                <DynamicIcon name={module.icon} className="size-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold">{module.name}</h3>
            </div>
            <Link href={viewAllUrl}>
              <Button variant="outline" size="sm" className="gap-1.5">
                View All
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          {/* 3-column layout */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Scheduled */}
            <Card>
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="size-4 text-blue-600" />
                    Scheduled
                  </CardTitle>
                  <Badge variant="secondary">{scheduled.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {filterBySearch(scheduled).length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      No scheduled sessions
                    </p>
                  ) : (
                    filterBySearch(scheduled).map(renderCard)
                  )}
                </div>
              </CardContent>
            </Card>

            {/* In Progress */}
            <Card>
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="size-4 text-amber-600" />
                    In Progress
                  </CardTitle>
                  <Badge variant="secondary">{inProgress.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {inProgress.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      No active sessions
                    </p>
                  ) : (
                    inProgress.map(renderCard)
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Completed */}
            <Card>
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="size-4 text-green-600" />
                    Completed
                  </CardTitle>
                  <Badge variant="secondary">{completed.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {completed.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      No completed today
                    </p>
                  ) : (
                    completed.map(renderCard)
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    );
  },
);
