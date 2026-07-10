"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  blockTotal: number;
  blockComplete: number;
  blockOverdue: number;
  guestCount: number;
  date: string;
  /** Jump to the first overdue task card when the overdue chip is clicked. */
  onOverdueClick?: () => void;
};

export function ProgressHeader({
  blockTotal,
  blockComplete,
  blockOverdue,
  guestCount,
  date,
  onOverdueClick,
}: Props) {
  const pct =
    blockTotal === 0 ? 0 : Math.round((blockComplete / blockTotal) * 100);
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
              {dateLabel} · {guestCount} {guestCount === 1 ? "pet" : "pets"} in
              facility
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {blockComplete} of {blockTotal} tasks complete
            </Badge>
            {blockOverdue > 0 &&
              (onOverdueClick ? (
                <Badge
                  asChild
                  variant="outline"
                  className="cursor-pointer gap-1 border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                >
                  <button
                    type="button"
                    onClick={onOverdueClick}
                    aria-label={`Jump to the first of ${blockOverdue} overdue tasks`}
                  >
                    <AlertCircle className="size-3" />
                    {blockOverdue} overdue
                  </button>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-red-300 bg-red-50 text-red-700"
                >
                  <AlertCircle className="size-3" />
                  {blockOverdue} overdue
                </Badge>
              ))}
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
