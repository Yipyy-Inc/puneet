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
import { paymentProviders, PaymentProvider } from "@/data/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Settings, TrendingUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PaymentProvidersTable() {
  const [data] = useState<PaymentProvider[]>(paymentProviders);

  const columns: ColumnDef<PaymentProvider>[] = [
    {
      key: "name",
      label: "Provider",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="font-medium">{item.name}</div>
          {!item.isActive && <Badge variant="outline">Inactive</Badge>}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (item) => (
        <Badge variant="secondary" className="capitalize">
          {item.type}
        </Badge>
      ),
    },
    {
      key: "facilities",
      label: "Facilities",
      render: (item) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{item.facilities.length}</span>
          <span className="text-muted-foreground text-sm">connected</span>
        </div>
      ),
    },
    {
      key: "processingFee",
      label: "Fees",
      render: (item) => (
        <div className="text-sm">
          {item.processingFeePercentage}% + ${item.fixedFee.toFixed(2)}
        </div>
      ),
    },
    {
      key: "totalTransactions",
      label: "Transactions",
      render: (item) => (
        <div className="text-right">
          {item.statistics.totalTransactions.toLocaleString()}
        </div>
      ),
    },
    {
      key: "successRate",
      label: "Success Rate",
      render: (item) => {
        const rate =
          (item.statistics.successfulTransactions /
            item.statistics.totalTransactions) *
          100;
        return (
          <div className="flex items-center justify-end gap-1">
            <span className={rate > 90 ? "text-green-600 font-medium" : ""}>
              {rate.toFixed(1)}%
            </span>
            {rate > 90 && <TrendingUp className="h-4 w-4 text-green-600" />}
          </div>
        );
      },
    },
    {
      key: "totalVolume",
      label: "Volume",
      render: (item) => (
        <div className="text-right font-semibold">
          ${item.statistics.totalVolume.toLocaleString()}
        </div>
      ),
    },
  ];

  const renderActions = (item: PaymentProvider) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Configure Provider
        </DropdownMenuItem>
        <DropdownMenuItem>View Statistics</DropdownMenuItem>
        <DropdownMenuItem>Manage Facilities</DropdownMenuItem>
        <DropdownMenuSeparator />
        {item.isActive ? (
          <DropdownMenuItem className="text-red-600">
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem>Activate</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Calculate summary
  const totalTransactions = data.reduce(
    (sum, p) => sum + p.statistics.totalTransactions,
    0,
  );
  const totalVolume = data.reduce(
    (sum, p) => sum + p.statistics.totalVolume,
    0,
  );
  const activeProviders = data.filter((p) => p.isActive).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Active Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProviders}</div>
            <p className="text-xs text-muted-foreground">
              Out of {data.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTransactions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalVolume.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Payment processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Providers</CardTitle>
          <CardDescription>
            Configure and manage payment integration providers
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
