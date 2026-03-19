"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Clock, User, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CustomServiceModule } from "@/lib/types";
import { resolveIcon } from "@/lib/service-registry";
import { getGradientStyle, getCategoryMeta, COLOR_HEX_MAP } from "@/data/custom-services";

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
  cancelled:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export const CustomServiceDashboardSection = memo(function CustomServiceDashboardSection({
  module,
}: CustomServiceDashboardSectionProps) {
  const Icon = resolveIcon(module.icon);
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
      className="animate-in fade-in duration-300 border-l-4"
      style={borderStyle}
    >
      <CardContent className="pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                "bg-gradient-to-br",
              )}
              style={gradientStyle}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className={cn("text-lg font-semibold", catMeta?.textClass)}>{module.name}</h3>
              <p className="text-xs text-muted-foreground">
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
          <div className="rounded-lg bg-muted/50 px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Today&apos;s Bookings
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground mt-0.5">This Week</p>
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Upcoming Today
          </p>
          {MOCK_BOOKINGS.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {booking.petName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {booking.client}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
});
