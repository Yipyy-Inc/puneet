"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { transactions, Transaction } from "@/data/transactions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, RefreshCw, Eye, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TransactionsTable() {
  const [data, setData] = useState<Transaction[]>(transactions);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundComplete, setRefundComplete] = useState(false);

  const handleDownloadReceipt = (transaction: Transaction) => {
    const receiptContent = `
TRANSACTION RECEIPT
====================
Transaction ID: ${transaction.id}
Date: ${new Date(transaction.transactionDate).toLocaleString()}
Facility: ${transaction.facilityName}
Customer: ${transaction.customerName || 'N/A'}
Description: ${transaction.description}
Amount: $${transaction.amount.toFixed(2)}
Payment Method: ${transaction.paymentMethod}
Provider: ${transaction.paymentProvider}
Status: ${transaction.status.toUpperCase()}
    `.trim();
    
    const blob = new Blob([receiptContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `receipt_${transaction.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefund = () => {
    if (!selectedTransaction) return;
    setRefundComplete(true);
    setData(prev =>
      prev.map(t =>
        t.id === selectedTransaction.id ? { ...t, status: "refunded" as const } : t
      )
    );
    setTimeout(() => {
      setRefundComplete(false);
      setShowRefundModal(false);
      setSelectedTransaction(null);
    }, 2000);
  };

  const handleRetry = (transaction: Transaction) => {
    // Simulate retry - change status to success
    setData(prev =>
      prev.map(t =>
        t.id === transaction.id ? { ...t, status: "success" as const } : t
      )
    );
  };

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
        <DropdownMenuItem onClick={() => handleDownloadReceipt(item)}>
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </DropdownMenuItem>
        {item.status === "success" && (
          <DropdownMenuItem onClick={() => { setSelectedTransaction(item); setShowRefundModal(true); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Process Refund
          </DropdownMenuItem>
        )}
        {item.status === "failed" && (
          <DropdownMenuItem onClick={() => handleRetry(item)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Transaction
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { setSelectedTransaction(item); setShowDetailsModal(true); }}>
          <Eye className="mr-2 h-4 w-4" />
          View Full Details
        </DropdownMenuItem>
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

      {/* Transaction Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono font-medium">{selectedTransaction.id}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold">${selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedTransaction.transactionDate).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{selectedTransaction.description}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Facility</p>
                  <p className="font-medium">{selectedTransaction.facilityName}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedTransaction.customerName || 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <Badge variant="outline" className="capitalize">{selectedTransaction.paymentMethod.replace('_', ' ')}</Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p className="font-medium">{selectedTransaction.paymentProvider}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => selectedTransaction && handleDownloadReceipt(selectedTransaction)}>
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Refund transaction #{selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          {refundComplete ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Refund Processed</h3>
              <p className="text-sm text-muted-foreground">The refund has been initiated</p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This will refund the full amount of ${selectedTransaction?.amount.toLocaleString()} to the customer.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold">${selectedTransaction?.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{selectedTransaction?.customerName || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRefundModal(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleRefund}>Process Refund</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
