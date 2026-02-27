"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { invoices, payments, paymentMethods } from "@/data/payments";
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
import { toast } from "sonner";

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
    const invoice = customerInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const relatedPayments = payments.filter((p) => invoice.paymentIds?.includes(p.id));

    const title = invoice.invoiceNumber || invoice.id;

    // Build a printable HTML document with a clean invoice layout.
    // The browser's Print dialog lets the user "Save as PDF", which
    // effectively gives them a nicely formatted PDF.
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;

    const paymentRows = relatedPayments
      .map((payment) => {
        const methodLabel =
          payment.paymentMethod === "card"
            ? `${payment.cardBrand?.toUpperCase() || "CARD"} •••• ${payment.cardLast4}`
            : payment.paymentMethod.charAt(0).toUpperCase() +
              payment.paymentMethod.slice(1);
        return `
          <tr>
            <td>${formatDate(payment.createdAt)}</td>
            <td>${methodLabel}</td>
            <td class="text-right">${formatCurrency(payment.totalAmount)}</td>
          </tr>
        `;
      })
      .join("");

    const itemRows = invoice.items
      .map(
        (item) => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.unitPrice)}</td>
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
      `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f4f4f5;
            color: #0f172a;
          }
          .invoice-wrapper {
            max-width: 800px;
            margin: 24px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
            padding: 32px 40px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
          }
          .brand {
            font-weight: 700;
            font-size: 22px;
            color: #111827;
          }
          .brand span {
            color: #4f46e5;
          }
          .meta {
            text-align: right;
            font-size: 13px;
            color: #6b7280;
          }
          h1 {
            font-size: 28px;
            margin: 0 0 4px 0;
          }
          h2 {
            font-size: 18px;
            margin: 24px 0 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            padding: 8px 0;
            font-size: 13px;
          }
          th {
            text-align: left;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
          }
          .text-right { text-align: right; }
          .totals {
            margin-top: 16px;
            width: 260px;
            margin-left: auto;
            font-size: 13px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .totals-row.total {
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            margin-top: 4px;
            font-weight: 600;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 500;
          }
          .badge-paid { background: #dcfce7; color: #166534; }
          .badge-pending { background: #e5e7eb; color: #374151; }
          .badge-overdue { background: #fee2e2; color: #b91c1c; }
          .footer {
            margin-top: 32px;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body { background: #ffffff; }
            .invoice-wrapper {
              box-shadow: none;
              margin: 0;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="header">
            <div>
              <div class="brand">Yipyy<span> Pets</span></div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                Billing & Payments
              </div>
            </div>
            <div class="meta">
              <h1>${title}</h1>
              <div>Issued: ${formatDate(invoice.issuedDate)}</div>
              ${
                invoice.dueDate
                  ? `<div>Due: ${formatDate(invoice.dueDate)}</div>`
                  : ""
              }
              <div style="margin-top: 4px;">
                Status:
                <span class="badge ${
                  invoice.status === "paid"
                    ? "badge-paid"
                    : invoice.status === "overdue"
                      ? "badge-overdue"
                      : "badge-pending"
                }">
                  ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <h2>Invoice Items</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>${formatCurrency(invoice.subtotal)}</span>
            </div>
            ${
              invoice.tax > 0
                ? `<div class="totals-row">
                    <span>Tax (${invoice.taxRate}%)</span>
                    <span>${formatCurrency(invoice.tax)}</span>
                  </div>`
                : ""
            }
            ${
              invoice.discount > 0
                ? `<div class="totals-row">
                    <span>Discount</span>
                    <span>-${formatCurrency(invoice.discount)}</span>
                  </div>`
                : ""
            }
            <div class="totals-row total">
              <span>Total</span>
              <span>${formatCurrency(invoice.total)}</span>
            </div>
            <div class="totals-row">
              <span>Amount Paid</span>
              <span>${formatCurrency(invoice.amountPaid)}</span>
            </div>
            <div class="totals-row">
              <span>Amount Due</span>
              <span>${formatCurrency(invoice.amountDue)}</span>
            </div>
          </div>

          ${
            relatedPayments.length > 0
              ? `
          <h2>Payment History</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
          </table>
          `
              : ""
          }

          <div class="footer">
            Thank you for trusting us with your pet's care. This receipt was generated by Yipyy.
          </div>
        </div>
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handlePayNow = (invoiceId: string) => {
    const invoice = customerInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice || invoice.amountDue <= 0) return;

    const defaultCard = paymentMethods.find(
      (pm) => pm.clientId === MOCK_CUSTOMER_ID && pm.isDefault,
    );

    if (!defaultCard) {
      toast.error("No card on file. Please add a payment method first.");
      return;
    }

    // In production this would call Fiserv with the default card token and
    // record a payment + receipt (including Clover terminal receipts when used).
    toast.success(
      `Paying ${formatCurrency(
        invoice.amountDue,
      )} with card on file (•••• ${defaultCard.cardLast4}) — mock flow`,
    );
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
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Amount Due:</span>{" "}
                              <span className="font-semibold">
                                {formatCurrency(invoice.amountDue)}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handlePayNow(invoice.id)}
                              className="whitespace-nowrap"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay Now
                            </Button>
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
