"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ClickableStatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  onClick?: () => void;
  isActive?: boolean;
  valueClassName?: string;
}

export function ClickableStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  onClick,
  isActive,
  valueClassName,
}: ClickableStatCardProps) {
  return (
    <Card
      className={cn(
        "transition-all",
        onClick && "hover:bg-muted/50 cursor-pointer hover:shadow-md",
        isActive && "ring-primary bg-primary/5 ring-2",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
