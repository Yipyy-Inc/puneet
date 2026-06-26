"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Ban,
  Clock,
  Download,
  Send,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  InvoicePayment,
  PlatformInvoice,
} from "@/types/platform-invoices";
import {
  STATUS_BADGE,
  formatDate,
  formatMoney,
  hoursUntil,
} from "./invoice-utils";
import { RecordPaymentDialog } from "./record-payment-dialog";

interface InvoiceDetailDrawerProps {
  invoice: PlatformInvoice;
  onClose: () => void;
  onDownloadPdf: (invoice: PlatformInvoice) => void;
  onSendEmail: (invoice: PlatformInvoice) => void;
  onVoid: (invoice: PlatformInvoice) => void;
  onPay: (
    invoice: PlatformInvoice,
    payment: Omit<InvoicePayment, "id">,
  ) => void;
}

export function InvoiceDetailDrawer({
  invoice,
  onClose,
  onDownloadPdf,
  onSendEmail,
  onVoid,
  onPay,
}: InvoiceDetailDrawerProps) {
  const [payOpen, setPayOpen] = useState(false);
  const isUnpaid =
    invoice.status === "Sent" ||
    invoice.status === "Overdue" ||
    invoice.status === "Draft";
  const canVoid = isUnpaid;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{invoice.number}</SheetTitle>
            <Badge
              variant="outline"
              className={cn(STATUS_BADGE[invoice.status])}
            >
              {invoice.status}
            </Badge>
          </div>
          <SheetDescription>
            {invoice.facilityName} · {invoice.planName} · {invoice.periodLabel}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {invoice.status === "Draft" && invoice.autoSendAt && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-amber-700 dark:text-amber-300">
                Auto-generated draft. Auto-sends to the facility in{" "}
                <span className="font-semibold">
                  ~{hoursUntil(invoice.autoSendAt, new Date())}h
                </span>{" "}
                if not reviewed.
              </p>
            </div>
          )}
          {invoice.status === "Overdue" && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-rose-700 dark:text-rose-300">
                Payment was due {formatDate(invoice.dueDate)} and is still
                outstanding.
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Meta label="Issued" value={formatDate(invoice.issuedDate)} />
            <Meta label="Due" value={formatDate(invoice.dueDate)} />
            <Meta label="Paid" value={formatDate(invoice.paidDate)} />
            <Meta
              label="Billing cycle"
              value={invoice.billingCycle}
              capitalize
            />
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Line items</h3>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>{li.label}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          li.kind === "discount" &&
                            "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {li.amount < 0
                          ? `-${formatMoney(Math.abs(li.amount), invoice.currency)}`
                          : formatMoney(li.amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(invoice.amount, invoice.currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment history */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Payment history</h3>
            {invoice.payments.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                No payments recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{p.method}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(p.date)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(p.amount, invoice.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 border-t p-4">
          <Button variant="outline" onClick={() => onDownloadPdf(invoice)}>
            <Download className="mr-2 size-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            disabled={invoice.status === "Void"}
            onClick={() => onSendEmail(invoice)}
          >
            <Send className="mr-2 size-4" />
            {invoice.status === "Draft" ? "Review & Send" : "Send Email"}
          </Button>
          <Button
            variant="outline"
            className="text-rose-600 hover:text-rose-700"
            disabled={!canVoid}
            onClick={() => onVoid(invoice)}
          >
            <Ban className="mr-2 size-4" />
            Void
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!isUnpaid}
            onClick={() => setPayOpen(true)}
          >
            <Wallet className="mr-2 size-4" />
            Record Payment
          </Button>
        </div>

        <RecordPaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          amount={invoice.amount}
          currency={invoice.currency}
          onConfirm={(payment) => onPay(invoice, payment)}
        />
      </SheetContent>
    </Sheet>
  );
}

function Meta({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className={cn("font-medium", capitalize && "capitalize")}>{value}</p>
    </div>
  );
}
