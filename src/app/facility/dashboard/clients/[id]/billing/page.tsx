"use client";

import { use } from "react";
import Link from "next/link";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { payments, invoices, customerCredits, giftCards } from "@/data/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, Gift, Award } from "lucide-react";

export default function ClientBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;

  const clientPayments = payments.filter((p) => p.clientId === clientId);
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  const clientCredits = customerCredits.filter((c) => c.clientId === clientId);
  const clientGiftCards = giftCards.slice(0, 0); // gift cards not client-scoped yet
  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const bookingInvoices = clientBookings.filter((b) => b.invoice);

  const totalPaid = clientPayments.reduce((s, p) => s + p.amount, 0);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Billing & Payments</h2>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Total Paid</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              ${totalPaid.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Invoices</p>
            <p className="mt-1 text-xl font-bold">
              {clientInvoices.length + bookingInvoices.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Credits</p>
            <p className="mt-1 text-xl font-bold">{clientCredits.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-xs">Gift Cards</p>
            <p className="mt-1 text-xl font-bold">{clientGiftCards.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Membership */}
      {client.membership && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Award className="size-4" />
              Membership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {client.membership.plan} Plan
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(client.membership.startDate)} →{" "}
                  {formatDate(client.membership.expiryDate)}
                </p>
              </div>
              <Badge
                variant={
                  client.membership.status === "active"
                    ? "default"
                    : "secondary"
                }
                className="capitalize"
              >
                {client.membership.status}
              </Badge>
            </div>
            {client.membership.benefits.discountPercent && (
              <p className="mt-2 text-xs text-emerald-600">
                {client.membership.benefits.discountPercent}% off all services
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Packages */}
      {client.packages && client.packages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="size-4" />
              Packages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.packages.map((pkg) => (
              <div key={pkg.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{pkg.name}</p>
                  <Badge variant={pkg.remainingCredits > 0 ? "default" : "secondary"}>
                    {pkg.remainingCredits} remaining
                  </Badge>
                </div>
                <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${(pkg.usedCredits / pkg.totalCredits) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {pkg.usedCredits} of {pkg.totalCredits} used ·
                  ${pkg.pricePerCredit}/credit
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Booking Invoices */}
      {bookingInvoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Receipt className="size-4" />
              Booking Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bookingInvoices.map((b) => (
              <Link
                key={b.id}
                href={`/facility/dashboard/clients/${id}/bookings/${b.id}`}
                className="hover:bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium">{b.invoice!.id}</span>
                  <span className="text-muted-foreground ml-2 text-xs capitalize">
                    {b.service} · {formatDate(b.startDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={b.invoice!.status === "closed" ? "outline" : "secondary"}
                    className="text-[10px]"
                  >
                    {b.invoice!.status}
                  </Badge>
                  <span className="text-sm font-medium">
                    ${b.invoice!.total.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4" />
            Recent Payments ({clientPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientPayments.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No payments recorded
            </p>
          ) : (
            <div className="space-y-2">
              {clientPayments.slice(0, 10).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">Payment</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(p.createdAt)} · {String(p.method)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    ${p.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
