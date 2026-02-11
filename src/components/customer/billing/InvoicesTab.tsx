"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { invoices, payments } from "@/data/payments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Search, Calendar, DollarSign } from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export function InvoicesTab() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const customerInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => inv.clientId === MOCK_CUSTOMER_ID);

    if (selectedFacility) {
      filtered = filtered.filter((inv) => inv.facilityId === selectedFacility.id);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((inv) => {
        if (statusFilter === "paid") return inv.status === "paid";
        if (statusFilter === "pending") return inv.status === "sent";
        if (statusFilter === "overdue") return inv.status === "overdue";
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.items.some((item) => item.description.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      return new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime();
    });
  }, [selectedFacility, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-green-500">Paid</Badge>;
      case "sent":
        return <Badge variant="secondary">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownloadReceipt = (invoiceId: string) => {
    // TODO: Implement receipt download
    const payment = payments.find((p) => p.invoiceId === invoiceId);
    if (payment?.receiptUrl) {
      window.open(payment.receiptUrl, "_blank");
    } else {
      // Generate or download invoice PDF
      console.log("Downloading invoice:", invoiceId);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Invoices & Receipts</h2>
          <p className="text-muted-foreground">
            View and download your invoices and payment receipts
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "paid" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("paid")}
          >
            Paid
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "overdue" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("overdue")}
          >
            Overdue
          </Button>
        </div>
      </div>

      {customerInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-semibold">No invoices found</p>
            <p className="text-sm text-muted-foreground">
              Your invoices and receipts will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {customerInvoices.map((invoice) => {
            const relatedPayments = payments.filter((p) =>
              invoice.paymentIds?.includes(p.id)
            );

            return (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {invoice.invoiceNumber}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Issued: {formatDate(invoice.issuedDate)}
                        </span>
                        {invoice.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {formatDate(invoice.dueDate)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invoice.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(invoice.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Items</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        {invoice.tax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span>
                            <span>{formatCurrency(invoice.tax)}</span>
                          </div>
                        )}
                        {invoice.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(invoice.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold pt-2 border-t">
                          <span>Total:</span>
                          <span>{formatCurrency(invoice.total)}</span>
                        </div>
                        {invoice.amountPaid > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount Paid:</span>
                            <span className="text-green-600">
                              {formatCurrency(invoice.amountPaid)}
                            </span>
                          </div>
                        )}
                        {invoice.amountDue > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount Due:</span>
                            <span className="font-semibold">
                              {formatCurrency(invoice.amountDue)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {relatedPayments.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Payment Details</h4>
                        <div className="space-y-1 text-sm">
                          {relatedPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between text-muted-foreground"
                            >
                              <span>
                                {payment.paymentMethod === "card"
                                  ? `${payment.cardBrand?.toUpperCase()} •••• ${payment.cardLast4}`
                                  : payment.paymentMethod.charAt(0).toUpperCase() +
                                    payment.paymentMethod.slice(1)}
                                {payment.tipAmount && ` + ${formatCurrency(payment.tipAmount)} tip`}
                              </span>
                              <span>{formatCurrency(payment.totalAmount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
