"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Receipt, Send, Printer, Plus, CreditCard } from "lucide-react";
import type { Invoice } from "@/types/booking";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "outline" | "secondary" | "default" }
> = {
  estimate: { label: "Estimate", variant: "outline" },
  open: { label: "Open", variant: "secondary" },
  closed: { label: "Closed", variant: "default" },
};

function fmt(n: number): string {
  return n.toFixed(2);
}

export function InvoicePanel({ invoice }: { invoice: Invoice }) {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.estimate;

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Invoice
            </span>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-muted-foreground text-xs">{invoice.id}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        {invoice.items.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              Items
            </p>
            <div className="space-y-1.5">
              {invoice.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p>{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      ${fmt(item.unitPrice)} x {item.quantity}
                    </p>
                  </div>
                  <span className="font-[tabular-nums]">
                    ${fmt(item.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fees */}
        {invoice.fees.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              Fees
            </p>
            <div className="space-y-1.5">
              {invoice.fees.map((fee, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{fee.name}</span>
                  <span className="font-[tabular-nums]">${fmt(fee.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Summary */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-[tabular-nums]">
              ${fmt(invoice.subtotal)}
            </span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Discount
                {invoice.discountLabel ? ` (${invoice.discountLabel})` : ""}
              </span>
              <span className="font-[tabular-nums] text-green-600">
                -${fmt(invoice.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tax ({invoice.taxRate}%)
            </span>
            <span className="font-[tabular-nums]">
              ${fmt(invoice.taxAmount)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span className="font-[tabular-nums]">${fmt(invoice.total)}</span>
          </div>
          {invoice.depositCollected > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposit collected</span>
              <span className="font-[tabular-nums]">
                -${fmt(invoice.depositCollected)}
              </span>
            </div>
          )}
          {invoice.remainingDue > 0 && (
            <div className="flex justify-between font-medium">
              <span>Remaining due</span>
              <span className="font-[tabular-nums] text-red-600">
                ${fmt(invoice.remainingDue)}
              </span>
            </div>
          )}
        </div>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                Payments
              </p>
              <div className="space-y-1.5">
                {invoice.payments.map((p, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground flex justify-between text-xs"
                  >
                    <span>
                      {p.date} · {p.method}
                    </span>
                    <span className="font-[tabular-nums]">
                      ${fmt(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          {invoice.status === "estimate" && (
            <>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Send className="size-3.5" />
                Email Estimate
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Printer className="size-3.5" />
                Print
              </Button>
            </>
          )}
          {invoice.status === "open" && (
            <>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Plus className="size-3.5" />
                Add Item
              </Button>
              <Button size="sm" className="w-full gap-2">
                <CreditCard className="size-3.5" />
                Start Checkout
              </Button>
            </>
          )}
          {invoice.status === "closed" && (
            <>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Send className="size-3.5" />
                Send Receipt
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Printer className="size-3.5" />
                Print
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
