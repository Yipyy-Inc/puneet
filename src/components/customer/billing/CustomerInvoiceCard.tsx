"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CreditCard,
  Download,
  Eye,
  FileText,
  Receipt,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PayNowModal } from "@/components/customer/billing/PayNowModal";
import {
  buildInvoiceDocumentHtml,
  type InvoiceDocumentData,
} from "@/lib/invoice-document";
import { loadInvoiceTemplate } from "@/data/invoice-template";
import type { Booking, Invoice } from "@/types/booking";
import type { Client } from "@/types/client";
import type { PaymentMethod } from "@/types/payments";

interface CustomerInvoiceCardProps {
  booking: Booking;
  invoice: Invoice;
  client: Client;
  savedCards: PaymentMethod[];
  petName: string;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildInvoiceDocumentData(
  booking: Booking,
  invoice: Invoice,
  client: Client,
  petName: string,
): InvoiceDocumentData {
  const dateRange =
    booking.startDate && booking.endDate && booking.startDate !== booking.endDate
      ? `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`
      : booking.startDate
        ? formatDate(booking.startDate)
        : undefined;

  return {
    invoiceNumber: invoice.id,
    invoiceStatus: invoice.status,
    issuedDate: formatDate(booking.startDate),
    bookingDateRange: dateRange,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    petName,
    serviceLabel: booking.service,
    items: invoice.items,
    fees: invoice.fees,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    discountLabel: invoice.discountLabel,
    taxes: invoice.taxes,
    taxAmount: invoice.taxAmount,
    taxRate: invoice.taxRate,
    tipTotal: invoice.tipTotal,
    total: invoice.total,
    depositCollected: invoice.depositCollected,
    remainingDue: invoice.remainingDue,
    payments: invoice.payments,
    variant: invoice.status === "closed" ? "receipt" : "invoice",
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  estimate: {
    label: "Estimate",
    classes: "border-zinc-300 bg-zinc-100 text-zinc-700",
  },
  open: {
    label: "Open",
    classes: "border-amber-300 bg-amber-100 text-amber-800",
  },
  closed: {
    label: "Paid",
    classes: "border-emerald-300 bg-emerald-100 text-emerald-800",
  },
};

export function CustomerInvoiceCard({
  booking,
  invoice,
  client,
  savedCards,
  petName,
}: CustomerInvoiceCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [payNowOpen, setPayNowOpen] = useState(false);

  const docData = useMemo(
    () => buildInvoiceDocumentData(booking, invoice, client, petName),
    [booking, invoice, client, petName],
  );

  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.estimate;
  const hasBalance = invoice.remainingDue > 0 && invoice.status !== "closed";

  const previewHtml = useMemo(() => {
    if (!previewOpen) return "";
    return buildInvoiceDocumentHtml(loadInvoiceTemplate(), docData);
  }, [previewOpen, docData]);

  const handleDownload = () => {
    const html = buildInvoiceDocumentHtml(loadInvoiceTemplate(), docData);
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" />
                Invoice {invoice.id}
              </CardTitle>
              <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(booking.startDate)}
                </span>
                <span className="capitalize">{booking.service}</span>
                <span>· {petName}</span>
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                statusCfg.classes,
              )}
            >
              {statusCfg.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Line items */}
          <div>
            <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
              Services
            </p>
            <div className="space-y-1">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <p>{item.name}</p>
                    <p className="text-muted-foreground text-[11px]">
                      ${fmt(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-[tabular-nums]">${fmt(item.price)}</span>
                </div>
              ))}
              {invoice.fees.map((fee, i) => (
                <div
                  key={`fee-${i}`}
                  className="text-muted-foreground flex justify-between text-sm"
                >
                  <span>{fee.name}</span>
                  <span className="font-[tabular-nums]">${fmt(fee.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-[tabular-nums]">
                ${fmt(invoice.subtotal)}
              </span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Discount
                  {invoice.discountLabel ? ` (${invoice.discountLabel})` : ""}
                </span>
                <span className="font-[tabular-nums]">
                  -${fmt(invoice.discount)}
                </span>
              </div>
            )}
            {(invoice.taxes && invoice.taxes.length > 0
              ? invoice.taxes
              : []
            ).map((tax, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">
                  {tax.name} ({(tax.rate * 100).toFixed(tax.rate < 0.1 ? 1 : 3)}%)
                </span>
                <span className="font-[tabular-nums]">${fmt(tax.amount)}</span>
              </div>
            ))}
            {(!invoice.taxes || invoice.taxes.length === 0) &&
              invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-[tabular-nums]">
                    ${fmt(invoice.taxAmount)}
                  </span>
                </div>
              )}
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <span>Total</span>
              <span className="font-[tabular-nums]">${fmt(invoice.total)}</span>
            </div>
            {invoice.depositCollected > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Deposit collected</span>
                <span className="font-[tabular-nums]">
                  -${fmt(invoice.depositCollected)}
                </span>
              </div>
            )}
            {hasBalance && (
              <div className="text-destructive flex justify-between font-medium">
                <span>Amount due</span>
                <span className="font-[tabular-nums]">
                  ${fmt(invoice.remainingDue)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="gap-1.5"
            >
              <Eye className="size-3.5" />
              View full invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Download PDF
            </Button>
            {hasBalance && (
              <Button
                size="sm"
                className="ml-auto gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setPayNowOpen(true)}
              >
                <CreditCard className="size-3.5" />
                Pay ${fmt(invoice.remainingDue)} now
              </Button>
            )}
            {invoice.status === "closed" && (
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-[11px]">
                <FileText className="size-3" />
                Paid in full
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Invoice {invoice.id}</DialogTitle>
          </DialogHeader>
          <div className="bg-zinc-100 p-3 rounded-md">
            <iframe
              title="Invoice preview"
              srcDoc={previewHtml}
              className="h-[70vh] w-full rounded-md border bg-white shadow-sm"
              sandbox="allow-same-origin"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownload} className="gap-1.5">
              <Download className="size-3.5" />
              Download PDF
            </Button>
            {hasBalance && (
              <Button
                onClick={() => {
                  setPreviewOpen(false);
                  setPayNowOpen(true);
                }}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <CreditCard className="size-3.5" />
                Pay ${fmt(invoice.remainingDue)} now
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PayNowModal
        open={payNowOpen}
        onOpenChange={setPayNowOpen}
        invoiceNumber={invoice.id}
        amountDue={invoice.remainingDue}
        savedCards={savedCards}
      />
    </>
  );
}
