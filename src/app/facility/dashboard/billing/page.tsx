"use client";

import { useState } from "react";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { payments, invoices, giftCards, customerCredits } from "@/data/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TakePaymentModal } from "@/components/billing/TakePaymentModal";
import { ProcessRefundModal } from "@/components/billing/ProcessRefundModal";
import { CreateInvoiceModal } from "@/components/billing/CreateInvoiceModal";
import { IssueGiftCardModal } from "@/components/billing/IssueGiftCardModal";
import { AddCustomerCreditModal } from "@/components/billing/AddCustomerCreditModal";
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
  Gift,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Send,
  RefreshCw,
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

const exportPaymentsToCSV = (paymentsData: typeof payments) => {
  const headers = [
    "Payment ID",
    "Date",
    "Client ID",
    "Description",
    "Amount",
    "Tip",
    "Total",
    "Payment Method",
    "Status",
    "Processed By",
  ];

  const csvContent = [
    headers.join(","),
    ...paymentsData.map((p) =>
      [
        p.id,
        p.createdAt,
        p.clientId,
        `"${p.description.replace(/"/g, '""')}"`,
        p.amount.toFixed(2),
        (p.tipAmount || 0).toFixed(2),
        p.totalAmount.toFixed(2),
        p.paymentMethod,
        p.status,
        p.processedBy,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `payments_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FacilityBillingPage() {
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [activeTab, setActiveTab] = useState("payments");
  const [selectedTransaction, setSelectedTransaction] = useState<typeof payments[0] | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null);
  const [selectedGiftCard, setSelectedGiftCard] = useState<typeof giftCards[0] | null>(null);
  const [showTakePayment, setShowTakePayment] = useState(false);
  const [showProcessRefund, setShowProcessRefund] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showIssueGiftCard, setShowIssueGiftCard] = useState(false);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [refundPayment, setRefundPayment] = useState<typeof payments[0] | null>(null);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Filter data for this facility
  const facilityPayments = payments.filter((p) => p.facilityId === facilityId);
  const facilityInvoices = invoices.filter((inv) => inv.facilityId === facilityId);
  const facilityGiftCards = giftCards.filter((gc) => gc.facilityId === facilityId);
  const facilityCredits = customerCredits.filter((c) => c.facilityId === facilityId);

  // Outstanding balances
  const outstandingInvoices = facilityInvoices.filter(
    (inv) => inv.status === "sent" || inv.status === "overdue"
  );
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);

  // Calculate statistics
  const totalRevenue = facilityPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const pendingRevenue = facilityPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const refundedAmount = facilityPayments
    .filter((p) => p.status === "refunded" || p.status === "partially_refunded")
    .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

  const totalTips = facilityPayments
    .filter((p) => p.status === "completed" && p.tipAmount)
    .reduce((sum, p) => sum + (p.tipAmount || 0), 0);

  const paidTransactions = facilityPayments.filter((p) => p.status === "completed").length;

  // Payment method breakdown
  const paymentMethodStats = facilityPayments
    .filter((p) => p.status === "completed")
    .reduce(
      (acc, p) => {
        const method = p.paymentMethod;
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count++;
        acc[method].amount += p.totalAmount;
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Payment columns
  const paymentColumns: ColumnDef<(typeof facilityPayments)[0]>[] = [
    {
      key: "id",
      label: "Payment ID",
      icon: Receipt,
      defaultVisible: true,
      render: (p) => `#${p.id.split('-')[1]}`,
    },
    {
      key: "createdAt",
      label: "Date",
      icon: Calendar,
      defaultVisible: true,
      render: (p) => formatDate(p.createdAt),
    },
    {
      key: "clientId",
      label: "Client",
      icon: User,
      defaultVisible: true,
      render: (p) => clients.find((c) => c.id === p.clientId)?.name || "Unknown",
    },
    {
      key: "description",
      label: "Description",
      defaultVisible: true,
    },
    {
      key: "totalAmount",
      label: "Amount",
      icon: DollarSign,
      defaultVisible: true,
      render: (p) => (
        <span className={p.status === "refunded" ? "text-destructive" : "text-green-600"}>
          ${p.totalAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      label: "Method",
      icon: CreditCard,
      defaultVisible: true,
      render: (p) => (
        <div className="flex items-center gap-2">
          {p.paymentMethod === "card" && <CreditCard className="h-4 w-4" />}
          {p.paymentMethod === "cash" && <Wallet className="h-4 w-4" />}
          {p.paymentMethod === "gift_card" && <Gift className="h-4 w-4" />}
          <span className="capitalize">{p.paymentMethod.replace("_", " ")}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (p) => <StatusBadge type="status" value={p.status} />,
    },
  ];

  // Invoice columns
  const invoiceColumns: ColumnDef<(typeof facilityInvoices)[0]>[] = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      icon: FileText,
      defaultVisible: true,
    },
    {
      key: "issuedDate",
      label: "Issued",
      icon: Calendar,
      defaultVisible: true,
      render: (inv) => formatDate(inv.issuedDate),
    },
    {
      key: "clientId",
      label: "Client",
      icon: User,
      defaultVisible: true,
      render: (inv) => clients.find((c) => c.id === inv.clientId)?.name || "Unknown",
    },
    {
      key: "total",
      label: "Total",
      icon: DollarSign,
      defaultVisible: true,
      render: (inv) => `$${inv.total.toFixed(2)}`,
    },
    {
      key: "amountDue",
      label: "Amount Due",
      defaultVisible: true,
      render: (inv) => (
        <span className={inv.amountDue > 0 ? "text-amber-600 font-medium" : "text-green-600"}>
          ${inv.amountDue.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (inv) => {
        const statusColors = {
          draft: "secondary",
          sent: "default",
          paid: "outline",
          overdue: "destructive",
          cancelled: "secondary",
        };
        return <Badge variant={statusColors[inv.status as keyof typeof statusColors] as any}>{inv.status}</Badge>;
      },
    },
    {
      key: "dueDate",
      label: "Due Date",
      defaultVisible: true,
      render: (inv) => formatDate(inv.dueDate),
    },
  ];

  const paymentFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "completed", label: "Completed" },
        { value: "pending", label: "Pending" },
        { value: "refunded", label: "Refunded" },
        { value: "failed", label: "Failed" },
      ],
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      options: [
        { value: "all", label: "All Methods" },
        { value: "card", label: "Card" },
        { value: "cash", label: "Cash" },
        { value: "gift_card", label: "Gift Card" },
        { value: "credit", label: "Credit" },
      ],
    },
  ];

  const invoiceFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "isRecurring",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "true", label: "Recurring" },
        { value: "false", label: "One-time" },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Billing & Payments - {facility.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="default" onClick={() => setShowTakePayment(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Take Payment
          </Button>
          <Button variant="outline" onClick={() => setShowCreateInvoice(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
          <Button variant="outline" onClick={() => exportPaymentsToCSV(facilityPayments)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              {paidTransactions} payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${pendingRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {facilityPayments.filter((p) => p.status === "pending").length} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingInvoices.length} invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tips</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalTips.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {paidTransactions} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunded</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${refundedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {facilityPayments.filter((p) => p.status === "refunded").length} refunds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            {outstandingInvoices.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {outstandingInvoices.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
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
                          {method === "card" && <CreditCard className="h-5 w-5 text-muted-foreground" />}
                          {method === "cash" && <Wallet className="h-5 w-5 text-muted-foreground" />}
                          {method === "gift_card" && <Gift className="h-5 w-5 text-muted-foreground" />}
                          <div>
                            <p className="font-medium capitalize">{method.replace("_", " ")}</p>
                            <p className="text-sm text-muted-foreground">{stats.count} payments</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${stats.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {totalRevenue > 0 ? ((stats.amount / totalRevenue) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No payment data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {facilityPayments.slice(0, 5).map((payment) => {
                    const client = clients.find((c) => c.id === payment.clientId);
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{client?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{payment.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">${payment.totalAmount.toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs">
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            data={facilityPayments}
            columns={paymentColumns}
            filters={paymentFilters}
            searchKey="description"
            searchPlaceholder="Search payments..."
            itemsPerPage={10}
            actions={(payment) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransaction(payment)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <DataTable
            data={facilityInvoices}
            columns={invoiceColumns}
            filters={invoiceFilters}
            searchKey="invoiceNumber"
            searchPlaceholder="Search invoices..."
            itemsPerPage={10}
            actions={(invoice) => (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {invoice.status === "sent" || invoice.status === "overdue" ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const client = clients.find((c) => c.id === invoice.clientId);
                      console.log("Sending reminder for invoice:", invoice.invoiceNumber);
                      alert(`Reminder sent to ${client?.email} for invoice ${invoice.invoiceNumber}!`);
                    }}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Remind
                  </Button>
                ) : null}
              </div>
            )}
          />
        </TabsContent>

        {/* Gift Cards Tab */}
        <TabsContent value="giftcards" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowIssueGiftCard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Issue Gift Card
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {facilityGiftCards.map((gc) => {
              const purchaser = gc.purchasedByClientId
                ? clients.find((c) => c.id === gc.purchasedByClientId)
                : null;
              return (
                <Card key={gc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium">{gc.code}</CardTitle>
                        <Badge variant={gc.status === "active" ? "default" : "secondary"} className="mt-1">
                          {gc.status}
                        </Badge>
                      </div>
                      <Gift className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Balance:</span>
                      <span className="font-bold">${gc.currentBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Initial:</span>
                      <span className="text-sm">${gc.initialAmount.toFixed(2)}</span>
                    </div>
                    {gc.purchasedBy && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Purchased by:</p>
                        <p className="text-sm font-medium">{gc.purchasedBy}</p>
                      </div>
                    )}
                    {gc.recipientName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Recipient:</p>
                        <p className="text-sm font-medium">{gc.recipientName}</p>
                      </div>
                    )}
                    {gc.expiryDate && (
                      <div className="text-xs text-muted-foreground">
                        Expires: {formatDate(gc.expiryDate)}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedGiftCard(gc)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowAddCredit(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer Credit
            </Button>
          </div>
          <div className="grid gap-4">
            {facilityCredits.map((credit) => {
              const client = clients.find((c) => c.id === credit.clientId);
              return (
                <Card key={credit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{client?.name || "Unknown Client"}</h4>
                          <Badge variant={credit.status === "active" ? "default" : "secondary"}>
                            {credit.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {credit.reason}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{credit.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Remaining:</span>
                            <span className="font-bold ml-1">${credit.remainingAmount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Original:</span>
                            <span className="ml-1">${credit.amount.toFixed(2)}</span>
                          </div>
                          {credit.expiryDate && (
                            <div>
                              <span className="text-muted-foreground">Expires:</span>
                              <span className="ml-1">{formatDate(credit.expiryDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ${credit.remainingAmount.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {credit.amount > 0
                            ? Math.round((credit.remainingAmount / credit.amount) * 100)
                            : 0}
                          % remaining
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Outstanding Tab */}
        <TabsContent value="outstanding" className="space-y-4">
          {outstandingInvoices.length > 0 ? (
            <div className="space-y-4">
              {outstandingInvoices.map((invoice) => {
                const client = clients.find((c) => c.id === invoice.clientId);
                const daysOverdue = invoice.status === "overdue"
                  ? Math.floor(
                      (new Date().getTime() - new Date(invoice.dueDate).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : 0;
                return (
                  <Card key={invoice.id} className={invoice.status === "overdue" ? "border-destructive" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{client?.name || "Unknown Client"}</h4>
                          <p className="text-sm text-muted-foreground">
                            Invoice: {invoice.invoiceNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            ${invoice.amountDue.toFixed(2)}
                          </div>
                          <Badge variant={invoice.status === "overdue" ? "destructive" : "default"}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Issued:</p>
                          <p className="font-medium">{formatDate(invoice.issuedDate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due:</p>
                          <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total:</p>
                          <p className="font-medium">${invoice.total.toFixed(2)}</p>
                        </div>
                      </div>
                      {invoice.status === "overdue" && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive font-medium">
                            {daysOverdue} days overdue • {invoice.reminderCount} reminders sent
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const client = clients.find((c) => c.id === invoice.clientId);
                            console.log("Sending reminder for invoice:", invoice.invoiceNumber);
                            alert(`Reminder sent to ${client?.email} for invoice ${invoice.invoiceNumber}!`);
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send Reminder
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p className="text-sm text-muted-foreground">No outstanding invoices</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Details Modal */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => setSelectedTransaction(null)}
      >
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (() => {
            const client = clients.find((c) => c.id === selectedTransaction.clientId);
            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Payment Information</CardTitle>
                      <StatusBadge type="status" value={selectedTransaction.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Payment ID</p>
                        <p className="font-medium">{selectedTransaction.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">{formatDateTime(selectedTransaction.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Processed By</p>
                        <p className="font-medium">{selectedTransaction.processedBy}</p>
                      </div>
                      {selectedTransaction.invoiceId && (
                        <div>
                          <p className="text-sm text-muted-foreground">Invoice</p>
                          <p className="font-medium">{selectedTransaction.invoiceId}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Amount Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Subtotal:</span>
                      <span className="font-medium">${selectedTransaction.amount.toFixed(2)}</span>
                    </div>
                    {selectedTransaction.tipAmount && selectedTransaction.tipAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tip:</span>
                        <span className="font-medium">+${selectedTransaction.tipAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedTransaction.creditUsed && selectedTransaction.creditUsed > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-600">Credit Applied:</span>
                        <span className="font-medium text-green-600">
                          -${selectedTransaction.creditUsed.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total:</span>
                      <span className="text-xl font-bold text-green-600">
                        ${selectedTransaction.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {selectedTransaction.paymentMethod === "card" && (
                        <>
                          <CreditCard className="h-5 w-5" />
                          <div>
                            <p className="font-medium">
                              {selectedTransaction.cardBrand?.toUpperCase()} •••• {selectedTransaction.cardLast4}
                            </p>
                            {selectedTransaction.stripeChargeId && (
                              <p className="text-xs text-muted-foreground">
                                Stripe: {selectedTransaction.stripeChargeId}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      {selectedTransaction.paymentMethod === "cash" && (
                        <>
                          <Wallet className="h-5 w-5" />
                          <p className="font-medium">Cash Payment</p>
                        </>
                      )}
                      {selectedTransaction.paymentMethod === "gift_card" && (
                        <>
                          <Gift className="h-5 w-5" />
                          <p className="font-medium">Gift Card: {selectedTransaction.giftCardId}</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{client?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{client?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{selectedTransaction.description}</p>
                    </div>
                    {selectedTransaction.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedTransaction.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedTransaction.refundAmount && (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-destructive">Refund Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Refund Amount:</span>
                        <span className="font-bold text-destructive">
                          ${selectedTransaction.refundAmount.toFixed(2)}
                        </span>
                      </div>
                      {selectedTransaction.refundReason && (
                        <div>
                          <p className="text-sm text-muted-foreground">Reason:</p>
                          <p className="text-sm">{selectedTransaction.refundReason}</p>
                        </div>
                      )}
                      {selectedTransaction.refundedAt && (
                        <div className="text-xs text-muted-foreground">
                          Refunded on: {formatDateTime(selectedTransaction.refundedAt)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  {selectedTransaction.receiptUrl && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        // Simulate receipt download
                        alert(`Receipt for payment ${selectedTransaction.id} downloaded successfully!`);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  )}
                  {selectedTransaction.status === "completed" && !selectedTransaction.refundAmount && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setRefundPayment(selectedTransaction);
                        setShowProcessRefund(true);
                        setSelectedTransaction(null);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Process Refund
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Invoice Details Modal */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (() => {
            const client = clients.find((c) => c.id === selectedInvoice.clientId);
            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedInvoice.invoiceNumber}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Issued: {formatDate(selectedInvoice.issuedDate)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          selectedInvoice.status === "paid"
                            ? "outline"
                            : selectedInvoice.status === "overdue"
                              ? "destructive"
                              : "default"
                        }
                      >
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Client</p>
                        <p className="font-medium">{client?.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{client?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedInvoice.items.map((item) => (
                        <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              ${item.unitPrice.toFixed(2)} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold">${item.total.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm">Subtotal:</span>
                        <span className="font-medium">${selectedInvoice.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedInvoice.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span className="text-sm">
                            Discount {selectedInvoice.discountReason && `(${selectedInvoice.discountReason})`}:
                          </span>
                          <span className="font-medium">-${selectedInvoice.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedInvoice.tax > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm">Tax ({selectedInvoice.taxRate}%):</span>
                          <span className="font-medium">${selectedInvoice.tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-bold">Total:</span>
                        <span className="text-xl font-bold">${selectedInvoice.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Amount Paid:</span>
                        <span className="font-medium text-green-600">
                          ${selectedInvoice.amountPaid.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Amount Due:</span>
                        <span className="text-lg font-bold text-amber-600">
                          ${selectedInvoice.amountDue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedInvoice.isRecurring && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Recurring Invoice
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Frequency</p>
                          <p className="font-medium capitalize">{selectedInvoice.recurringFrequency}</p>
                        </div>
                        {selectedInvoice.nextInvoiceDate && (
                          <div>
                            <p className="text-sm text-muted-foreground">Next Invoice</p>
                            <p className="font-medium">{formatDate(selectedInvoice.nextInvoiceDate)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      alert(`Invoice ${selectedInvoice.invoiceNumber} PDF downloaded successfully!`);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  {selectedInvoice.status === "draft" && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        console.log("Sending invoice:", selectedInvoice.invoiceNumber);
                        alert(`Invoice ${selectedInvoice.invoiceNumber} sent to ${clients.find(c => c.id === selectedInvoice.clientId)?.email}!`);
                        setSelectedInvoice(null);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Invoice
                    </Button>
                  )}
                  {(selectedInvoice.status === "sent" || selectedInvoice.status === "overdue") && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        console.log("Sending reminder for invoice:", selectedInvoice.invoiceNumber);
                        alert(`Reminder sent for invoice ${selectedInvoice.invoiceNumber}!`);
                        setSelectedInvoice(null);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reminder
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Gift Card Details Modal */}
      <Dialog
        open={!!selectedGiftCard}
        onOpenChange={() => setSelectedGiftCard(null)}
      >
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Gift Card Details
            </DialogTitle>
          </DialogHeader>
          {selectedGiftCard && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedGiftCard.code}</CardTitle>
                      <Badge variant={selectedGiftCard.status === "active" ? "default" : "secondary"} className="mt-1">
                        {selectedGiftCard.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">
                        ${selectedGiftCard.currentBalance.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Initial Amount</p>
                      <p className="font-medium">${selectedGiftCard.initialAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge variant="outline" className="capitalize">{selectedGiftCard.type}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Date</p>
                      <p className="font-medium">{formatDate(selectedGiftCard.purchaseDate)}</p>
                    </div>
                    {selectedGiftCard.expiryDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Expiry Date</p>
                        <p className="font-medium">{formatDate(selectedGiftCard.expiryDate)}</p>
                      </div>
                    )}
                  </div>

                  {(selectedGiftCard.purchasedBy || selectedGiftCard.recipientName) && (
                    <div className="pt-4 border-t">
                      {selectedGiftCard.purchasedBy && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground">Purchased By</p>
                          <p className="font-medium">{selectedGiftCard.purchasedBy}</p>
                        </div>
                      )}
                      {selectedGiftCard.recipientName && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground">Recipient</p>
                          <p className="font-medium">{selectedGiftCard.recipientName}</p>
                          {selectedGiftCard.recipientEmail && (
                            <p className="text-sm text-muted-foreground">{selectedGiftCard.recipientEmail}</p>
                          )}
                        </div>
                      )}
                      {selectedGiftCard.message && (
                        <div>
                          <p className="text-sm text-muted-foreground">Message</p>
                          <p className="text-sm italic">"{selectedGiftCard.message}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedGiftCard.transactionHistory.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3">Transaction History</h4>
                      <div className="space-y-2">
                        {selectedGiftCard.transactionHistory.map((tx) => (
                          <div key={tx.id} className="flex justify-between items-center p-2 rounded bg-muted/50">
                            <div>
                              <Badge variant={tx.type === "redemption" ? "default" : "secondary"} className="text-xs">
                                {tx.type}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(tx.timestamp)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${tx.type === "redemption" ? "text-red-600" : "text-green-600"}`}>
                                {tx.type === "redemption" ? "-" : "+"}${tx.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Balance: ${tx.balanceAfter.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <TakePaymentModal
        open={showTakePayment}
        onOpenChange={setShowTakePayment}
        facilityId={facilityId}
        onSuccess={(payment) => {
          console.log("Payment successful:", payment);
          alert(`Payment of $${payment.totalAmount.toFixed(2)} processed successfully!`);
        }}
      />

      <ProcessRefundModal
        open={showProcessRefund}
        onOpenChange={setShowProcessRefund}
        payment={refundPayment}
        onSuccess={(refund) => {
          console.log("Refund processed:", refund);
          alert(`Refund of $${refund.amount.toFixed(2)} processed successfully!`);
          setRefundPayment(null);
        }}
      />

      <CreateInvoiceModal
        open={showCreateInvoice}
        onOpenChange={setShowCreateInvoice}
        facilityId={facilityId}
        onSuccess={(invoice) => {
          console.log("Invoice created:", invoice);
          alert(`Invoice ${invoice.invoiceNumber} created successfully!`);
        }}
      />

      <IssueGiftCardModal
        open={showIssueGiftCard}
        onOpenChange={setShowIssueGiftCard}
        facilityId={facilityId}
        onSuccess={(giftCard) => {
          console.log("Gift card issued:", giftCard);
          alert(`Gift card ${giftCard.code} issued successfully!`);
        }}
      />

      <AddCustomerCreditModal
        open={showAddCredit}
        onOpenChange={setShowAddCredit}
        facilityId={facilityId}
        onSuccess={(credit) => {
          console.log("Credit added:", credit);
          alert(`Credit of $${credit.amount.toFixed(2)} added successfully!`);
        }}
      />
    </div>
  );
}
