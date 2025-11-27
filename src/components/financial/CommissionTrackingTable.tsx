"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, ColumnDef } from "@/components/DataTable";
import { commissionTracking, CommissionTracking } from "@/data/revenue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, DollarSign, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CommissionTrackingTable() {
  const [data] = useState<CommissionTracking[]>(commissionTracking);

  const columns: ColumnDef<CommissionTracking>[] = [
    {
      key: "facilityName",
      label: "Facility",
      render: (item) => <div className="font-medium">{item.facilityName}</div>,
    },
    {
      key: "period",
      label: "Period",
      render: (item) => <span>{item.period}</span>,
    },
    {
      key: "totalRevenue",
      label: "Total Revenue",
      render: (item) => (
        <div className="text-right">${item.totalRevenue.toLocaleString()}</div>
      ),
    },
    {
      key: "commissionRate",
      label: "Commission Rate",
      render: (item) => <Badge variant="outline">{item.commissionRate}%</Badge>,
    },
    {
      key: "commissionAmount",
      label: "Commission Due",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">
            {item.commissionAmount.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item) => {
        const variant =
          item.status === "paid"
            ? "default"
            : item.status === "pending"
              ? "secondary"
              : "destructive";
        return (
          <Badge variant={variant}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (item) => {
        const date = new Date(item.dueDate);
        const isOverdue = date < new Date() && item.status !== "paid";
        return (
          <div
            className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}
          >
            {isOverdue && <AlertCircle className="h-4 w-4" />}
            {date.toLocaleDateString()}
          </div>
        );
      },
    },
  ];

  const renderActions = (item: CommissionTracking) => (
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
        <DropdownMenuItem>Download Invoice</DropdownMenuItem>
        {item.status === "pending" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
          </>
        )}
        {item.status === "overdue" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              Send Reminder
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Calculate summary statistics
  const totalCommissionDue = data
    .filter((c) => c.status !== "paid")
    .reduce((sum, c) => sum + c.commissionAmount, 0);
  const overdueCommissions = data.filter((c) => c.status === "overdue");
  const pendingCommissions = data.filter((c) => c.status === "pending");

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCommissionDue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending and overdue commissions
            </p>
          </CardContent>
        </Card>
        <Card className={overdueCommissions.length > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueCommissions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {overdueCommissions
                .reduce((sum, c) => sum + c.commissionAmount, 0)
                .toLocaleString()}{" "}
              total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingCommissions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              $
              {pendingCommissions
                .reduce((sum, c) => sum + c.commissionAmount, 0)
                .toLocaleString()}{" "}
              total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Tracking</CardTitle>
          <CardDescription>
            Track commission payments due to your facilities
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
