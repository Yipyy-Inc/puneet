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
import { transactions, Transaction } from "@/data/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, RefreshCw, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TransactionsTable() {
  const [data] = useState<Transaction[]>(transactions);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "refunded":
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      key: "transactionDate",
      label: "Date",
      render: (item) => (
        <div className="text-sm">
          {new Date(item.transactionDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "facilityName",
      label: "Facility",
      render: (item) => <div className="font-medium">{item.facilityName}</div>,
    },
    {
      key: "customerName",
      label: "Customer",
      render: (item) => <div>{item.customerName || "N/A"}</div>,
    },
    {
      key: "description",
      label: "Description",
      render: (item) => (
        <div className="max-w-xs truncate">{item.description}</div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (item) => (
        <div className="text-right font-semibold">
          ${item.amount.toLocaleString()}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      render: (item) => (
        <Badge variant="outline" className="capitalize">
          {item.paymentMethod.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "paymentProvider",
      label: "Provider",
      render: (item) => <span>{item.paymentProvider}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (item) => getStatusBadge(item.status),
    },
  ];

  const renderActions = (item: Transaction) => (
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
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </DropdownMenuItem>
        {item.status === "success" && (
          <DropdownMenuItem>
            <RefreshCw className="mr-2 h-4 w-4" />
            Process Refund
          </DropdownMenuItem>
        )}
        {item.status === "failed" && (
          <DropdownMenuItem>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Transaction
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>View Full Details</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Calculate summary statistics
  const totalVolume = data
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount, 0);
  const successfulCount = data.filter((t) => t.status === "success").length;
  const failedCount = data.filter((t) => t.status === "failed").length;
  const successRate = (successfulCount / data.length) * 100;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalVolume.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful transactions
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
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">All statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {successfulCount} / {data.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            All payment transactions across facilities
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
