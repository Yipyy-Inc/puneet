"use client";

import { useState } from "react";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  DollarSign,
  Eye,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  User,
  Heart,
  Building,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Transaction extends Record<string, unknown> {
  id: number;
  bookingId: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  petName: string;
  service: string;
  date: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionType: "payment" | "refund";
  refundAmount?: number;
  cancellationReason?: string;
}

const exportTransactionsToCSV = (transactionsData: Transaction[]) => {
  const headers = [
    "Transaction ID",
    "Booking ID",
    "Client Name",
    "Pet Name",
    "Service",
    "Date",
    "Amount",
    "Payment Method",
    "Status",
    "Type",
  ];

  const csvContent = [
    headers.join(","),
    ...transactionsData.map((tx) =>
      [
        tx.id,
        tx.bookingId,
        `"${tx.clientName.replace(/"/g, '""')}"`,
        `"${tx.petName.replace(/"/g, '""')}"`,
        tx.service,
        tx.date,
        tx.amount,
        tx.paymentMethod,
        tx.paymentStatus,
        tx.transactionType,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `transactions_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FacilityBillingPage() {
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const facilityBookings = bookings.filter(
    (booking) => booking.facilityId === facilityId,
  );

  // Transform bookings into transactions
  const transactions: Transaction[] = facilityBookings.map((booking) => {
    const client = clients.find((c) => c.id === booking.clientId);
    const pet = client?.pets.find((p) => p.id === booking.petId);
    const bookingAny = booking as typeof booking & {
      refundAmount?: number;
      paymentMethod?: string;
      cancellationReason?: string;
    };

    return {
      id: booking.id,
      bookingId: booking.id,
      clientId: booking.clientId,
      clientName: client?.name || "Unknown Client",
      clientEmail: client?.email || "",
      petName: pet?.name || "Unknown Pet",
      service: booking.service,
      date: booking.startDate,
      amount:
        booking.paymentStatus === "refunded"
          ? -(bookingAny.refundAmount || booking.totalCost)
          : booking.totalCost,
      paymentMethod: bookingAny.paymentMethod || "not specified",
      paymentStatus: booking.paymentStatus,
      transactionType:
        booking.paymentStatus === "refunded" ? "refund" : "payment",
      refundAmount: bookingAny.refundAmount,
      cancellationReason: bookingAny.cancellationReason,
    };
  });

  // Calculate statistics
  const totalRevenue = transactions
    .filter((t) => t.paymentStatus === "paid")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingRevenue = transactions
    .filter((t) => t.paymentStatus === "pending")
    .reduce((sum, t) => sum + t.amount, 0);

  const refundedAmount = transactions
    .filter((t) => t.paymentStatus === "refunded")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalTransactions = transactions.length;

  const paidTransactions = transactions.filter(
    (t) => t.paymentStatus === "paid",
  ).length;

  const pendingTransactions = transactions.filter(
    (t) => t.paymentStatus === "pending",
  ).length;

  // Payment method breakdown
  const paymentMethodStats = transactions
    .filter((t) => t.paymentStatus === "paid")
    .reduce(
      (acc, t) => {
        const method = t.paymentMethod;
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count++;
        acc[method].amount += t.amount;
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );

  // Service revenue breakdown
  const serviceRevenue = transactions
    .filter((t) => t.paymentStatus === "paid")
    .reduce(
      (acc, t) => {
        acc[t.service] = (acc[t.service] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

  const columns: ColumnDef<Transaction>[] = [
    {
      key: "id",
      label: "Transaction ID",
      icon: Receipt,
      defaultVisible: true,
      render: (tx) => `#${tx.id}`,
    },
    {
      key: "clientName",
      label: "Client",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "petName",
      label: "Pet",
      icon: Heart,
      defaultVisible: true,
    },
    {
      key: "service",
      label: "Service",
      icon: Building,
      defaultVisible: true,
      render: (tx) => (
        <span className="capitalize">{tx.service.replace("_", " ")}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      icon: Calendar,
      defaultVisible: true,
      render: (tx) => new Date(tx.date).toLocaleDateString(),
    },
    {
      key: "amount",
      label: "Amount",
      icon: DollarSign,
      defaultVisible: true,
      render: (tx) => (
        <span
          className={tx.transactionType === "refund" ? "text-destructive" : ""}
        >
          ${Math.abs(tx.amount).toFixed(2)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      icon: CreditCard,
      defaultVisible: true,
      render: (tx) => (
        <div className="flex items-center gap-2">
          {tx.paymentMethod === "card" ? (
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          ) : tx.paymentMethod === "cash" ? (
            <Wallet className="h-4 w-4 text-muted-foreground" />
          ) : null}
          <span className="capitalize">{tx.paymentMethod}</span>
        </div>
      ),
    },
    {
      key: "paymentStatus",
      label: "Status",
      icon: DollarSign,
      defaultVisible: true,
      render: (tx) => (
        <StatusBadge type="status" value={tx.paymentStatus as string} />
      ),
    },
    {
      key: "transactionType",
      label: "Type",
      icon: Receipt,
      defaultVisible: false,
      render: (tx) => (
        <Badge
          variant={tx.transactionType === "refund" ? "destructive" : "default"}
        >
          {tx.transactionType}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "paymentStatus",
      label: "Payment Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "paid", label: "Paid" },
        { value: "pending", label: "Pending" },
        { value: "refunded", label: "Refunded" },
      ],
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      options: [
        { value: "all", label: "All Methods" },
        { value: "card", label: "Card" },
        { value: "cash", label: "Cash" },
        { value: "not specified", label: "Not Specified" },
      ],
    },
    {
      key: "transactionType",
      label: "Transaction Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "payment", label: "Payment" },
        { value: "refund", label: "Refund" },
      ],
    },
    {
      key: "service",
      label: "Service",
      options: [
        { value: "all", label: "All Services" },
        { value: "daycare", label: "Daycare" },
        { value: "boarding", label: "Boarding" },
        { value: "grooming", label: "Grooming" },
        { value: "vet", label: "Veterinary" },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Billing & Transactions - {facility.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => exportTransactionsToCSV(transactions)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paidTransactions} completed transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${pendingRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingTransactions} pending transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Refunded Amount
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${refundedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {
                transactions.filter((t) => t.paymentStatus === "refunded")
                  .length
              }{" "}
              refunds processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Avg: $
              {totalTransactions > 0
                ? (totalRevenue / paidTransactions).toFixed(2)
                : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method & Service Revenue Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Payment Method Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(paymentMethodStats).length > 0 ? (
                Object.entries(paymentMethodStats).map(([method, stats]) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {method === "card" ? (
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium capitalize">{method}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.count} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${stats.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalRevenue > 0
                          ? ((stats.amount / totalRevenue) * 100).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payment method data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(serviceRevenue).length > 0 ? (
                Object.entries(serviceRevenue)
                  .sort(([, a], [, b]) => b - a)
                  .map(([service, amount]) => (
                    <div
                      key={service}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium capitalize">
                            {service.replace("_", " ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {
                              transactions.filter(
                                (t) =>
                                  t.service === service &&
                                  t.paymentStatus === "paid",
                              ).length
                            }{" "}
                            bookings
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {totalRevenue > 0
                            ? ((amount / totalRevenue) * 100).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No service revenue data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <DataTable
        data={transactions}
        columns={columns}
        filters={filters}
        searchKey="clientName"
        searchPlaceholder="Search by client name..."
        itemsPerPage={10}
        actions={(transaction) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTransaction(transaction)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Transaction Details Modal */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => setSelectedTransaction(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction #{selectedTransaction?.id} Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Transaction Information</span>
                    <StatusBadge
                      type="status"
                      value={selectedTransaction.paymentStatus as string}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Transaction ID
                      </p>
                      <p className="font-medium">#{selectedTransaction.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Booking ID
                      </p>
                      <p className="font-medium">
                        #{selectedTransaction.bookingId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Transaction Type
                      </p>
                      <Badge
                        variant={
                          selectedTransaction.transactionType === "refund"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {selectedTransaction.transactionType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedTransaction.date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p
                        className={`text-xl font-bold ${
                          selectedTransaction.transactionType === "refund"
                            ? "text-destructive"
                            : "text-green-600"
                        }`}
                      >
                        {selectedTransaction.transactionType === "refund"
                          ? "-"
                          : ""}
                        ${Math.abs(selectedTransaction.amount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Payment Method
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedTransaction.paymentMethod === "card" ? (
                          <CreditCard className="h-4 w-4" />
                        ) : (
                          <Wallet className="h-4 w-4" />
                        )}
                        <p className="font-medium capitalize">
                          {selectedTransaction.paymentMethod}
                        </p>
                      </div>
                    </div>
                  </div>
                  {selectedTransaction.refundAmount && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Refund Amount
                      </p>
                      <p className="font-medium text-red-600">
                        ${selectedTransaction.refundAmount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">
                        {selectedTransaction.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTransaction.clientEmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pet</p>
                      <p className="font-medium">
                        {selectedTransaction.petName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-medium capitalize">
                        {selectedTransaction.service.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  {selectedTransaction.cancellationReason && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Cancellation Reason
                      </p>
                      <p className="font-medium">
                        {selectedTransaction.cancellationReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
