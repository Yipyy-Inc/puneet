"use client";

import { Download } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import type {
  InvoiceStatus,
  SubscriptionInvoice,
} from "@/types/facility-billing";

const STATUS_TONE: Record<InvoiceStatus, string> = {
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  Overdue:
    "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
  Draft:
    "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300",
  Void: "border-slate-200 bg-slate-50 text-slate-500 line-through dark:bg-slate-900/40",
};

export interface AllInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: SubscriptionInvoice[];
  facilityName: string;
}

export function AllInvoicesDialog({
  open,
  onOpenChange,
  invoices,
  facilityName,
}: AllInvoicesDialogProps) {
  function handleDownload(inv: SubscriptionInvoice) {
    downloadInvoicePdf(`${inv.number}.pdf`, `Invoice ${inv.number}`, [
      `Facility: ${facilityName}`,
      `Billing period: ${inv.periodLabel}`,
      `Issued: ${inv.issuedDate}`,
      inv.paidDate ? `Paid: ${inv.paidDate}` : `Status: ${inv.status}`,
      "",
      `Amount: ${inv.currency} $${inv.amount.toLocaleString()}`,
      `Status: ${inv.status}`,
      "",
      "Yipyy - subscription invoice",
    ]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>All invoices</DialogTitle>
          <DialogDescription>
            Your subscription invoice history. Download any invoice as a PDF.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs">
              <tr>
                <th className="py-2 font-medium">Invoice</th>
                <th className="font-medium">Period</th>
                <th className="font-medium">Amount</th>
                <th className="font-medium">Status</th>
                <th className="sr-only">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="py-2.5 font-medium">{inv.number}</td>
                  <td className="text-muted-foreground">{inv.periodLabel}</td>
                  <td className="tabular-nums">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td>
                    <Badge
                      variant="outline"
                      className={cn("font-medium", STATUS_TONE[inv.status])}
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Download ${inv.number} as PDF`}
                      onClick={() => handleDownload(inv)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
