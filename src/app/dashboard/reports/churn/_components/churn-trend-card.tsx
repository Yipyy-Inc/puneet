"use client";

import dynamic from "next/dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChurnTrendPoint } from "@/lib/api/churn";

// Lazy-load the recharts chart so the library only ships when this card mounts.
const ChurnTrendLineChart = dynamic(
  () => import("./churn-trend-line-chart").then((m) => m.ChurnTrendLineChart),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted/40 text-muted-foreground flex h-[300px] w-full items-center justify-center rounded-md text-sm">
        Loading chart…
      </div>
    ),
  },
);

export function ChurnTrendCard({ data }: { data: ChurnTrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Churn Rate Trend</CardTitle>
        <CardDescription>
          Monthly facility churn rate over the last 12 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChurnTrendLineChart data={data} />
      </CardContent>
    </Card>
  );
}
