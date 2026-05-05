"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CheckSquare,
  CreditCard,
  Smartphone,
  Square,
  Wallet,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Booking } from "@/types/booking";

interface OpenInvoicesSectionProps {
  clientId: number;
  clientName: string;
  bookings: Booking[];
  basePath: string;
}

type Method = "card" | "cash" | "terminal" | "ach";

const METHODS: { value: Method; label: string; Icon: typeof CreditCard }[] = [
  { value: "card", label: "Card on file", Icon: CreditCard },
  { value: "cash", label: "Cash", Icon: Banknote },
  { value: "terminal", label: "Terminal", Icon: Smartphone },
  { value: "ach", label: "Bank/ACH", Icon: Wallet },
];

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OpenInvoicesSection({
  clientName,
  bookings,
  basePath,
}: OpenInvoicesSectionProps) {
  const openInvoices = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.invoice &&
            b.invoice.status !== "closed" &&
            (b.invoice.remainingDue ?? 0) > 0,
        )
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
    [bookings],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<Method>("card");
  const [sendReceipt, setSendReceipt] = useState(true);

  if (openInvoices.length === 0) return null;

  const allSelected = selected.size === openInvoices.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(openInvoices.map((b) => b.id)));
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedBookings = openInvoices.filter((b) => selected.has(b.id));
  const selectedTotal = selectedBookings.reduce(
    (sum, b) => sum + (b.invoice?.remainingDue ?? 0),
    0,
  );

  const handlePay = () => {
    const count = selectedBookings.length;
    const ids = selectedBookings.map((b) => b.invoice!.id).join(", ");
    toast.success(
      `Bulk payment of $${selectedTotal.toFixed(2)} processed via ${method}`,
      {
        description: `${count} invoice${count > 1 ? "s" : ""} closed: ${ids}${sendReceipt ? " · Combined receipt sent" : ""}`,
      },
    );
    setSelected(new Set());
    setPayOpen(false);
  };

  return (
    <>
      <Card className="border-amber-200/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Receipt className="size-4 text-amber-600" />
              Open Invoices
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
              >
                {openInvoices.length} unpaid
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium"
              >
                {allSelected ? (
                  <CheckSquare className="size-3.5" />
                ) : (
                  <Square className="size-3.5" />
                )}
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {openInvoices.map((b) => {
            const inv = b.invoice!;
            const isSelected = selected.has(b.id);
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                  isSelected
                    ? "border-amber-400 bg-amber-50/60"
                    : "hover:bg-muted/40",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(b.id)}
                  aria-label={`Select invoice ${inv.id}`}
                />
                <Link
                  href={`${basePath}/bookings/${b.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{inv.id}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        inv.status === "open"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700",
                      )}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    <span className="capitalize">{b.service}</span> ·{" "}
                    {formatDate(b.startDate)}
                    {(inv.depositCollected ?? 0) > 0 && (
                      <span className="ml-1.5">
                        · ${inv.depositCollected.toFixed(2)} already paid
                      </span>
                    )}
                  </p>
                </Link>
                <div className="text-right">
                  <p className="text-sm font-semibold font-[tabular-nums]">
                    ${inv.remainingDue.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-[10px]">due</p>
                </div>
              </div>
            );
          })}
        </CardContent>
        {selected.size > 0 && (
          <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t bg-amber-50/40 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-amber-900">
                {selected.size} invoice{selected.size > 1 ? "s" : ""} selected
                {someSelected && ` of ${openInvoices.length}`}
              </p>
              <p className="text-[11px] text-amber-800/70">
                Total to collect:{" "}
                <span className="font-semibold font-[tabular-nums]">
                  ${selectedTotal.toFixed(2)}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-amber-600 text-xs hover:bg-amber-700"
              onClick={() => setPayOpen(true)}
            >
              <CreditCard className="size-3.5" />
              Pay Selected (${selectedTotal.toFixed(2)})
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Payment</DialogTitle>
            <DialogDescription>
              Settle {selectedBookings.length} open invoice
              {selectedBookings.length > 1 ? "s" : ""} for {clientName} in one
              transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
              <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Including
              </p>
              <div className="space-y-1">
                {selectedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>
                      <span className="font-medium">#{b.invoice!.id}</span>
                      <span className="text-muted-foreground ml-1.5 capitalize">
                        · {b.service} {formatDate(b.startDate)}
                      </span>
                    </span>
                    <span className="font-[tabular-nums]">
                      ${b.invoice!.remainingDue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="font-[tabular-nums]">
                  ${selectedTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Payment method
              </p>
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all",
                      method === value
                        ? "border-primary ring-1 ring-primary text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={sendReceipt}
                onCheckedChange={(v) => setSendReceipt(v === true)}
              />
              <div className="flex-1">
                <p className="text-xs font-medium">Email combined receipt</p>
                <p className="text-muted-foreground text-[10px]">
                  One receipt listing all {selectedBookings.length} invoices
                </p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={selectedTotal <= 0}>
              Charge ${selectedTotal.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
