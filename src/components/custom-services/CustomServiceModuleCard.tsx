"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Archive,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomServiceStatusBadge } from "./CustomServiceStatusBadge";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import type { CustomServiceModule } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  getCategoryMeta,
  getGradientStyle,
  PRICING_MODEL_LABELS,
} from "@/data/custom-services";

interface CustomServiceModuleCardProps {
  module: CustomServiceModule;
  onEdit?: (module: CustomServiceModule) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (module: CustomServiceModule) => void;
  onArchive?: (id: string) => void;
}

export const CustomServiceModuleCard = memo(function CustomServiceModuleCard({
  module,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onArchive,
}: CustomServiceModuleCardProps) {
  const router = useRouter();
  const catMeta = getCategoryMeta(module.category);
  const gradientStyle = getGradientStyle(module.iconColor, module.iconColorTo);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(module);
    } else {
      router.push(`/facility/dashboard/services/custom/${module.slug}/edit`);
    }
  }, [onEdit, module, router]);

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      aria-label={module.name}
      role="article"
    >
      {/* Gradient accent bar */}
      <div
        className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl"
        style={gradientStyle}
      />

      <CardHeader className="pt-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Icon + Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={gradientStyle}
            >
              <DynamicIcon name={module.icon} className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm/tight font-semibold">
                {module.name}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                /{module.slug}
              </p>
            </div>
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${module.name}`}
                className="min-h-[44px] min-w-[44px] shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="size-4" />
                Edit Module
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(module.id)}>
                <Copy className="size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {module.status === "active" ? (
                <DropdownMenuItem onClick={() => onToggleStatus?.(module)}>
                  <ToggleLeft className="size-4" />
                  Disable
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onToggleStatus?.(module)}>
                  <ToggleRight className="size-4" />
                  Activate
                </DropdownMenuItem>
              )}
              {module.status !== "archived" && (
                <DropdownMenuItem onClick={() => onArchive?.(module.id)}>
                  <Archive className="size-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(module.id)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {module.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs/relaxed">
            {module.description}
          </p>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <CustomServiceStatusBadge status={module.status} />
          {catMeta && (
            <Badge className={cn("border text-xs", catMeta.badgeClass)}>
              {catMeta.name}
            </Badge>
          )}
          {module.onlineBooking.enabled && (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-xs text-blue-600 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
            >
              Online
            </Badge>
          )}
        </div>

        {/* Pricing row */}
        <div className="border-border/50 flex items-center justify-between border-t pt-1">
          <div className="text-muted-foreground text-xs">
            {PRICING_MODEL_LABELS[module.pricing.model] ?? module.pricing.model}
          </div>
          <div className="text-sm font-semibold">
            ${module.pricing.basePrice.toFixed(2)}
          </div>
        </div>

        {/* Feature flags */}
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {module.calendar.enabled && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Calendar
            </span>
          )}
          {module.checkInOut.enabled && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Check-In/Out
            </span>
          )}
          {module.stayBased.enabled && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Stay-Based
            </span>
          )}
          {module.staffAssignment.autoAssign && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Auto-Assign
            </span>
          )}
        </div>

        {/* Edit button */}
        <Button
          variant="outline"
          size="sm"
          className="mt-1 w-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
          onClick={handleEdit}
        >
          <Eye className="size-3.5" />
          View & Edit
        </Button>
      </CardContent>
    </Card>
  );
});
