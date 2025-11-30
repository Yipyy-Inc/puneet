"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { revenueData, RevenueData } from "@/data/revenue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FacilityRevenueTable() {
  const [data] = useState<RevenueData[]>(revenueData);

  const columns: ColumnDef<RevenueData>[] = [
    {
      key: "facilityName",
      label: "Facility",
      render: (item) => <div className="font-medium">{item.facilityName}</div>,
    },
    {
      key: "subscriptionRevenue",
      label: "Subscription",
      render: (item) => (
        <div className="text-right">
          ${item.subscriptionRevenue.toLocaleString()}
        </div>
      ),
    },
    {
      key: "transactionRevenue",
      label: "Transactions",
      render: (item) => (
        <div className="text-right">
          ${item.transactionRevenue.toLocaleString()}
        </div>
      ),
    },
    {
      key: "moduleRevenue",
      label: "Modules",
      render: (item) => (
        <div className="text-right">${item.moduleRevenue.toLocaleString()}</div>
      ),
    },
    {
      key: "totalRevenue",
      label: "Total Revenue",
      render: (item) => (
        <div className="text-right font-bold">
          ${item.totalRevenue.toLocaleString()}
        </div>
      ),
    },
    {
      key: "growthRate",
      label: "Growth",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          {item.growthRate > 0 ? (
            <>
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600">+{item.growthRate}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-red-600">{item.growthRate}%</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "commissionRate",
      label: "Commission",
      render: (item) => <Badge variant="outline">{item.commissionRate}%</Badge>,
    },
  ];

  const renderActions = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>View Details</DropdownMenuItem>
        <DropdownMenuItem>Revenue Report</DropdownMenuItem>
        <DropdownMenuItem>Transaction History</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Adjust Commission</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Calculate summary statistics
  const totalRevenue = data.reduce(
    (sum, f) =>
      sum + f.subscriptionRevenue + f.transactionRevenue + f.moduleRevenue,
    0,
  );
  const topPerformer = [...data].sort(
    (a, b) =>
      b.subscriptionRevenue +
      b.transactionRevenue +
      b.moduleRevenue -
      (a.subscriptionRevenue + a.transactionRevenue + a.moduleRevenue),
  )[0];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all facilities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {topPerformer?.facilityName}
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {(
                topPerformer.subscriptionRevenue +
                topPerformer.transactionRevenue +
                topPerformer.moduleRevenue
              ).toLocaleString()}{" "}
              revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Average Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalRevenue / data.length).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Per facility</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facility Revenue</CardTitle>
          <CardDescription>
            Revenue breakdown by facility for current period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
            data={data as unknown as Record<string, unknown>[]}
            actions={
              renderActions as unknown as (
                item: Record<string, unknown>,
              ) => React.ReactNode
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
