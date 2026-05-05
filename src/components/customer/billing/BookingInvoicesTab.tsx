"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";
import { bookings as allBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { paymentMethods } from "@/data/payments";
import { CustomerInvoiceCard } from "@/components/customer/billing/CustomerInvoiceCard";

type Filter = "all" | "paid" | "pending" | "overdue";

const MOCK_CUSTOMER_ID = 15;

export function BookingInvoicesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const client = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID) ?? null,
    [],
  );

  const savedCards = useMemo(
    () => paymentMethods.filter((pm) => pm.clientId === MOCK_CUSTOMER_ID),
    [],
  );

  const invoiceRows = useMemo(() => {
    if (!client) return [];
    const today = new Date();
    return allBookings
      .filter((b) => b.clientId === MOCK_CUSTOMER_ID && b.invoice)
      .filter((b) => {
        const inv = b.invoice!;
        if (filter === "paid") return inv.status === "closed";
        if (filter === "pending")
          return inv.status === "open" || inv.status === "estimate";
        if (filter === "overdue") {
          if (inv.status === "closed") return false;
          if (inv.remainingDue <= 0) return false;
          return new Date(b.endDate) < today;
        }
        return true;
      })
      .filter((b) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const inv = b.invoice!;
        return (
          inv.id.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q) ||
          inv.items.some((i) => i.name.toLowerCase().includes(q))
        );
      })
      .map((b) => {
        const pet = client.pets.find((p) =>
          Array.isArray(b.petId) ? b.petId.includes(p.id) : b.petId === p.id,
        );
        return {
          booking: b,
          invoice: b.invoice!,
          petName: pet?.name ?? "Pet",
        };
      })
      .sort(
        (a, b) =>
          new Date(b.booking.startDate).getTime() -
          new Date(a.booking.startDate).getTime(),
      );
  }, [client, filter, searchQuery]);

  if (!client) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Sign in to view your invoices.
        </CardContent>
      </Card>
    );
  }

  const totalDue = invoiceRows
    .filter((r) => r.invoice.remainingDue > 0 && r.invoice.status !== "closed")
    .reduce((sum, r) => sum + r.invoice.remainingDue, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Invoices & Receipts</h2>
          <p className="text-muted-foreground">
            Each invoice shows the full breakdown of your booking. Pay
            outstanding balances online with a card on file.
          </p>
        </div>
        {totalDue > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-right">
            <p className="text-amber-900/70 text-[10px] font-semibold tracking-wider uppercase">
              Outstanding
            </p>
            <p className="text-amber-900 text-lg font-bold font-[tabular-nums]">
              ${totalDue.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by invoice number or service..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "paid", "overdue"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {invoiceRows.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <FileText className="text-muted-foreground mx-auto size-12 opacity-50" />
            <p className="font-semibold">No invoices yet</p>
            <p className="text-muted-foreground text-sm">
              Once you book a service, your invoice will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoiceRows.map(({ booking, invoice, petName }) => (
            <CustomerInvoiceCard
              key={booking.id}
              booking={booking}
              invoice={invoice}
              client={client}
              savedCards={savedCards}
              petName={petName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
