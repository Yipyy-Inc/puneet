"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import {
  payments,
  invoices,
  giftCards,
  customerCredits,
} from "@/data/payments";
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
  FileText,
  Send,
  RefreshCw,
  ExternalLink,
  Vault,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const router = useRouter();
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [activeTab, setActiveTab] = useState("payments");
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<
    (typeof payments)[0] | null
  >(null);
  const [selectedGiftCard, setSelectedGiftCard] = useState<
    (typeof giftCards)[0] | null
  >(null);
  const [showTakePayment, setShowTakePayment] = useState(false);
  const [showProcessRefund, setShowProcessRefund] = useState(false);
  const [showIssueGiftCard, setShowIssueGiftCard] = useState(false);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [refundPayment, setRefundPayment] = useState<
    (typeof payments)[0] | null
  >(null);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Filter data for this facility
  const facilityPayments = payments.filter((p) => p.facilityId === facilityId);
  const facilityInvoices = invoices.filter(
    (inv) => inv.facilityId === facilityId,
  );
  const facilityGiftCards = giftCards.filter(
    (gc) => gc.facilityId === facilityId,
  );
  const facilityCredits = customerCredits.filter(
    (c) => c.facilityId === facilityId,
  );

  // Outstanding balances
  const outstandingInvoices = facilityInvoices.filter(
    (inv) => inv.status === "sent" || inv.status === "overdue",
  );
  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.amountDue,
    0,
  );

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

  const paidTransactions = facilityPayments.filter(
    (p) => p.status === "completed",
  ).length;

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
      render: (p) => `#${p.id.split("-")[1]}`,
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
      render: (p) =>
        clients.find((c) => c.id === p.clientId)?.name || "Unknown",
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
        <span
          className={`price-value ${
            p.status === "refunded" ? "text-destructive" : "text-green-600"
          }`}
        >
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
          {p.paymentMethod === "card" && <CreditCard className="size-4" />}
          {p.paymentMethod === "cash" && <Wallet className="size-4" />}
          {p.paymentMethod === "gift_card" && <Gift className="size-4" />}
          <span className="capitalize">
            {p.paymentMethod.replace("_", " ")}
          </span>
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Billing & Payments - {facility.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button variant="default" onClick={() => setShowTakePayment(true)}>
            <Plus className="mr-2 size-4" />
            Take Payment
          </Button>
          <Button
            variant="outline"
            onClick={() => exportPaymentsToCSV(facilityPayments)}
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stat tiles — click to filter the payments table */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            key: "completed",
            label: "Total Revenue",
            icon: DollarSign,
            value: `$${totalRevenue.toFixed(2)}`,
            sub: `${paidTransactions} payments`,
            color: "text-green-600",
          },
          {
            key: "pending",
            label: "Pending",
            icon: TrendingUp,
            value: `$${pendingRevenue.toFixed(2)}`,
            sub: `${facilityPayments.filter((p) => p.status === "pending").length} awaiting`,
            color: "text-amber-600",
          },
          {
            key: "outstanding",
            label: "Outstanding",
            icon: AlertCircle,
            value: `$${totalOutstanding.toFixed(2)}`,
            sub: `${outstandingInvoices.length} invoices`,
            color: "text-red-600",
          },
          {
            key: "tips",
            label: "Tips",
            icon: Gift,
            value: `$${totalTips.toFixed(2)}`,
            sub: `${paidTransactions} transactions`,
            color: "",
          },
          {
            key: "refunded",
            label: "Refunded",
            icon: TrendingDown,
            value: `$${refundedAmount.toFixed(2)}`,
            sub: `${facilityPayments.filter((p) => p.status === "refunded").length} refunds`,
            color: "text-red-600",
          },
        ].map(({ key, label, icon: Icon, value, sub, color }) => {
          const isActive = statFilter === key;
          const isFilterable = key !== "tips" && key !== "outstanding";
          return (
            <Card
              key={key}
              className={[
                "transition-all",
                isFilterable || key === "outstanding"
                  ? "cursor-pointer select-none"
                  : "",
                isActive
                  ? "ring-primary ring-2 ring-offset-1"
                  : isFilterable || key === "outstanding"
                    ? "hover:border-primary/50"
                    : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (key === "outstanding") {
                  setActiveTab("outstanding");
                  return;
                }
                if (!isFilterable) return;
                setStatFilter(isActive ? null : key);
                setActiveTab("payments");
              }}
            >
              <CardContent className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-medium">
                    {label}
                  </p>
                  <Icon
                    className={[
                      "size-3.5",
                      isActive ? color || "text-primary" : "text-muted-foreground",
                    ].join(" ")}
                  />
                </div>
                <p
                  className={[
                    "price-value mt-1 text-xl font-semibold",
                    color,
                  ].join(" ")}
                >
                  {value}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
                {isActive && (
                  <p className="text-primary mt-1 text-xs font-medium">
                    Filtered ✕
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabbed Interface */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          if (v !== "payments") setStatFilter(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="giftcards">Gift Cards</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="cash-drawer" asChild>
            <Link href="/facility/dashboard/billing/cash-drawer" className="flex items-center gap-1.5">
              <Vault className="size-3.5" />
              Cash Drawer
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium">By Method</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="divide-y">
                  {Object.entries(paymentMethodStats).length > 0 ? (
                    Object.entries(paymentMethodStats).map(
                      ([method, stats]) => {
                        const pct =
                          totalRevenue > 0
                            ? (stats.amount / totalRevenue) * 100
                            : 0;
                        return (
                          <div
                            key={method}
                            className="flex items-center gap-3 py-2"
                          >
                            {method === "card" && (
                              <CreditCard className="text-muted-foreground size-3.5 shrink-0" />
                            )}
                            {method === "cash" && (
                              <Wallet className="text-muted-foreground size-3.5 shrink-0" />
                            )}
                            {method === "gift_card" && (
                              <Gift className="text-muted-foreground size-3.5 shrink-0" />
                            )}
                            <span className="text-sm capitalize">
                              {method.replace("_", " ")}
                            </span>
                            <div className="bg-muted mx-2 h-1.5 flex-1 overflow-hidden rounded-full">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground w-8 text-right text-xs">
                              {pct.toFixed(0)}%
                            </span>
                            <span className="price-value w-20 text-right text-sm font-medium">
                              ${stats.amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No payment data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="divide-y">
                  {facilityPayments.slice(0, 5).map((payment) => {
                    const client = clients.find(
                      (c) => c.id === payment.clientId,
                    );
                    return (
                      <div
                        key={payment.id}
                        className="hover:bg-muted/50 -mx-1 flex cursor-pointer items-center gap-3 rounded px-1 py-2"
                        onClick={() => {
                          if (payment.bookingId)
                            router.push(
                              `/facility/dashboard/bookings/${payment.bookingId}`,
                            );
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {client?.name || "Unknown"}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {payment.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge type="status" value={payment.status} />
                          <span className="price-value text-sm font-medium">
                            ${payment.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            data={
              statFilter
                ? facilityPayments.filter((p) => p.status === statFilter)
                : facilityPayments
            }
            columns={paymentColumns}
            filters={paymentFilters}
            searchKey="description"
            searchPlaceholder="Search payments..."
            itemsPerPage={10}
            onRowClick={(payment) => {
              if (payment.bookingId) {
                router.push(
                  `/facility/dashboard/bookings/${payment.bookingId}`,
                );
              } else {
                setSelectedTransaction(payment);
              }
            }}
            actions={(payment) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransaction(payment)}
                title="View payment details"
              >
                <Eye className="size-4" />
              </Button>
            )}
          />
        </TabsContent>

        {/* Gift Cards Tab */}
        <TabsContent value="giftcards" className="space-y-4">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setShowIssueGiftCard(true)}>
              <Plus className="mr-2 size-4" />
              Issue Gift Card
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {facilityGiftCards.map((gc) => {
              return (
                <Card key={gc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {gc.code}
                        </CardTitle>
                        <Badge
                          variant={
                            gc.status === "active" ? "default" : "secondary"
                          }
                          className="mt-1"
                        >
                          {gc.status}
                        </Badge>
                      </div>
                      <Gift className="text-muted-foreground size-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Balance:
                      </span>
                      <span className="price-value">
                        ${gc.currentBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Initial:
                      </span>
                      <span className="price-value text-sm">
                        ${gc.initialAmount.toFixed(2)}
                      </span>
                    </div>
                    {gc.purchasedBy && (
                      <div className="border-t pt-2">
                        <p className="text-muted-foreground text-xs">
                          Purchased by:
                        </p>
                        <p className="text-sm font-medium">{gc.purchasedBy}</p>
                      </div>
                    )}
                    {gc.recipientName && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Recipient:
                        </p>
                        <p className="text-sm font-medium">
                          {gc.recipientName}
                        </p>
                      </div>
                    )}
                    {gc.expiryDate && (
                      <div className="text-muted-foreground text-xs">
                        Expires: {formatDate(gc.expiryDate)}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
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
        <TabsContent value="credits" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {facilityCredits.length} credit
              {facilityCredits.length !== 1 ? "s" : ""} on file
            </p>
            <Button size="sm" onClick={() => setShowAddCredit(true)}>
              <Plus className="mr-2 size-4" />
              Add Credit
            </Button>
          </div>
          <Card>
            <div className="divide-y">
              {facilityCredits.map((credit) => {
                const client = clients.find((c) => c.id === credit.clientId);
                const pct =
                  credit.amount > 0
                    ? Math.round(
                        (credit.remainingAmount / credit.amount) * 100,
                      )
                    : 0;
                return (
                  <div
                    key={credit.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-6 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {client?.name || "Unknown Client"}
                        </span>
                        <Badge
                          variant={
                            credit.status === "active" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {credit.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="capitalize text-xs"
                        >
                          {credit.reason}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {credit.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {pct}% of{" "}
                          <span className="price-value">
                            ${credit.amount.toFixed(2)}
                          </span>{" "}
                          remaining
                          {credit.expiryDate &&
                            ` · expires ${formatDate(credit.expiryDate)}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="price-value text-base font-semibold text-green-600">
                        ${credit.remainingAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {facilityCredits.length === 0 && (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No credits on file
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Outstanding Tab */}
        <TabsContent value="outstanding" className="space-y-3">
          {outstandingInvoices.length > 0 ? (
            <>
              <p className="text-muted-foreground text-sm">
                {outstandingInvoices.length} unpaid invoice
                {outstandingInvoices.length !== 1 ? "s" : ""} ·{" "}
                <span className="price-value text-red-600 font-medium">
                  ${totalOutstanding.toFixed(2)}
                </span>{" "}
                total outstanding
              </p>
              <Card>
                <div className="divide-y">
                  {outstandingInvoices.map((invoice) => {
                    const client = clients.find(
                      (c) => c.id === invoice.clientId,
                    );
                    const daysOverdue =
                      invoice.status === "overdue"
                        ? Math.floor(
                            (new Date().getTime() -
                              new Date(invoice.dueDate).getTime()) /
                              (1000 * 60 * 60 * 24),
                          )
                        : 0;
                    return (
                      <div
                        key={invoice.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-6 px-4 py-3"
                        data-overdue={invoice.status === "overdue"}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {client?.name || "Unknown Client"}
                            </span>
                            <Badge
                              variant={
                                invoice.status === "overdue"
                                  ? "destructive"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {invoice.status}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {invoice.invoiceNumber}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                            <span>Issued {formatDate(invoice.issuedDate)}</span>
                            <span
                              className={
                                invoice.status === "overdue"
                                  ? "text-destructive font-medium"
                                  : ""
                              }
                            >
                              Due {formatDate(invoice.dueDate)}
                              {daysOverdue > 0 && ` · ${daysOverdue}d overdue`}
                            </span>
                            {invoice.reminderCount > 0 && (
                              <span>
                                {invoice.reminderCount} reminder
                                {invoice.reminderCount !== 1 ? "s" : ""} sent
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="price-value text-sm font-semibold text-red-600">
                              ${invoice.amountDue.toFixed(2)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              of ${invoice.total.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                alert(
                                  `Reminder sent to ${client?.email} for invoice ${invoice.invoiceNumber}!`,
                                );
                              }}
                            >
                              <Send className="size-3.5" />
                            </Button>
                            {invoice.bookingId && (
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  href={`/facility/dashboard/bookings/${invoice.bookingId}`}
                                >
                                  <Eye className="size-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="mb-3 size-10 text-green-500" />
              <p className="font-medium">All caught up</p>
              <p className="text-muted-foreground mt-1 text-sm">
                No outstanding invoices
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Details Modal */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => setSelectedTransaction(null)}
      >
        <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction &&
            (() => {
              const client = clients.find(
                (c) => c.id === selectedTransaction.clientId,
              );
              return (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                          Payment Information
                        </CardTitle>
                        <StatusBadge
                          type="status"
                          value={selectedTransaction.status}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Payment ID
                          </p>
                          <p className="font-medium">
                            {selectedTransaction.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Date</p>
                          <p className="font-medium">
                            {formatDateTime(selectedTransaction.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Processed By
                          </p>
                          <p className="font-medium">
                            {selectedTransaction.processedBy}
                          </p>
                        </div>
                        {selectedTransaction.bookingId && (
                          <div>
                            <p className="text-muted-foreground text-sm">
                              Booking
                            </p>
                            <Link
                              href={`/facility/dashboard/bookings/${selectedTransaction.bookingId}`}
                              className="font-medium text-primary hover:underline"
                              onClick={() => setSelectedTransaction(null)}
                            >
                              #{selectedTransaction.bookingId}
                            </Link>
                          </div>
                        )}
                        {selectedTransaction.invoiceId && (
                          <div>
                            <p className="text-muted-foreground text-sm">
                              Invoice
                            </p>
                            <p className="font-medium">
                              {selectedTransaction.invoiceId}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">
                        Amount Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Subtotal:</span>
                        <span className="price-value">
                          ${selectedTransaction.amount.toFixed(2)}
                        </span>
                      </div>
                      {selectedTransaction.tipAmount &&
                        selectedTransaction.tipAmount > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">
                              Tip:
                            </span>
                            <span className="price-value">
                              +${selectedTransaction.tipAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      {selectedTransaction.creditUsed &&
                        selectedTransaction.creditUsed > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-600">
                              Credit Applied:
                            </span>
                            <span className="price-value text-green-600">
                              -${selectedTransaction.creditUsed.toFixed(2)}
                            </span>
                          </div>
                        )}
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="font-semibold">Total:</span>
                        <span className="price-value text-xl text-green-600">
                          ${selectedTransaction.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        {selectedTransaction.paymentMethod === "card" && (
                          <>
                            <CreditCard className="size-5" />
                            <div>
                              <p className="font-medium">
                                {selectedTransaction.cardBrand?.toUpperCase()}{" "}
                                •••• {selectedTransaction.cardLast4}
                              </p>
                              {selectedTransaction.stripeChargeId && (
                                <p className="text-muted-foreground text-xs">
                                  Stripe: {selectedTransaction.stripeChargeId}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                        {selectedTransaction.paymentMethod === "cash" && (
                          <>
                            <Wallet className="size-5" />
                            <p className="font-medium">Cash Payment</p>
                          </>
                        )}
                        {selectedTransaction.paymentMethod === "gift_card" && (
                          <>
                            <Gift className="size-5" />
                            <p className="font-medium">
                              Gift Card: {selectedTransaction.giftCardId}
                            </p>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">
                        Customer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-muted-foreground text-sm">Name</p>
                        <p className="font-medium">
                          {client?.name || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Email</p>
                        <p className="text-sm">{client?.email || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Description
                        </p>
                        <p className="text-sm">
                          {selectedTransaction.description}
                        </p>
                      </div>
                      {selectedTransaction.notes && (
                        <div>
                          <p className="text-muted-foreground text-sm">Notes</p>
                          <p className="text-sm">{selectedTransaction.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedTransaction.refundAmount && (
                    <Card className="border-destructive">
                      <CardHeader>
                        <CardTitle className="text-destructive text-sm font-semibold">
                          Refund Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Refund Amount:</span>
                          <span className="text-destructive price-value">
                            ${selectedTransaction.refundAmount.toFixed(2)}
                          </span>
                        </div>
                        {selectedTransaction.refundReason && (
                          <div>
                            <p className="text-muted-foreground text-sm">
                              Reason:
                            </p>
                            <p className="text-sm">
                              {selectedTransaction.refundReason}
                            </p>
                          </div>
                        )}
                        {selectedTransaction.refundedAt && (
                          <div className="text-muted-foreground text-xs">
                            Refunded on:{" "}
                            {formatDateTime(selectedTransaction.refundedAt)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    {selectedTransaction.bookingId && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        asChild
                        onClick={() => setSelectedTransaction(null)}
                      >
                        <Link
                          href={`/facility/dashboard/bookings/${selectedTransaction.bookingId}`}
                        >
                          <ExternalLink className="mr-2 size-4" />
                          View Booking
                        </Link>
                      </Button>
                    )}
                    {selectedTransaction.receiptUrl && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          alert(
                            `Receipt for payment ${selectedTransaction.id} downloaded successfully!`,
                          );
                        }}
                      >
                        <Download className="mr-2 size-4" />
                        Download Receipt
                      </Button>
                    )}
                    {selectedTransaction.status === "completed" &&
                      !selectedTransaction.refundAmount && (
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setRefundPayment(selectedTransaction);
                            setShowProcessRefund(true);
                            setSelectedTransaction(null);
                          }}
                        >
                          <RefreshCw className="mr-2 size-4" />
                          Process Refund
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
              <Gift className="size-5" />
              Gift Card Details
            </DialogTitle>
          </DialogHeader>
          {selectedGiftCard && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedGiftCard.code}
                      </CardTitle>
                      <Badge
                        variant={
                          selectedGiftCard.status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className="mt-1"
                      >
                        {selectedGiftCard.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="price-value text-3xl text-green-600">
                        ${selectedGiftCard.currentBalance.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Current Balance
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Initial Amount
                      </p>
                      <p className="price-value">
                        ${selectedGiftCard.initialAmount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Type</p>
                      <Badge variant="outline" className="capitalize">
                        {selectedGiftCard.type}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Purchase Date
                      </p>
                      <p className="font-medium">
                        {formatDate(selectedGiftCard.purchaseDate)}
                      </p>
                    </div>
                    {selectedGiftCard.expiryDate && (
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Expiry Date
                        </p>
                        <p className="font-medium">
                          {formatDate(selectedGiftCard.expiryDate)}
                        </p>
                      </div>
                    )}
                  </div>

                  {(selectedGiftCard.purchasedBy ||
                    selectedGiftCard.recipientName) && (
                    <div className="border-t pt-4">
                      {selectedGiftCard.purchasedBy && (
                        <div className="mb-3">
                          <p className="text-muted-foreground text-sm">
                            Purchased By
                          </p>
                          <p className="font-medium">
                            {selectedGiftCard.purchasedBy}
                          </p>
                        </div>
                      )}
                      {selectedGiftCard.recipientName && (
                        <div className="mb-3">
                          <p className="text-muted-foreground text-sm">
                            Recipient
                          </p>
                          <p className="font-medium">
                            {selectedGiftCard.recipientName}
                          </p>
                          {selectedGiftCard.recipientEmail && (
                            <p className="text-muted-foreground text-sm">
                              {selectedGiftCard.recipientEmail}
                            </p>
                          )}
                        </div>
                      )}
                      {selectedGiftCard.message && (
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Message
                          </p>
                          <p className="text-sm italic">
                            &quot;{selectedGiftCard.message}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedGiftCard.transactionHistory.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="mb-3 font-semibold">
                        Transaction History
                      </h4>
                      <div className="space-y-2">
                        {selectedGiftCard.transactionHistory.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-muted/50 flex items-center justify-between rounded-sm p-2"
                          >
                            <div>
                              <Badge
                                variant={
                                  tx.type === "redemption"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {tx.type}
                              </Badge>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {formatDateTime(tx.timestamp)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`price-value ${
                                  tx.type === "redemption"
                                    ? `text-red-600`
                                    : `text-green-600`
                                } `}
                              >
                                {tx.type === "redemption" ? "-" : "+"}$
                                {tx.amount.toFixed(2)}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Balance:{" "}
                                <span className="price-value">
                                  ${tx.balanceAfter.toFixed(2)}
                                </span>
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
          alert(
            `Payment of $${payment.totalAmount.toFixed(2)} processed successfully!`,
          );
        }}
      />

      <ProcessRefundModal
        open={showProcessRefund}
        onOpenChange={setShowProcessRefund}
        payment={refundPayment}
        onSuccess={(refund) => {
          console.log("Refund processed:", refund);
          alert(
            `Refund of $${refund.amount.toFixed(2)} processed successfully!`,
          );
          setRefundPayment(null);
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
