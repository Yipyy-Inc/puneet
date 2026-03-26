"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Clock, User, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomServiceModule } from "@/lib/types";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  getGradientStyle,
  getCategoryMeta,
  COLOR_HEX_MAP,
} from "@/data/custom-services";

interface CustomServiceDashboardSectionProps {
  module: CustomServiceModule;
}

// Mock upcoming bookings for display purposes
const MOCK_BOOKINGS = [
  {
    id: "1",
    petName: "Bella",
    client: "Sarah Johnson",
    time: "9:00 AM",
    status: "confirmed" as const,
  },
  {
    id: "2",
    petName: "Max",
    client: "Tom Davis",
    time: "11:30 AM",
    status: "pending" as const,
  },
  {
    id: "3",
    petName: "Luna",
    client: "Emily Chen",
    time: "2:00 PM",
    status: "confirmed" as const,
  },
];

const STATUS_STYLES: Record<string, string> = {
  confirmed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export const CustomServiceDashboardSection = memo(
  function CustomServiceDashboardSection({
    module,
  }: CustomServiceDashboardSectionProps) {
    const catMeta = getCategoryMeta(module.category);
    const viewAllUrl = `/facility/dashboard/services/custom/${module.slug}`;
    const borderStyle = useMemo(
      () => ({ borderLeftColor: COLOR_HEX_MAP[module.iconColor] ?? undefined }),
      [module.iconColor],
    );
    const gradientStyle = useMemo(
      () => getGradientStyle(module.iconColor, module.iconColorTo),
      [module.iconColor, module.iconColorTo],
    );

    return (
      <Card
        className="animate-in fade-in border-l-4 duration-300"
        style={borderStyle}
      >
        <CardContent className="space-y-4 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`,
                  "bg-linear-to-br",
                )}
                style={gradientStyle}
              >
                <DynamicIcon
                  name={module.icon}
                  className="h-5 w-5 text-white"
                />
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
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Stats Row */}
          <div className="flex gap-4">
            <div className="bg-muted/50 flex-1 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold">3</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Today&apos;s Bookings
              </p>
            </div>
            <div className="bg-muted/50 flex-1 rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold">12</p>
              <p className="text-muted-foreground mt-0.5 text-xs">This Week</p>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">
              Upcoming Today
            </p>
            {MOCK_BOOKINGS.map((booking) => (
              <div
                key={booking.id}
                className="bg-card hover:bg-muted/30 flex items-center justify-between rounded-lg border p-3 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <User className="text-primary size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {booking.petName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {booking.client}
                    </p>
                  </div>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2">
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {booking.time}
                  </div>
                  <Badge
                    className={cn(
                      "text-xs capitalize",
                      STATUS_STYLES[booking.status] ?? "bg-secondary",
                    )}
                  >
                    {booking.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  },
);
