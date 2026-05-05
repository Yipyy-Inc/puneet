"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

type Props = {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  guestCount: number;
  date: string;
};

export function ProgressHeader({
  totalTasks,
  completedTasks,
  overdueTasks,
  guestCount,
  date,
}: Props) {
  const pct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Daily Care</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {dateLabel} · {guestCount}{" "}
              {guestCount === 1 ? "pet" : "pets"} in facility
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {completedTasks} done
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="size-3 text-muted-foreground" />
              {totalTasks - completedTasks} remaining
            </Badge>
            {overdueTasks > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-red-300 bg-red-50 text-red-700"
              >
                <AlertCircle className="size-3" />
                {overdueTasks} overdue
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Today&apos;s progress</span>
            <span className="font-[tabular-nums] font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
